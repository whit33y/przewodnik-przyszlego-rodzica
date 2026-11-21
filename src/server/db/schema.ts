import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Postgres-portable column types only: text, integer, JSON-as-text. */

export const parameterSets = sqliteTable("parameter_sets", {
  id: text("id").primaryKey(),
  validFrom: text("valid_from").notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull(),
  label: text("label").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  publishedAt: text("published_at"),
  author: text("author").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: text("at").notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  diff: text("diff"),
});

export const contentItems = sqliteTable("content_items", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["charity", "link", "text"] }).notNull(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
