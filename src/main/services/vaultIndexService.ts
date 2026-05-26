import type Database from "better-sqlite3";
import type { VaultScanResult } from "@shared/types/vault";
import { DocumentsRepo } from "../db/repositories/documentsRepo";
import { VaultRepo, type VaultRecord } from "../db/repositories/vaultRepo";

export type VaultIndexResult = {
  vault: VaultRecord;
  documentCount: number;
};

export function syncVaultScanToDatabase(
  db: Database.Database,
  scan: VaultScanResult
): VaultIndexResult {
  const vaultRepo = new VaultRepo(db);
  const documentsRepo = new DocumentsRepo(db);

  const sync = db.transaction(() => {
    const vault = vaultRepo.upsertByRootPath(scan.rootPath, scan.scannedAt);
    const documents = documentsRepo.replaceVaultScan(vault.vaultId, scan.files, scan.scannedAt);

    return {
      vault,
      documentCount: documents.length
    };
  });

  return sync();
}
