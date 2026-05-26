import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { scanVault } from "@main/services/vaultScanner";

let tempVault: string | null = null;

afterEach(async () => {
  if (tempVault) {
    await rm(tempVault, { recursive: true, force: true });
    tempVault = null;
  }
});

describe("scanVault", () => {
  it("scans PDF and Markdown files into a sorted tree", async () => {
    tempVault = await mkdtemp(join(tmpdir(), "watercourse-vault-"));
    await mkdir(join(tempVault, "papers"));
    await mkdir(join(tempVault, "notes"));
    await mkdir(join(tempVault, ".hidden"));
    await writeFile(join(tempVault, "papers", "BERT.pdf"), "pdf");
    await writeFile(join(tempVault, "notes", "BERT.md"), "# BERT");
    await writeFile(join(tempVault, "notes", "ignore.txt"), "ignore");
    await writeFile(join(tempVault, ".hidden", "Secret.md"), "# Secret");

    const result = await scanVault(tempVault);

    expect(result.rootPath).toBe(tempVault);
    expect(result.files.map((file) => file.relativePath)).toEqual([
      "notes/BERT.md",
      "papers/BERT.pdf"
    ]);
    expect(result.files.map((file) => file.kind)).toEqual(["markdown", "pdf"]);
    expect(result.tree.map((node) => node.name)).toEqual(["notes", "papers"]);
    expect(result.tree[0].children?.[0].name).toBe("BERT");
  });
});
