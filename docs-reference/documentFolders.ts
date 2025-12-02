import { eq, and, isNull, or, like, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  documentFolders,
  folderDocuments,
  requiredDocuments,
  documentReminders,
  type InsertDocumentFolder,
  type InsertFolderDocument,
  type InsertRequiredDocument,
  type InsertDocumentReminder,
} from "../../drizzle/schema";

// ===== Document Folders =====

export async function createFolder(folder: InsertDocumentFolder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(documentFolders).values(folder);
  return result.insertId;
}

export async function getFoldersByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.entityType, entityType),
        eq(documentFolders.entityId, entityId)
      )
    )
    .orderBy(documentFolders.createdAt);
}

export async function getRootFolders(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.entityType, entityType),
        eq(documentFolders.entityId, entityId),
        isNull(documentFolders.parentFolderId)
      )
    )
    .orderBy(documentFolders.createdAt);
}

export async function getSubfolders(parentFolderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.parentFolderId, parentFolderId))
    .orderBy(documentFolders.createdAt);
}

export async function getFolderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.id, id))
    .limit(1);

  return folder || null;
}

export async function updateFolder(
  id: number,
  data: Partial<InsertDocumentFolder>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(documentFolders).set(data).where(eq(documentFolders.id, id));
}

export async function deleteFolder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(documentFolders).where(eq(documentFolders.id, id));
}

// ===== Folder Documents =====

export async function uploadDocumentToFolder(doc: InsertFolderDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(folderDocuments).values(doc);
  return result.insertId;
}

export async function getDocumentsByFolder(folderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(folderDocuments)
    .where(eq(folderDocuments.folderId, folderId))
    .orderBy(folderDocuments.createdAt);
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [doc] = await db
    .select()
    .from(folderDocuments)
    .where(eq(folderDocuments.id, id))
    .limit(1);

  return doc || null;
}

export async function updateDocument(
  id: number,
  data: Partial<InsertFolderDocument>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(folderDocuments).set(data).where(eq(folderDocuments.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(folderDocuments).where(eq(folderDocuments.id, id));
}

// ===== Required Documents =====

export async function createRequiredDocument(doc: InsertRequiredDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(requiredDocuments).values(doc);
  return result.insertId;
}

export async function getRequiredDocumentsByEntity(
  entityType: string,
  entityId: number
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(requiredDocuments)
    .where(
      and(
        eq(requiredDocuments.entityType, entityType),
        eq(requiredDocuments.entityId, entityId)
      )
    )
    .orderBy(requiredDocuments.sortOrder, requiredDocuments.createdAt);
}

export async function updateRequiredDocument(
  id: number,
  data: Partial<InsertRequiredDocument>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(requiredDocuments)
    .set(data)
    .where(eq(requiredDocuments.id, id));
}

export async function deleteRequiredDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(requiredDocuments).where(eq(requiredDocuments.id, id));
}

export async function markDocumentCompleted(
  id: number,
  completedById: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(requiredDocuments)
    .set({
      isCompleted: true,
      completedAt: new Date(),
      completedById,
    })
    .where(eq(requiredDocuments.id, id));
}

export async function getIncompleteRequiredDocuments(
  entityType: string,
  entityId: number
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(requiredDocuments)
    .where(
      and(
        eq(requiredDocuments.entityType, entityType),
        eq(requiredDocuments.entityId, entityId),
        eq(requiredDocuments.isCompleted, false)
      )
    );
}

// ===== Document Reminders =====

export async function createOrUpdateReminder(
  reminder: InsertDocumentReminder
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(documentReminders)
    .where(
      and(
        eq(documentReminders.entityType, reminder.entityType),
        eq(documentReminders.entityId, reminder.entityId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(documentReminders)
      .set(reminder)
      .where(eq(documentReminders.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db.insert(documentReminders).values(reminder);
    return result.insertId;
  }
}

export async function getReminderByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return null;

  const [reminder] = await db
    .select()
    .from(documentReminders)
    .where(
      and(
        eq(documentReminders.entityType, entityType),
        eq(documentReminders.entityId, entityId)
      )
    )
    .limit(1);

  return reminder || null;
}

export async function getDueReminders() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return db
    .select()
    .from(documentReminders)
    .where(
      and(
        eq(documentReminders.isActive, true),
        // nextReminderDue <= now
      )
    );
}

// ===== Global Document Search =====

export async function searchDocuments(params: {
  query?: string;
  entityType?: string;
  folderName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const { query, entityType, folderName, dateFrom, dateTo, limit = 50 } = params;

  // Build the query conditions
  const conditions: any[] = [];

  if (query) {
    // Search in file name or notes
    conditions.push(
      or(
        like(folderDocuments.fileName, `%${query}%`),
        like(folderDocuments.notes, `%${query}%`)
      )
    );
  }

  // Join with folders to filter by entity type and folder name
  let results = await db
    .select({
      id: folderDocuments.id,
      fileName: folderDocuments.fileName,
      fileUrl: folderDocuments.fileUrl,
      fileSize: folderDocuments.fileSize,
      mimeType: folderDocuments.mimeType,
      notes: folderDocuments.notes,
      createdAt: folderDocuments.createdAt,
      folderId: folderDocuments.folderId,
      folderName: documentFolders.name,
      entityType: documentFolders.entityType,
      entityId: documentFolders.entityId,
    })
    .from(folderDocuments)
    .innerJoin(documentFolders, eq(folderDocuments.folderId, documentFolders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(folderDocuments.createdAt))
    .limit(limit);

  // Apply additional filters in JavaScript (since we need to filter by joined table)
  if (entityType) {
    results = results.filter((r) => r.entityType === entityType);
  }

  if (folderName) {
    results = results.filter((r) =>
      r.folderName.toLowerCase().includes(folderName.toLowerCase())
    );
  }

  if (dateFrom) {
    results = results.filter((r) => new Date(r.createdAt) >= dateFrom);
  }

  if (dateTo) {
    results = results.filter((r) => new Date(r.createdAt) <= dateTo);
  }

  return results.slice(0, limit);
}
