import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { sql, eq } from "drizzle-orm";
import { tenders, invoices, expenses, inventory } from "../../drizzle/schema";
import { TENDER_STATUS, INVOICE_STATUS } from "./shared";

export const analyticsRouter = router({
  // Optimized with SQL aggregation
  tenderStats: protectedProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return { total: 0, open: 0, awarded: 0, lost: 0, closed: 0, winRate: 0 };
    }

    const result = await dbInstance
      .select({
        status: tenders.status,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(tenders)
      .where(eq(tenders.isArchived, false))
      .groupBy(tenders.status);

    const stats = {
      total: 0,
      open: 0,
      awarded: 0,
      lost: 0,
      closed: 0,
    };

    for (const row of result) {
      const count = Number(row.count);
      stats.total += count;
      const status = row.status?.toLowerCase();
      if (status === TENDER_STATUS.OPEN) stats.open = count;
      if (status === TENDER_STATUS.AWARDED) stats.awarded = count;
      if (status === TENDER_STATUS.LOST) stats.lost = count;
      if (status === TENDER_STATUS.CLOSED) stats.closed = count;
    }

    const denominator = stats.awarded + stats.lost;
    const winRate = denominator > 0 ? (stats.awarded / denominator) * 100 : 0;

    return {
      ...stats,
      winRate: Math.round(winRate * 10) / 10,
    };
  }),

  tenderTrends: protectedProcedure.query(async () => {
    const allTenders = await db.getTenders();
    const monthlyData: Record<string, { month: string; total: number; awarded: number; lost: number }> = {};

    allTenders.forEach(tender => {
      const date = new Date(tender.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0, awarded: 0, lost: 0 };
      }

      monthlyData[monthKey].total++;
      if (tender.status === TENDER_STATUS.AWARDED) monthlyData[monthKey].awarded++;
      if (tender.status === TENDER_STATUS.LOST) monthlyData[monthKey].lost++;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }),

  // Optimized with SQL aggregation
  revenueStats: protectedProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return { total: 0, paid: 0, pending: 0 };
    }

    const result = await dbInstance
      .select({
        status: invoices.status,
        total: sql<number>`sum(${invoices.totalAmount})`.as('total'),
      })
      .from(invoices)
      .groupBy(invoices.status);

    let total = 0;
    let paid = 0;
    let pending = 0;

    for (const row of result) {
      const amount = Number(row.total) || 0;
      total += amount;
      if (row.status === INVOICE_STATUS.PAID) {
        paid = amount;
      } else if (row.status === INVOICE_STATUS.SENT || row.status === INVOICE_STATUS.DRAFT) {
        pending += amount;
      }
    }

    return { total, paid, pending };
  }),

  revenueTrends: protectedProcedure.query(async () => {
    const allInvoices = await db.getInvoices();
    const monthlyData: Record<string, { month: string; revenue: number; paid: number }> = {};

    allInvoices.forEach(invoice => {
      const date = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(invoice.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, revenue: 0, paid: 0 };
      }

      monthlyData[monthKey].revenue += invoice.totalAmount;
      if (invoice.status === INVOICE_STATUS.PAID) {
        monthlyData[monthKey].paid += invoice.totalAmount;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }),

  expenseBreakdown: protectedProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return [];
    }

    const result = await dbInstance
      .select({
        category: expenses.category,
        total: sql<number>`sum(${expenses.amount})`.as('total'),
      })
      .from(expenses)
      .groupBy(expenses.category);

    return result.map(row => ({
      name: row.category || 'Uncategorized',
      value: Number(row.total) || 0,
    }));
  }),

  expenseTrends: protectedProcedure.query(async () => {
    const allExpenses = await db.getExpenses();
    const monthlyData: Record<string, { month: string; amount: number }> = {};

    allExpenses.forEach(expense => {
      const date = expense.expenseDate ? new Date(expense.expenseDate) : new Date(expense.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, amount: 0 };
      }

      monthlyData[monthKey].amount += expense.amount;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }),

  // Optimized with SQL aggregation
  inventoryTrends: protectedProcedure.query(async () => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      return { totalValue: 0, totalItems: 0, lowStockCount: 0 };
    }

    const [valueResult, lowStockResult] = await Promise.all([
      dbInstance
        .select({
          totalValue: sql<number>`sum(COALESCE(${inventory.unitCost}, 0) * ${inventory.quantity})`.as('totalValue'),
          totalItems: sql<number>`count(*)`.as('totalItems'),
        })
        .from(inventory),
      dbInstance
        .select({
          count: sql<number>`count(*)`.as('count'),
        })
        .from(inventory)
        .where(sql`${inventory.quantity} <= ${inventory.minimumStock}`),
    ]);

    return {
      totalValue: Number(valueResult[0]?.totalValue) || 0,
      totalItems: Number(valueResult[0]?.totalItems) || 0,
      lowStockCount: Number(lowStockResult[0]?.count) || 0,
    };
  }),
});
