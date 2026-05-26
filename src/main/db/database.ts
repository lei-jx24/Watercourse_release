import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";
import BetterSqlite3 from "better-sqlite3";
import { runMigrations } from "./migrations";
import { writeLogSync } from "../services/loggerService";

let appDatabase: BetterSqlite3.Database | null = null;

export type OpenDatabaseOptions = {
  databasePath?: string;
};

export function getDefaultDatabasePath(): string {
  return join(app.getPath("userData"), "watercourse.sqlite");
}

export function openDatabase(options: OpenDatabaseOptions = {}): BetterSqlite3.Database {
  const databasePath = options.databasePath ?? getDefaultDatabasePath();

  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  try {
    return openHealthyDatabase(databasePath);
  } catch (error) {
    if (databasePath === ":memory:") {
      throw error;
    }

    const recoveredPath = moveCorruptDatabase(databasePath);
    writeLogSync("error", "Recovered from an unreadable SQLite database.", {
      databasePath,
      recoveredPath,
      error
    });
    return openHealthyDatabase(databasePath);
  }
}

export function getAppDatabase(): BetterSqlite3.Database {
  if (!appDatabase) {
    appDatabase = openDatabase();
  }

  return appDatabase;
}

export function closeAppDatabase(): void {
  appDatabase?.close();
  appDatabase = null;
}

function openHealthyDatabase(databasePath: string): BetterSqlite3.Database {
  const db = new BetterSqlite3(databasePath);

  try {
    const integrity = db.pragma("integrity_check", { simple: true }) as string;

    if (integrity !== "ok") {
      throw new Error(`SQLite integrity check failed: ${integrity}`);
    }

    runMigrations(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function moveCorruptDatabase(databasePath: string): string | null {
  if (!existsSync(databasePath)) {
    return null;
  }

  const recoveredPath = `${databasePath}.corrupt-${Date.now()}`;
  renameSync(databasePath, recoveredPath);

  for (const suffix of ["-wal", "-shm"]) {
    const sidecarPath = `${databasePath}${suffix}`;

    if (existsSync(sidecarPath)) {
      renameSync(sidecarPath, `${recoveredPath}${suffix}`);
    }
  }

  return recoveredPath;
}
