import type Database from "better-sqlite3";
import type { LinkCycleViolation, LinkSyncResult, ParsedWikiLink } from "@shared/types/link";
import { createDocumentId } from "../db/repositories/documentsRepo";
import { LinksRepo, type DocumentLinkRecord } from "../db/repositories/linksRepo";

export type SyncLinksForDocumentInput = {
  vaultId: string;
  targetRelativePath: string;
  parsedLinks: ParsedWikiLink[];
};

export function syncLinksForDocument(
  db: Database.Database,
  input: SyncLinksForDocumentInput
): LinkSyncResult {
  const linksRepo = new LinksRepo(db);
  const targetId = createDocumentId(input.vaultId, input.targetRelativePath);
  const desiredSources = getDesiredSources(input.vaultId, input.parsedLinks);

  const sync = db.transaction(() => {
    const existingTargetLinks = linksRepo.listByTarget(targetId);
    let deleted = 0;
    let inserted = 0;
    const violations: LinkCycleViolation[] = [];
    const desiredSourceIds = [...new Set(desiredSources.map((source) => source.sourceId))];

    for (const link of existingTargetLinks) {
      if (!desiredSourceIds.includes(link.sourceId)) {
        linksRepo.delete(link.sourceId, targetId);
        deleted += 1;
      }
    }

    let graphLinks = linksRepo.list();

    for (const source of desiredSources) {
      if (source.sourceId === targetId || hasPath(targetId, source.sourceId, graphLinks)) {
        violations.push({
          sourceId: source.sourceId,
          targetId,
          sourceTitle: source.sourceTitle,
          message: "检测到循环引用，无法建立历史逆流关系。"
        });
        continue;
      }

      const existing = linksRepo.getByPair(source.sourceId, targetId);

      if (!existing) {
        const insertedLink = linksRepo.insert(source.sourceId, targetId);

        if (insertedLink) {
          graphLinks = [...graphLinks, insertedLink];
          inserted += 1;
        }
      }
    }

    return {
      targetId,
      desiredSourceIds,
      inserted,
      deleted,
      violations
    };
  });

  return sync();
}

function getDesiredSources(
  vaultId: string,
  parsedLinks: ParsedWikiLink[]
): Array<{ sourceId: string; sourceTitle: string }> {
  const seen = new Set<string>();
  const sources: Array<{ sourceId: string; sourceTitle: string }> = [];

  for (const link of parsedLinks) {
    if (link.status !== "matched" || !link.matchedFile) {
      continue;
    }

    const sourceId = createDocumentId(vaultId, link.matchedFile.relativePath);

    if (seen.has(sourceId)) {
      continue;
    }

    seen.add(sourceId);
    sources.push({
      sourceId,
      sourceTitle: link.targetTitle
    });
  }

  return sources;
}

function hasPath(fromId: string, toId: string, links: DocumentLinkRecord[]): boolean {
  if (fromId === toId) {
    return true;
  }

  const outgoing = new Map<string, string[]>();

  for (const link of links) {
    const targets = outgoing.get(link.sourceId) ?? [];
    targets.push(link.targetId);
    outgoing.set(link.sourceId, targets);
  }

  const visited = new Set<string>();
  const stack = [fromId];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    if (current === toId) {
      return true;
    }

    visited.add(current);
    stack.push(...(outgoing.get(current) ?? []));
  }

  return false;
}
