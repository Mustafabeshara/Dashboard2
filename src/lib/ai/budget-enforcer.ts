/**
 * AI Cost Budget Enforcement
 * Prevents runaway AI costs with configurable limits
 * Calculates cost from token usage since AIUsageLog stores tokens, not cost
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { PROVIDER_COSTS } from './config';

// Budget configuration
export interface BudgetConfig {
  monthlyBudgetUSD: number;
  dailyBudgetUSD: number;
  perRequestMaxUSD: number;
  warningThresholdPercent: number;
  userDailyLimitUSD: number;
}

// Default budget limits
const DEFAULT_BUDGET: BudgetConfig = {
  monthlyBudgetUSD: parseFloat(process.env.AI_MONTHLY_BUDGET_USD || '100'),
  dailyBudgetUSD: parseFloat(process.env.AI_DAILY_BUDGET_USD || '10'),
  perRequestMaxUSD: parseFloat(process.env.AI_PER_REQUEST_MAX_USD || '0.50'),
  warningThresholdPercent: 80,
  userDailyLimitUSD: parseFloat(process.env.AI_USER_DAILY_LIMIT_USD || '5'),
};

export interface BudgetStatus {
  withinBudget: boolean;
  currentSpend: number;
  remainingBudget: number;
  budgetLimit: number;
  percentUsed: number;
  warning: boolean;
  message: string;
}

export interface SpendingStats {
  today: number;
  thisMonth: number;
  lastMonth: number;
  byProvider: Record<string, number>;
  byUser: Record<string, number>;
}

/**
 * Calculate cost from token counts
 */
function calculateCostFromTokens(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = PROVIDER_COSTS[provider.toLowerCase()];
  if (!costs) return 0;

  return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion;
}

/**
 * Get current spending for a time period by calculating from token usage
 */
