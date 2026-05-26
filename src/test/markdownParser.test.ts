import { describe, expect, it } from "vitest";
import { parseWikiLinkOccurrences, resolveWikiLinks } from "@main/services/markdownParser";
import type { VaultFile } from "@shared/types/vault";

describe("markdownParser", () => {
  it("extracts wiki links with positions", () => {
    const content = "Inspired by [[NeRF]] and [[ COLMAP ]].";

    expect(parseWikiLinkOccurrences(content)).toEqual([
      {
        targetTitle: "NeRF",
        rawText: "[[NeRF]]",
        startIndex: 12,
        endIndex: 20
      },
      {
        targetTitle: "COLMAP",
        rawText: "[[ COLMAP ]]",
        startIndex: 25,
        endIndex: 37
      }
    ]);
  });

  it("keeps MVP behavior and parses links inside code blocks", () => {
    const content = "```md\n[[StillParsed]]\n```";

    expect(parseWikiLinkOccurrences(content).map((link) => link.targetTitle)).toEqual([
      "StillParsed"
    ]);
  });

  it("resolves wiki links to vault files by title", () => {
    const links = resolveWikiLinks("[[NeRF]] [[Missing]]", [
      createVaultFile("2003_NeRF.md", "markdown", "NeRF"),
      createVaultFile("papers/COLMAP.pdf", "pdf", "COLMAP")
    ]);

    expect(links.map((link) => link.status)).toEqual(["matched", "unmatched"]);
    expect(links[0].matchedFile?.relativePath).toBe("2003_NeRF.md");
    expect(links[1].matchedFile).toBeNull();
  });
});

function createVaultFile(
  relativePath: string,
  kind: VaultFile["kind"],
  name: string
): VaultFile {
  return {
    id: relativePath,
    name,
    relativePath,
    absolutePath: `/tmp/vault/${relativePath}`,
    extension: kind === "pdf" ? ".pdf" : ".md",
    kind,
    size: 1,
    updatedAt: 1
  };
}
