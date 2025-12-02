import { notifyOwner } from "./_core/notification";
import { getDb } from "./db";
import { tenders, inventory, products } from "../drizzle/schema";
import { and, lte, eq, sql } from "drizzle-orm";

/**
 * Check for tenders closing soon and send notifications
 * @param daysAhead - Number of days ahead to check (e.g., 7, 3, 1)
 */
export async function checkTenderClosingAlerts(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return { sent: 0, errors: [] };

  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Find tenders closing within the specified days
    const closingTenders = await db
      .select()
      .from(tenders)
      .where(
        and(
          eq(tenders.status, "open"),
          lte(tenders.closingDate, futureDate)
        )
      );

    const notifications = [];
    for (const tender of closingTenders) {
      if (!tender.closingDate) continue;
      
      const daysUntilClosing = Math.ceil(
        (tender.closingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilClosing >= 0 && daysUntilClosing <= daysAhead) {
        const message = `Tender "${tender.reference}" ${
          tender.title ? `(${tender.title})` : ""
        } is closing in ${daysUntilClosing} day(s) on ${tender.closingDate.toLocaleDateString()}.`;

        const result = await notifyOwner({
          title: `⏰ Tender Closing Alert: ${daysUntilClosing} Day(s) Remaining`,
          content: message,
        });

        notifications.push({
          tender: tender.reference,
          daysUntil: daysUntilClosing,
          sent: result,
        });
      }
    }

    return {
      sent: notifications.filter((n) => n.sent).length,
      total: notifications.length,
      notifications,
    };
  } catch (error) {
    console.error("[Notifications] Error checking tender alerts:", error);
    return { sent: 0, errors: [error] };
  }
}

/**
 * Check for low inventory items and send notifications
 */
export async function checkLowInventoryAlerts() {
  const db = await getDb();
  if (!db) return { sent: 0, errors: [] };

  try {
    // Find inventory items below minimum stock
    const lowStockItems = await db
      .select({
        inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(
        sql`${inventory.quantity} <= ${inventory.minimumStock}`
      );

    if (lowStockItems.length === 0) {
      return { sent: 0, total: 0, notifications: [] };
    }

    // Group by stock level
    const outOfStock = lowStockItems.filter((item) => item.inventory.quantity === 0);
    const lowStock = lowStockItems.filter((item) => item.inventory.quantity > 0);

    let message = `**Low Inventory Alert**\\n\\n`;

    if (outOfStock.length > 0) {
      message += `**Out of Stock (${outOfStock.length} items):**\\n`;
      outOfStock.forEach((item) => {
        message += `- ${item.product?.name || "Unknown Product"} (SKU: ${item.product?.sku || "N/A"})\\n`;
      });
      message += `\\n`;
    }

    if (lowStock.length > 0) {
      message += `**Low Stock (${lowStock.length} items):**\\n`;
      lowStock.forEach((item) => {
        message += `- ${item.product?.name || "Unknown Product"}: ${item.inventory.quantity} units (min: ${item.inventory.minimumStock})\\n`;
      });
    }

    const result = await notifyOwner({
      title: `📦 Inventory Alert: ${outOfStock.length} Out of Stock, ${lowStock.length} Low Stock`,
      content: message,
    });

    return {
      sent: result ? 1 : 0,
      total: 1,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      notifications: [
        {
          type: "low_inventory",
          outOfStockCount: outOfStock.length,
          lowStockCount: lowStock.length,
          sent: result,
        },
      ],
    };
  } catch (error) {
    console.error("[Notifications] Error checking inventory alerts:", error);
    return { sent: 0, errors: [error] };
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification() {
  const result = await notifyOwner({
    title: "✅ Test Notification",
    content: "This is a test notification from your Medical Distribution Dashboard. Notifications are working correctly!",
  });

  return {
    sent: result,
    message: result
      ? "Test notification sent successfully"
      : "Failed to send test notification",
  };
}
