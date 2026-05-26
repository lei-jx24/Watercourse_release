import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type BetterSqlite3 from "better-sqlite3";
import { openDatabase } from "@main/db/database";
import { openDocument, saveMarkdown } from "@main/services/documentService";

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

describe("documentService", () => {
  it("opens a PDF and creates a paired Markdown note", async () => {
    tempVault = await mkdtemp(join(tmpdir(), "watercourse-documents-"));
    db = openDatabase({ databasePath: ":memory:" });
    await writeFile(join(tempVault, "Paper.pdf"), "%PDF-1.4 test");

    const result = await openDocument("Paper.pdf", { rootPath: tempVault, db });

    expect(result.title).toBe("Paper");
    expect(result.createdMarkdown).toBe(true);
    expect(result.pdfUrl?.startsWith("watercourse-pdf://open?path=")).toBe(true);
    expect(result.markdownFile.relativePath).toBe("Paper.md");
    expect(result.markdownContent).toBe("# Paper\n\n");
    expect(existsSync(join(tempVault, "Paper.md"))).toBe(true);
    expect(result.vault.scan?.files.map((file) => file.relativePath)).toEqual(["Paper.md", "Paper.pdf"]);
  });

  it("saves Markdown content back to disk", async () => {
    tempVault = await mkdtemp(join(tmpdir(), "watercourse-documents-"));
    await writeFile(join(tempVault, "Paper.md"), "# Old\n");

    await saveMarkdown("Paper.md", "# New\n\n[[Source]]\n", { rootPath: tempVault });

    await expect(readFile(join(tempVault, "Paper.md"), "utf8")).resolves.toBe(
      "# New\n\n[[Source]]\n"
    );
  });
});
