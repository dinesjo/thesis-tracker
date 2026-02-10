import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

type DbInstance = ReturnType<typeof drizzle>;

const globalForDb = globalThis as unknown as {
  sqliteClient: Database.Database | undefined;
  drizzleDb: DbInstance | undefined;
};

function resolveDatabaseFilePath() {
  const configuredPath = process.env.DATABASE_FILE;
  const defaultPath = path.join(process.cwd(), "data", "thesis-tracker.db");
  const filePath = configuredPath?.trim() ? configuredPath : defaultPath;

  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  return filePath;
}

function initializeSchema(client: Database.Database) {
  client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT,
      timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      color_token TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (project_id, order_index)
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      resource_links TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      phase_id TEXT NOT NULL REFERENCES phases(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT,
      status_column TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      column_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_deliverables (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      deliverable_id TEXT NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (task_id, deliverable_id)
    );
  `);
}

function createDb() {
  const dbFile = resolveDatabaseFilePath();
  const client = globalForDb.sqliteClient ?? new Database(dbFile);
  client.pragma("journal_mode = WAL");
  client.pragma("foreign_keys = ON");
  initializeSchema(client);

  const instance = drizzle(client);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.sqliteClient = client;
    globalForDb.drizzleDb = instance;
  }

  return instance;
}

function getDb() {
  if (globalForDb.drizzleDb) {
    return globalForDb.drizzleDb;
  }

  const instance = createDb();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.drizzleDb = instance;
  }
  return instance;
}

// Lazy init avoids failing during Next.js build-time route analysis.
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
