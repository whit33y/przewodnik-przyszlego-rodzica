import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { count } from "drizzle-orm";
import * as schema from "./schema";
import { readParameterFiles } from "../params-files";

export type Db = BetterSQLite3Database<typeof schema>;

let instance: { db: Db; sqlite: Database.Database } | null = null;

export const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";

function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "runtime", "app.db");
}

/** Lazy singleton: opens SQLite (WAL), applies migrations and seeds statutory parameters on first use. */
export function getDb(): Db {
  if (instance) return instance.db;
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  seed(db);
  instance = { db, sqlite };
  return db;
}

function seed(db: Db) {
  const [{ n }] = db.select({ n: count() }).from(schema.parameterSets).all();
  if (n > 0) return;
  const now = new Date().toISOString();
  db.transaction((tx) => {
  for (const set of readParameterFiles()) {
    tx.insert(schema.parameterSets)
      .values({ id: set.id, validFrom: set.validFrom, status: "published", label: set.label, payload: JSON.stringify(set), createdAt: now, publishedAt: now, author: "seed" })
      .run();
  }
  tx.insert(schema.auditLog).values({ at: now, actor: "system", action: "seed", entity: "parameter_sets", entityId: "*", diff: null }).run();
  });
}

export function pingDb(): boolean {
  try {
    getDb();
    instance!.sqlite.prepare("select 1").get();
    return true;
  } catch {
    return false;
  }
}
