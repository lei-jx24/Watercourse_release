import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type BetterSqlite3 from "better-sqlite3";
import { openDatabase } from "@main/db/database";
import { createDocumentId } from "@main/db/repositories/documentsRepo";
import { LinksRepo } from "@main/db/repositories/linksRepo";
import { VaultRepo } from "@main/db/repositories/vaultRepo";
import { syncAllMarkdownLinks } from "@main/services/vaultLinkSyncService";
import { syncVaultScanToDatabase } from "@main/services/vaultIndexService";
import { scanVault } from "@main/services/vaultScanner";

let tempVault: string | null = null;
let db: BetterSqlite3.Database | null = null;

afterEach(async () => {
  db?.close();
  db = null;

  if (tempVault) {
    await rm(tempVault, { recursive: true, force: true });
    tempVault = null;
  }
});

describe("vaultLinkSyncService", () => {
  it("rebuilds document links from Markdown files after external changes", async () => {
    tempVault = await mkdtemp(join(tmpdir(), "watercourse-link-sync-"));
    db = openDatabase({ databasePath: ":memory:" });
    await writeFile(join(tempVault, "A.md"), "# A\n");
    await writeFile(join(tempVault, "B.md"), "# B\n[[A]]\n");

    const firstScan = await scanVault(tempVault);
    const vault = syncVaultScanToDatabase(db, firstScan).vault;
    await syncAllMarkdownLinks(db, vault.vaultId, firstScan);

    const sourceId = createDocumentId(vault.vaultId, "A.md");
    const targetId = createDocumentId(vault.vaultId, "B.md");

    expect(new LinksRepo(db).getByPair(sourceId, targetId)).not.toBeNull();

    await writeFile(join(tempVault, "B.md"), "# B\n");
    const secondScan = await scanVault(tempVault);
    const sameVault = new VaultRepo(db).getByRootPath(tempVault);
    await syncAllMarkdownLinks(db, sameVault?.vaultId ?? vault.vaultId, secondScan);

    expect(new LinksRepo(db).getByPair(sourceId, targetId)).toBeNull();
  });
});
