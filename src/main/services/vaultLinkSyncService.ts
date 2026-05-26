import { readFile } from "node:fs/promises";
import type Database from "better-sqlite3";
import type { VaultScanResult } from "@shared/types/vault";
import { syncLinksForDocument } from "./linkService";
import { writeLog } from "./loggerService";
import { resolveWikiLinks } from "./markdownParser";

const markdownReadBatchSize = 32;

export async function syncAllMarkdownLinks(
  db: Database.Database,
  vaultId: string,
  scan: VaultScanResult
): Promise<void> {
  const markdownFiles = scan.files.filter((file) => file.kind === "markdown");
  const parsedFiles = await readMarkdownFilesInBatches(markdownFiles);
  const sync = db.transaction(() => {
    for (const file of parsedFiles) {
      const parsedLinks = resolveWikiLinks(file.content, scan.files);

      syncLinksForDocument(db, {
        vaultId,
        targetRelativePath: file.relativePath,
        parsedLinks
      });
    }
  });

  sync();
}

async function readMarkdownFilesInBatches(
  markdownFiles: VaultScanResult["files"]
): Promise<Array<{ relativePath: string; content: string }>> {
  const parsedFiles: Array<{ relativePath: string; content: string }> = [];

  for (let index = 0; index < markdownFiles.length; index += markdownReadBatchSize) {
    const batch = markdownFiles.slice(index, index + markdownReadBatchSize);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          return {
            relativePath: file.relativePath,
            content: await readFile(file.absolutePath, "utf8")
          };
        } catch (error) {
          await writeLog("warn", "Skipped unreadable Markdown file during link sync.", {
            relativePath: file.relativePath,
            absolutePath: file.absolutePath,
            error
          });
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) {
        parsedFiles.push(result);
      }
    }
  }

  return parsedFiles;
}
