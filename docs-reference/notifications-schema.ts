/**
 * Notification Center Schema
 * Add these tables to your main schema.ts file
 */

import { int, mysqlTable, text, timestamp, varchar, mysqlEnum, boolean } from "drizzle-orm/mysql-core";

// Notification types
export const NOTIFICATION_TYPE = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  TENDER_CLOSING: "tender_closing",
  LOW_STOCK: "low_stock",
  DELIVERY_SCHEDULED: "delivery_scheduled",
  INVOICE_DUE: "invoice_due",
  TASK_ASSIGNED: "task_assigned",
} as const;

// User notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who receives the notification
  type: mysqlEnum("type", [
    NOTIFICATION_TYPE.INFO,
    NOTIFICATION_TYPE.SUCCESS,
    NOTIFICATION_TYPE.WARNING,
    NOTIFICATION_TYPE.ERROR,
    NOTIFICATION_TYPE.TENDER_CLOSING,
    NOTIFICATION_TYPE.LOW_STOCK,
    NOTIFICATION_TYPE.DELIVERY_SCHEDULED,
    NOTIFICATION_TYPE.INVOICE_DUE,
    NOTIFICATION_TYPE.TASK_ASSIGNED,
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }), // URL to navigate when clicked
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // e.g., "tender", "invoice", "task"
  relatedEntityId: int("relatedEntityId"), // ID of the related entity
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

// Activity log table for tracking changes
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who performed the action
  action: varchar("action", { length: 50 }).notNull(), // e.g., "created", "updated", "deleted"
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "tender", "invoice", "product"
  entityId: int("entityId").notNull(), // ID of the entity
  entityName: varchar("entityName", { length: 255 }), // Human-readable name
  changes: text("changes"), // JSON string of what changed
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Comments on records
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who created the comment
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "tender", "invoice", "task"
  entityId: int("entityId").notNull(), // ID of the entity
  content: text("content").notNull(),
  parentCommentId: int("parentCommentId"), // For threaded comments
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;
