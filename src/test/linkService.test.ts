import { afterEach, describe, expect, it } from "vitest";
import type BetterSqlite3 from "better-sqlite3";
import type { ParsedWikiLink } from "@shared/types/link";
import type { VaultFile } from "@shared/types/vault";
import { openDatabase } from "@main/db/database";
import { createDocumentId, DocumentsRepo } from "@main/db/repositories/documentsRepo";
import { LinksRepo } from "@main/db/repositories/linksRepo";
import { VaultRepo } from "@main/db/repositories/vaultRepo";
import { syncLinksForDocument } from "@main/services/linkService";

let db: BetterSqlite3.Database | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

describe("linkService", () => {
  it("syncs matched wiki links into document_links", () => {
    const context = createContext(["A.md", "B.md"]);
    const result = syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "B.md",
      parsedLinks: [createParsedLink("A", context.files.get("A.md") ?? null)]
    });

    const sourceId = createDocumentId(context.vaultId, "A.md");
    const targetId = createDocumentId(context.vaultId, "B.md");

    expect(result.inserted).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.violations).toEqual([]);
    expect(new LinksRepo(context.db).getByPair(sourceId, targetId)).not.toBeNull();
  });

  it("deletes links that no longer exist in the current note", () => {
    const context = createContext(["A.md", "B.md"]);
    syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "B.md",
      parsedLinks: [createParsedLink("A", context.files.get("A.md") ?? null)]
    });

    const result = syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "B.md",
      parsedLinks: []
    });

    expect(result.deleted).toBe(1);
    expect(new LinksRepo(context.db).list()).toHaveLength(0);
  });

  it("rejects links that would create a cycle", () => {
    const context = createContext(["A.md", "B.md", "C.md"]);

    syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "B.md",
      parsedLinks: [createParsedLink("A", context.files.get("A.md") ?? null)]
    });
    syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "C.md",
      parsedLinks: [createParsedLink("B", context.files.get("B.md") ?? null)]
    });

    const result = syncLinksForDocument(context.db, {
      vaultId: context.vaultId,
      targetRelativePath: "A.md",
      parsedLinks: [createParsedLink("C", context.files.get("C.md") ?? null)]
    });

    expect(result.inserted).toBe(0);
    expect(result.violations).toHaveLength(1);
    expect(new LinksRepo(context.db).list()).toHaveLength(2);
  });
});

function createContext(relativePaths: string[]) {
  db = openDatabase({ databasePath: ":memory:" });
  const vault = new VaultRepo(db).upsertByRootPath("/tmp/watercourse-vault", 1);
  const documentsRepo = new DocumentsRepo(db);
  const files = new Map<string, VaultFile>();

  for (const relativePath of relativePaths) {
    const file = createVaultFile(relativePath);
    files.set(relativePath, file);
    documentsRepo.upsertScannedFile(vault.vaultId, file, 2);
  }

  return {
    db,
    vaultId: vault.vaultId,
    files
  };
}

function createParsedLink(targetTitle: string, matchedFile: VaultFile | null): ParsedWikiLink {
  return {
    targetTitle,
    rawText: `[[${targetTitle}]]`,
    startIndex: 0,
    endIndex: targetTitle.length + 4,
    matchedFile,
    status: matchedFile ? "matched" : "unmatched"
  };
}

function createVaultFile(relativePath: string): VaultFile {
  return {
    id: relativePath,
    name: relativePath.replace(".md", ""),
    relativePath,
    absolutePath: `/tmp/watercourse-vault/${relativePath}`,
    extension: ".md",
    kind: "markdown",
    size: 1,
    updatedAt: 1
  };
}
