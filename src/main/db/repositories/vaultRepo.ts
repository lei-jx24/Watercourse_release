import { createHash } from "node:crypto";
import type Database from "better-sqlite3";

export type VaultRecord = {
  vaultId: string;
  rootPath: string;
  createdAt: number;
  updatedAt: number;
};

type VaultRow = {
  vault_id: string;
  root_path: string;
  created_at: number;
  updated_at: number;
};

export class VaultRepo {
  constructor(private readonly db: Database.Database) {}

  upsertByRootPath(rootPath: string, now = Date.now()): VaultRecord {
    const vaultId = createVaultId(rootPath);

    this.db
      .prepare(
        `INSERT INTO vaults (vault_id, root_path, created_at, updated_at)
         VALUES (@vaultId, @rootPath, @now, @now)
         ON CONFLICT(root_path) DO UPDATE SET updated_at = excluded.updated_at`
      )
      .run({ vaultId, rootPath, now });

    const record = this.getByRootPath(rootPath);

    if (!record) {
      throw new Error("Failed to upsert vault.");
    }

    return record;
  }

  getByRootPath(rootPath: string): VaultRecord | null {
    const row = this.db
      .prepare("SELECT * FROM vaults WHERE root_path = ?")
      .get(rootPath) as VaultRow | undefined;

    return row ? mapVault(row) : null;
  }

  getMostRecent(): VaultRecord | null {
    const row = this.db
      .prepare("SELECT * FROM vaults ORDER BY updated_at DESC LIMIT 1")
      .get() as VaultRow | undefined;

    return row ? mapVault(row) : null;
  }

  list(): VaultRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM vaults ORDER BY updated_at DESC")
      .all() as VaultRow[];

    return rows.map(mapVault);
  }
}

function createVaultId(rootPath: string): string {
  return createHash("sha256").update(rootPath).digest("hex").slice(0, 24);
}

function mapVault(row: VaultRow): VaultRecord {
  return {
    vaultId: row.vault_id,
    rootPath: row.root_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
