import { extname } from "node:path";
import type { ParsedWikiLink, WikiLinkOccurrence } from "@shared/types/link";
import type { VaultFile } from "@shared/types/vault";

const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;

export function parseWikiLinkOccurrences(content: string): WikiLinkOccurrence[] {
  const links: WikiLinkOccurrence[] = [];
  const pattern = new RegExp(wikiLinkPattern);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const rawTarget = match[1].trim();

    if (!rawTarget) {
      continue;
    }

    links.push({
      targetTitle: rawTarget,
      rawText: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return links;
}

export function resolveWikiLinks(content: string, vaultFiles: VaultFile[]): ParsedWikiLink[] {
  const titleIndex = createTitleIndex(vaultFiles);

  return parseWikiLinkOccurrences(content).map((link) => {
    const matchedFile = titleIndex.get(normalizeTitle(link.targetTitle)) ?? null;

    return {
      ...link,
      matchedFile,
      status: matchedFile ? "matched" : "unmatched"
    };
  });
}

function createTitleIndex(vaultFiles: VaultFile[]): Map<string, VaultFile> {
  const titleIndex = new Map<string, VaultFile>();

  for (const file of vaultFiles) {
    const normalized = normalizeTitle(file.name);
    const existing = titleIndex.get(normalized);

    if (!existing || existing.kind !== "markdown") {
      titleIndex.set(normalized, file);
    }

    titleIndex.set(normalizeTitle(removeExtension(file.relativePath)), titleIndex.get(normalized) ?? file);
  }

  return titleIndex;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function removeExtension(relativePath: string): string {
  const extension = extname(relativePath);
  return extension ? relativePath.slice(0, -extension.length) : relativePath;
}
