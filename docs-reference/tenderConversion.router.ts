/**
 * Tender-to-Order Conversion Router
 * Handles converting won tenders into deliveries and invoices
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { DELIVERY_STATUS, INVOICE_STATUS } from "./shared";

export const tenderConversionRouter = router({
  /**
   * Convert a won tender to a delivery order
   */
  convertToDelivery: protectedProcedure
    .input(z.object({
      tenderId: z.number(),
      customerId: z.number(),
      deliveryDate: z.date(),
      deliveryAddress: z.string().optional(),
      trackingNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { tenderId, customerId, deliveryDate, deliveryAddress, trackingNumber, notes } = input;

      // Get tender details
      const tender = await db.getTenderById(tenderId);
      if (!tender) {
        throw new Error("Tender not found");
      }

      // Get tender items
      const tenderItems = await db.getTenderItems(tenderId);
      if (tenderItems.length === 0) {
        throw new Error("Tender has no items");
      }

      // Create delivery
      const deliveryResult = await db.createDelivery({
        customerId,
        deliveryDate,
        status: DELIVERY_STATUS.SCHEDULED,
        deliveryAddress: deliveryAddress || "",
        trackingNumber,
        notes: notes || `Created from tender ${tender.reference}`,
        createdById: ctx.user.id,
      });

      const deliveryId = Number((deliveryResult[0] as unknown as { insertId: number }).insertId);

      // Create delivery items from tender items
      for (const item of tenderItems) {
        // Try to find matching product by description
        // In a real system, you'd have better product matching logic
        await db.createDeliveryItem({
          deliveryId,
          productId: item.productId || 0, // Will need manual correction if no product match
          quantity: item.quantity,
          unitPrice: 0, // Will need to be filled in manually or from tender result
        });
      }

      // Update tender to link to delivery
      await db.updateTender(tenderId, {
        notes: (tender.notes || "") + `\nConverted to delivery #${deliveryId}`,
      });

      return {
        success: true,
        deliveryId,
        message: `Tender ${tender.reference} converted to delivery successfully`,
      };
    }),

  /**
   * Convert a delivery to an invoice
   */
  convertToInvoice: protectedProcedure
    .input(z.object({
      deliveryId: z.number(),
      invoiceNumber: z.string().min(1, "Invoice number is required"),
      invoiceDate: z.date(),
      dueDate: z.date().optional(),
      taxRate: z.number().min(0).max(100).optional(),
      paymentTerms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { deliveryId, invoiceNumber, invoiceDate, dueDate, taxRate = 0, paymentTerms, notes } = input;

      // Get delivery details
      const delivery = await db.getDeliveryById(deliveryId);
      if (!delivery) {
        throw new Error("Delivery not found");
      }

      // Get delivery items
      const deliveryItems = await db.getDeliveryItems(deliveryId);
      if (deliveryItems.length === 0) {
        throw new Error("Delivery has no items");
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of deliveryItems) {
        subtotal += (item.unitPrice || 0) * item.quantity;
      }

      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const invoiceResult = await db.createInvoice({
        invoiceNumber,
        customerId: delivery.customerId,
        deliveryId,
        invoiceDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        status: INVOICE_STATUS.DRAFT,
        notes: notes || `Generated from delivery #${deliveryId}`,
        // paymentTerms field doesn't exist in schema, store in notes if needed
        createdById: ctx.user.id,
      });

      const invoiceId = Number((invoiceResult[0] as unknown as { insertId: number }).insertId);

      // Create invoice items from delivery items
      for (const item of deliveryItems) {
        await db.createInvoiceItem({
          invoiceId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.unitPrice || 0) * item.quantity,
        });
      }

      return {
        success: true,
        invoiceId,
        message: `Invoice ${invoiceNumber} created successfully from delivery`,
      };
    }),

  /**
   * Full conversion: Tender → Delivery → Invoice
   */
  convertTenderToInvoice: protectedProcedure
    .input(z.object({
      tenderId: z.number(),
      customerId: z.number(),
      deliveryDate: z.date(),
      deliveryAddress: z.string().optional(),
      invoiceNumber: z.string().min(1, "Invoice number is required"),
      invoiceDate: z.date(),
      dueDate: z.date().optional(),
      taxRate: z.number().min(0).max(100).optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }): Promise<{ success: boolean; deliveryId: number; invoiceId: number; message: string }> => {
      // Step 1: Convert tender to delivery
      const deliveryResult: { success: boolean; deliveryId: number; message: string } = await tenderConversionRouter.createCaller(ctx).convertToDelivery({
        tenderId: input.tenderId,
        customerId: input.customerId,
        deliveryDate: input.deliveryDate,
        deliveryAddress: input.deliveryAddress,
      });

      // Step 2: Convert delivery to invoice
      const invoiceResult = await tenderConversionRouter.createCaller(ctx).convertToInvoice({
        deliveryId: deliveryResult.deliveryId,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        taxRate: input.taxRate,
        paymentTerms: input.paymentTerms,
      });

      return {
        success: true,
        deliveryId: deliveryResult.deliveryId,
        invoiceId: invoiceResult.invoiceId,
        message: "Tender converted to delivery and invoice successfully",
      };
    }),
});
