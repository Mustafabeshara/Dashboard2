import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { TENDER_STATUS } from "./shared";

export const assistantRouter = router({
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1, "Message cannot be empty"),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      // Gather comprehensive business context
      const allTenders = await db.getTenders();
      const inventoryItems = await db.getInventory();
      const products = await db.getProducts();
      // Get all tender results across all tenders
      const allTenderResults: any[] = [];
      for (const tender of allTenders) {
        const results = await db.getTenderResults(tender.id);
        allTenderResults.push(...results);
      }
      const invoices = await db.getInvoices();
      const expenses = await db.getExpenses();

      // Calculate tender statistics
      const closedTenders = allTenders.filter(t => t.status !== TENDER_STATUS.OPEN);
      const awardedTenders = allTenders.filter(t => t.status === TENDER_STATUS.AWARDED);

      const tenderStats = {
        total: allTenders.length,
        open: allTenders.filter(t => t.status === TENDER_STATUS.OPEN).length,
        awarded: awardedTenders.length,
        lost: allTenders.filter(t => t.status === TENDER_STATUS.LOST).length,
        winRate: closedTenders.length > 0
          ? Math.round((awardedTenders.length / closedTenders.length) * 100)
          : 0,
      };

      // Competitor analysis from tender results
      const competitorWins: Record<string, number> = {};
      const competitorBids: Record<string, { total: number; avgPrice: number; totalPrice: number }> = {};
      
      allTenderResults.forEach(result => {
        const competitor = result.competitorName || 'Unknown';
        if (!competitorBids[competitor]) {
          competitorBids[competitor] = { total: 0, avgPrice: 0, totalPrice: 0 };
        }
        competitorBids[competitor].total += 1;
        competitorBids[competitor].totalPrice += result.bidPrice || 0;
        
        if (result.isWinner) {
          competitorWins[competitor] = (competitorWins[competitor] || 0) + 1;
        }
      });

      // Calculate average prices
      Object.keys(competitorBids).forEach(competitor => {
        const data = competitorBids[competitor];
        data.avgPrice = data.total > 0 ? data.totalPrice / data.total : 0;
      });

      const topCompetitors = Object.entries(competitorWins)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, wins]) => `${name}: ${wins} wins`);

      // Financial analysis
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalExpenses = expenses
        .filter(exp => exp.status === 'paid')
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const grossProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

      // Revenue trends (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recentInvoices = paidInvoices.filter(inv => 
        new Date(inv.paidDate || inv.invoiceDate) >= sixMonthsAgo
      );
      const recentRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      // Product category analysis
      const productsByCategory: Record<string, number> = {};
      products.forEach(product => {
        const category = product.category || 'Uncategorized';
        productsByCategory[category] = (productsByCategory[category] || 0) + 1;
      });

      // Build enhanced context for AI
      const businessContext = `
You are an AI assistant for a medical distribution company in Kuwait. You have access to comprehensive business data and should provide strategic insights.

**Tender Statistics:**
- Total tenders: ${tenderStats.total}
- Open tenders: ${tenderStats.open}
- Awarded tenders: ${tenderStats.awarded}
- Lost tenders: ${tenderStats.lost}
- Win rate: ${tenderStats.winRate}%

**Competitor Intelligence:**
- Total competitors tracked: ${Object.keys(competitorBids).length}
- Top competitors by wins: ${topCompetitors.length > 0 ? topCompetitors.join(', ') : 'No data yet'}
- Total tender results analyzed: ${allTenderResults.length}

**Financial Performance:**
- Total revenue (paid invoices): $${totalRevenue.toFixed(2)}
- Total expenses: $${totalExpenses.toFixed(2)}
- Gross profit: $${grossProfit.toFixed(2)}
- Profit margin: ${profitMargin}%
- Recent revenue (last 6 months): $${recentRevenue.toFixed(2)}

**Inventory:**
- Total inventory items: ${inventoryItems.length}
- Low stock items: ${inventoryItems.filter((i) => i.quantity <= (i.minimumStock || 0)).length}
- Out of stock items: ${inventoryItems.filter((i) => i.quantity === 0).length}

**Products:**
- Total products: ${products.length}
- Product categories: ${Object.keys(productsByCategory).join(', ')}

**Invoices & Expenses:**
- Total invoices: ${invoices.length}
- Paid invoices: ${paidInvoices.length}
- Total expenses: ${expenses.length}

Answer questions about business performance, competitor analysis, financial trends, inventory management, and strategic insights. Provide actionable recommendations based on the data. Be concise, data-driven, and strategic.
`;

      const messages = [
        { role: "system" as const, content: businessContext },
        ...(input.conversationHistory || []),
        { role: "user" as const, content: input.message },
      ];

      const response = await invokeLLM({ messages });

      return {
        response: response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.",
        context: {
          tendersTotal: tenderStats.total,
          tendersOpen: tenderStats.open,
          inventoryItems: inventoryItems.length,
          productsTotal: products.length,
          totalRevenue,
          profitMargin,
          topCompetitors: topCompetitors.slice(0, 3),
        },
      };
    }),
});
