import { afterEach, describe, expect, it } from "vitest";
import type BetterSqlite3 from "better-sqlite3";
import { openDatabase } from "@main/db/database";
import { createDocumentId, DocumentsRepo } from "@main/db/repositories/documentsRepo";
import { LinksRepo } from "@main/db/repositories/linksRepo";
import { VaultRepo } from "@main/db/repositories/vaultRepo";
import { syncVaultScanToDatabase } from "@main/services/vaultIndexService";
import type { VaultFile, VaultScanResult } from "@shared/types/vault";

let db: BetterSqlite3.Database | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

describe("SQLite repositories", () => {
  it("upserts vaults and scanned documents", () => {
    db = openDatabase({ databasePath: ":memory:" });
    const vaultRepo = new VaultRepo(db);
    const documentsRepo = new DocumentsRepo(db);

    const vault = vaultRepo.upsertByRootPath("/tmp/watercourse-vault", 100);
    const document = documentsRepo.upsertScannedFile(
      vault.vaultId,
      createVaultFile("papers/BERT.pdf", "pdf"),
      200
    );

    expect(vaultRepo.getMostRecent()?.rootPath).toBe("/tmp/watercourse-vault");
    expect(document.documentId).toBe(createDocumentId(vault.vaultId, "papers/BERT.pdf"));
    expect(document.pdfPath).toBe("/tmp/watercourse-vault/papers/BERT.pdf");
    expect(document.mdPath).toBeNull();
    expect(documentsRepo.listByVault(vault.vaultId)).toHaveLength(1);
  });

  it("replaces a vault scan and removes missing documents", () => {
    db = openDatabase({ databasePath: ":memory:" });
    const scan = createScan([
      createVaultFile("notes/A.md", "markdown"),
      createVaultFile("papers/A.pdf", "pdf")
    ]);
    const firstIndex = syncVaultScanToDatabase(db, scan);

    expect(firstIndex.documentCount).toBe(2);

    const secondIndex = syncVaultScanToDatabase(
      db,
      createScan([createVaultFile("notes/A.md", "markdown")])
    );
    const documents = new DocumentsRepo(db).listByVault(secondIndex.vault.vaultId);

    expect(secondIndex.documentCount).toBe(1);
    expect(documents.map((document) => document.relativePath)).toEqual(["notes/A.md"]);
  });

  it("inserts links once and deletes them by pair", () => {
    db = openDatabase({ databasePath: ":memory:" });
    const vault = new VaultRepo(db).upsertByRootPath("/tmp/watercourse-vault", 100);
    const documentsRepo = new DocumentsRepo(db);
    const source = documentsRepo.upsertScannedFile(vault.vaultId, createVaultFile("A.md", "markdown"));
    const target = documentsRepo.upsertScannedFile(vault.vaultId, createVaultFile("B.md", "markdown"));
    const linksRepo = new LinksRepo(db);

    const firstLink = linksRepo.insert(source.documentId, target.documentId, 200);
    const duplicateLink = linksRepo.insert(source.documentId, target.documentId, 300);

    expect(firstLink?.linkId).toBe(duplicateLink?.linkId);
    expect(linksRepo.list()).toHaveLength(1);

    linksRepo.delete(source.documentId, target.documentId);

    expect(linksRepo.list()).toHaveLength(0);
  });
});

function createScan(files: VaultFile[]): VaultScanResult {
  return {
    rootPath: "/tmp/watercourse-vault",
    files,
    tree: [],
    scannedAt: 1000
  };
}

function createVaultFile(relativePath: string, kind: VaultFile["kind"]): VaultFile {
  const extension = kind === "pdf" ? ".pdf" : ".md";

  return {
    id: relativePath,
    name: relativePath.split("/").at(-1)?.replace(extension, "") ?? relativePath,
    relativePath,
    absolutePath: `/tmp/watercourse-vault/${relativePath}`,
    extension,
    kind,
    size: 128,
    updatedAt: 500
  };
}
