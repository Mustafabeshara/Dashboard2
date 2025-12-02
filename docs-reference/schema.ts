
export type Tender = typeof tenders.$inferSelect;
export type InsertTender = typeof tenders.$inferInsert;

/**
 * Tender Items (products requested in tender)
 */
export const tenderItems = mysqlTable("tenderItems", {
  id: int("id").autoincrement().primaryKey(),
  tenderId: int("tenderId").references(() => tenders.id, { onDelete: "cascade" }).notNull(),
  productId: int("productId").references(() => products.id),
  itemDescription: text("itemDescription"),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TenderItem = typeof tenderItems.$inferSelect;
export type InsertTenderItem = typeof tenderItems.$inferInsert;

/**
 * Tender Results (our bids and competitor bids)
 */
export const tenderResults = mysqlTable("tenderResults", {
  id: int("id").autoincrement().primaryKey(),
  tenderId: int("tenderId").references(() => tenders.id, { onDelete: "cascade" }).notNull(),
  tenderItemId: int("tenderItemId").references(() => tenderItems.id),
  manufacturerId: int("manufacturerId").references(() => manufacturers.id),
  productId: int("productId").references(() => products.id),
  bidPrice: int("bidPrice"), // in cents
  currency: varchar("currency", { length: 10 }).default("USD"),
  isOurBid: boolean("isOurBid").default(false).notNull(),
  competitorName: varchar("competitorName", { length: 255 }),
  isWinner: boolean("isWinner").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TenderResult = typeof tenderResults.$inferSelect;
export type InsertTenderResult = typeof tenderResults.$inferInsert;

/**
 * Inventory
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").references(() => products.id).notNull(),
  warehouseLocation: varchar("warehouseLocation", { length: 255 }),
  quantity: int("quantity").default(0).notNull(),
  unitCost: int("unitCost"), // in cents