async function getSpending(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<number> {
  try {
    const where: Record<string, unknown> = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    // Get all usage logs and calculate cost from tokens
    const logs = await prisma.aIUsageLog.findMany({
      where,
      select: {
        provider: true,
        promptTokens: true,
        completionTokens: true,
      },
    });

    // Calculate total cost from tokens
    return logs.reduce((total, log) => {
      return total + calculateCostFromTokens(log.provider, log.promptTokens, log.completionTokens);
    }, 0);
  } catch (error) {
    // If table doesn't exist yet, return 0
    logger.warn('Could not get AI spending', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Calculate estimated cost for a request
 */
export function estimateCost(
  provider: string,
  promptTokens: number,
  completionTokens: number
): number {
  return calculateCostFromTokens(provider, promptTokens, completionTokens);
}

/**
 * Check if within daily budget
 */
export async function checkDailyBudget(
  estimatedCost: number = 0,
  config: BudgetConfig = DEFAULT_BUDGET
): Promise<BudgetStatus> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentSpend = await getSpending(today, tomorrow);
  const projectedSpend = currentSpend + estimatedCost;
  const remainingBudget = Math.max(0, config.dailyBudgetUSD - projectedSpend);
  const percentUsed = (projectedSpend / config.dailyBudgetUSD) * 100;

  return {
    withinBudget: projectedSpend <= config.dailyBudgetUSD,
    currentSpend,
    remainingBudget,
    budgetLimit: config.dailyBudgetUSD,
    percentUsed,
    warning: percentUsed >= config.warningThresholdPercent,
    message:
      projectedSpend > config.dailyBudgetUSD
        ? `Daily AI budget exceeded ($${currentSpend.toFixed(2)}/$${config.dailyBudgetUSD})`
        : percentUsed >= config.warningThresholdPercent
          ? `Daily AI budget ${percentUsed.toFixed(0)}% used ($${currentSpend.toFixed(2)}/$${config.dailyBudgetUSD})`
          : 'Within daily budget',
  };
}

/**
 * Check if within monthly budget
 */
export async function checkMonthlyBudget(
  estimatedCost: number = 0,
  config: BudgetConfig = DEFAULT_BUDGET
): Promise<BudgetStatus> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const currentSpend = await getSpending(monthStart, monthEnd);
  const projectedSpend = currentSpend + estimatedCost;
  const remainingBudget = Math.max(0, config.monthlyBudgetUSD - projectedSpend);
  const percentUsed = (projectedSpend / config.monthlyBudgetUSD) * 100;

  return {
    withinBudget: projectedSpend <= config.monthlyBudgetUSD,
    currentSpend,
    remainingBudget,
    budgetLimit: config.monthlyBudgetUSD,
    percentUsed,
    warning: percentUsed >= config.warningThresholdPercent,
    message:
      projectedSpend > config.monthlyBudgetUSD
        ? `Monthly AI budget exceeded ($${currentSpend.toFixed(2)}/$${config.monthlyBudgetUSD})`
        : percentUsed >= config.warningThresholdPercent
          ? `Monthly AI budget ${percentUsed.toFixed(0)}% used ($${currentSpend.toFixed(2)}/$${config.monthlyBudgetUSD})`
          : 'Within monthly budget',
  };
}

/**
 * Check if user is within their daily limit
 */
export async function checkUserBudget(
  userId: string,
  estimatedCost: number = 0,
  config: BudgetConfig = DEFAULT_BUDGET
): Promise<BudgetStatus> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentSpend = await getSpending(today, tomorrow, userId);
  const projectedSpend = currentSpend + estimatedCost;
  const remainingBudget = Math.max(0, config.userDailyLimitUSD - projectedSpend);
  const percentUsed = (projectedSpend / config.userDailyLimitUSD) * 100;

  return {
    withinBudget: projectedSpend <= config.userDailyLimitUSD,
    currentSpend,
    remainingBudget,
    budgetLimit: config.userDailyLimitUSD,
    percentUsed,
    warning: percentUsed >= config.warningThresholdPercent,
    message:
      projectedSpend > config.userDailyLimitUSD
        ? `Your daily AI limit exceeded ($${currentSpend.toFixed(2)}/$${config.userDailyLimitUSD})`
        : percentUsed >= config.warningThresholdPercent
          ? `Your daily AI limit ${percentUsed.toFixed(0)}% used`
          : 'Within your daily limit',
  };
}

/**
 * Check if a request is within all budget limits
 */
export async function canMakeRequest(
  estimatedCost: number,
  userId?: string,
  config: BudgetConfig = DEFAULT_BUDGET
): Promise<{
  allowed: boolean;
  reason?: string;
  budgetStatus: {
    daily: BudgetStatus;
    monthly: BudgetStatus;
    user?: BudgetStatus;
    perRequest: boolean;
  };
}> {
  // Check per-request limit first (no DB call needed)
  if (estimatedCost > config.perRequestMaxUSD) {
    return {
      allowed: false,
      reason: `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${config.perRequestMaxUSD})`,
      budgetStatus: {
        daily: {
          withinBudget: true,
          currentSpend: 0,
          remainingBudget: 0,
          budgetLimit: config.dailyBudgetUSD,
          percentUsed: 0,
          warning: false,
          message: 'Not checked',
        },
        monthly: {
          withinBudget: true,
          currentSpend: 0,
          remainingBudget: 0,
          budgetLimit: config.monthlyBudgetUSD,
          percentUsed: 0,
          warning: false,
          message: 'Not checked',
        },
        perRequest: false,
      },
    };
  }

  // Check daily and monthly budgets in parallel
  const [dailyStatus, monthlyStatus] = await Promise.all([
    checkDailyBudget(estimatedCost, config),
    checkMonthlyBudget(estimatedCost, config),
  ]);

  // Check user budget if userId provided
  let userStatus: BudgetStatus | undefined;
  if (userId) {
    userStatus = await checkUserBudget(userId, estimatedCost, config);
  }

  const budgetStatus = {
    daily: dailyStatus,
    monthly: monthlyStatus,
    user: userStatus,
    perRequest: true,
  };

  // Check if any budget is exceeded
  if (!dailyStatus.withinBudget) {
    return {
      allowed: false,
      reason: dailyStatus.message,
      budgetStatus,
    };
  }

  if (!monthlyStatus.withinBudget) {
    return {
      allowed: false,
      reason: monthlyStatus.message,
      budgetStatus,
    };
  }

  if (userStatus && !userStatus.withinBudget) {
    return {
      allowed: false,
      reason: userStatus.message,
      budgetStatus,
    };
  }

  // Log warnings if approaching limits
  if (dailyStatus.warning || monthlyStatus.warning) {
    logger.warn('AI budget warning', {
      context: {
        daily: dailyStatus.message,
        monthly: monthlyStatus.message,
        user: userStatus?.message,
      },
    });
  }

  return {
    allowed: true,
    budgetStatus,
  };
}

/**
 * Get comprehensive spending statistics
 */
export async function getSpendingStats(): Promise<SpendingStats> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  try {
    // Get spending by calculating from tokens
    const [today, thisMonth, lastMonth] = await Promise.all([
      getSpending(todayStart, todayEnd),
      getSpending(thisMonthStart, thisMonthEnd),
      getSpending(lastMonthStart, lastMonthEnd),
    ]);

    // Get logs grouped by provider to calculate cost
    const providerLogs = await prisma.aIUsageLog.findMany({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
      },
      select: {
        provider: true,
        promptTokens: true,
        completionTokens: true,
      },
    });

    const byProvider: Record<string, number> = {};
    for (const log of providerLogs) {
      const cost = calculateCostFromTokens(log.provider, log.promptTokens, log.completionTokens);
      byProvider[log.provider] = (byProvider[log.provider] || 0) + cost;
    }

    // Get logs grouped by user to calculate cost
    const userLogs = await prisma.aIUsageLog.findMany({
      where: {
        createdAt: {
          gte: thisMonthStart,
          lte: thisMonthEnd,
        },
        userId: { not: null },
      },
      select: {
        userId: true,
        provider: true,
        promptTokens: true,
        completionTokens: true,
      },
    });

    const byUser: Record<string, number> = {};
    for (const log of userLogs) {
      const cost = calculateCostFromTokens(log.provider, log.promptTokens, log.completionTokens);
      const userId = log.userId || 'unknown';
      byUser[userId] = (byUser[userId] || 0) + cost;
    }

    return {
      today,
      thisMonth,
      lastMonth,
      byProvider,
      byUser,
    };
  } catch (error) {
    logger.warn('Could not get spending stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      today: 0,
      thisMonth: 0,
      lastMonth: 0,
      byProvider: {},
      byUser: {},
    };
  }
}

/**
 * Get current budget configuration
 */
export function getBudgetConfig(): BudgetConfig {
  return { ...DEFAULT_BUDGET };
}
