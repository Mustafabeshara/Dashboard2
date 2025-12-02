import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import { DELIVERY_STATUS } from "./routers/shared";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Tender-to-Delivery Workflow with Auto-Stock Updates", () => {
  let testTenderId: number;
  let testProductId: number;
  let testCustomerId: number;

  beforeAll(async () => {
    // Create a test customer
    const customerResult = await db.createCustomer({
      name: "Test Hospital",
      type: "hospital",
      contactPerson: "Dr. Test",
      email: "test@hospital.com",
      phone: "123-456-7890",
    });
    testCustomerId = Number((customerResult[0] as unknown as { insertId: number }).insertId);

    // Create a test product
    const productResult = await db.createProduct({
      name: "Test Medical Supply",
      sku: "TEST-SKU-001",
      category: "Medical Supplies",
      unit: "box",
      unitCost: 1000, // $10.00
    });
    testProductId = Number((productResult[0] as unknown as { insertId: number }).insertId);

    // Create initial inventory for the product
    await db.createInventory({
      productId: testProductId,
      quantity: 100,
      minimumStock: 20,
      unitCost: 1000,
      location: "Warehouse A",
    });

    // Create a test tender
    const tenderResult = await db.createTender({
      reference: "TEST-TENDER-001",
      title: "Test Tender for Workflow",
      organization: "Test Hospital",
      closingDate: new Date(),
      status: "awarded",
      createdById: 1,
    });
    testTenderId = Number((tenderResult[0] as unknown as { insertId: number }).insertId);

    // Add tender items
    await db.createTenderItem({
      tenderId: testTenderId,
      productId: testProductId,
      itemDescription: "Test Medical Supply",
      quantity: 50,
      unit: "box",
    });
  });

  it("should convert tender to delivery and auto-update inventory when marked as DELIVERED", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Step 1: Get initial inventory quantity
    const allInventory = await db.getInventory();
    const initialInventory = allInventory.find(inv => inv.productId === testProductId);
    expect(initialInventory).toBeDefined();
    const initialQuantity = initialInventory!.quantity;
    expect(initialQuantity).toBe(100);

    // Step 2: Convert tender to delivery
    const conversionResult = await caller.tenderConversion.convertToDelivery({
      tenderId: testTenderId,
      customerId: testCustomerId,
      deliveryDate: new Date(),
      deliveryAddress: "123 Test Street",
      notes: "Test delivery from tender",
    });

    expect(conversionResult.success).toBe(true);
    expect(conversionResult.deliveryId).toBeGreaterThan(0);

    const deliveryId = conversionResult.deliveryId;

    // Step 3: Verify delivery was created with SCHEDULED status
    const delivery = await db.getDeliveryById(deliveryId);
    expect(delivery).toBeDefined();
    expect(delivery!.status).toBe(DELIVERY_STATUS.SCHEDULED);

    // Step 4: Verify inventory has NOT changed yet (delivery is still scheduled)
    const allInventoryAfterScheduled = await db.getInventory();
    const inventoryAfterScheduled = allInventoryAfterScheduled.find(inv => inv.productId === testProductId);
    expect(inventoryAfterScheduled!.quantity).toBe(initialQuantity);

    // Step 5: Mark delivery as DELIVERED
    await caller.crud.deliveries.update({
      id: deliveryId,
      status: DELIVERY_STATUS.DELIVERED,
    });

    // Step 6: Verify delivery status changed
    const updatedDelivery = await db.getDeliveryById(deliveryId);
    expect(updatedDelivery!.status).toBe(DELIVERY_STATUS.DELIVERED);

    // Step 7: Verify inventory was automatically reduced by delivery quantity (50 units)
    const allFinalInventory = await db.getInventory();
    const finalInventory = allFinalInventory.find(inv => inv.productId === testProductId);
    expect(finalInventory!.quantity).toBe(initialQuantity - 50); // 100 - 50 = 50
  });
});
