import { afterEach, describe, expect, it } from "vitest";
import type BetterSqlite3 from "better-sqlite3";
import { openDatabase } from "@main/db/database";
import { DocumentsRepo } from "@main/db/repositories/documentsRepo";
import { LinksRepo } from "@main/db/repositories/linksRepo";
import { VaultRepo } from "@main/db/repositories/vaultRepo";
import { getGraphForVault } from "@main/services/graphService";
import type { VaultFile } from "@shared/types/vault";

let db: BetterSqlite3.Database | null = null;

afterEach(() => {
  db?.close();
  db = null;
});

describe("graphService", () => {
  it("builds a left-to-right graph from documents and links", () => {
    db = openDatabase({ databasePath: ":memory:" });
    const vault = new VaultRepo(db).upsertByRootPath("/tmp/watercourse-vault", 1);
    const documentsRepo = new DocumentsRepo(db);
    const linksRepo = new LinksRepo(db);

    const a = documentsRepo.upsertScannedFile(vault.vaultId, createFile("A.md", "markdown"));
    const b = documentsRepo.upsertScannedFile(vault.vaultId, createFile("B.md", "markdown"));
    const c = documentsRepo.upsertScannedFile(vault.vaultId, createFile("C.md", "markdown"));

    linksRepo.insert(a.documentId, b.documentId, 2);
    linksRepo.insert(b.documentId, c.documentId, 3);

    const graph = getGraphForVault(db, vault.vaultId);

    expect(graph.nodes.map((node) => node.title)).toEqual(["A", "B", "C"]);
    expect(graph.edges).toHaveLength(2);
    expect(graph.nodes.find((node) => node.title === "A")?.layer).toBe(0);
    expect(graph.nodes.find((node) => node.title === "B")?.layer).toBe(1);
    expect(graph.nodes.find((node) => node.title === "C")?.layer).toBe(2);
    expect(graph.nodes.find((node) => node.title === "A")?.x ?? 0).toBeLessThan(
      graph.nodes.find((node) => node.title === "B")?.x ?? 0
    );
    expect(graph.nodes.find((node) => node.title === "B")?.x ?? 0).toBeLessThan(
      graph.nodes.find((node) => node.title === "C")?.x ?? 0
    );
  });

  it("merges markdown/pdf pairs into one canonical node", () => {
    db = openDatabase({ databasePath: ":memory:" });
    const vault = new VaultRepo(db).upsertByRootPath("/tmp/watercourse-vault", 1);
    const documentsRepo = new DocumentsRepo(db);

    documentsRepo.upsertScannedFile(vault.vaultId, createFile("Paper.pdf", "pdf"));
    documentsRepo.upsertScannedFile(vault.vaultId, createFile("Paper.md", "markdown"));

    const graph = getGraphForVault(db, vault.vaultId);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].kind).toBe("markdown");
    expect(graph.nodes[0].relativePath).toBe("Paper.md");
  });
});

function createFile(relativePath: string, kind: VaultFile["kind"]): VaultFile {
  const extension = kind === "pdf" ? ".pdf" : ".md";

  return {
    id: relativePath,
    name: relativePath.replace(extension, ""),
    relativePath,
    absolutePath: `/tmp/watercourse-vault/${relativePath}`,
    extension,
    kind,
    size: 1,
    updatedAt: 1
  };
}
