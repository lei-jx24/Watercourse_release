import type { VaultFile } from "./vault";

export type DocumentLink = {
  id: string;
  sourceId: string;
  targetId: string;
};

export type WikiLinkOccurrence = {
  targetTitle: string;
  rawText: string;
  startIndex: number;
  endIndex: number;
};

export type ParsedWikiLink = WikiLinkOccurrence & {
  matchedFile: VaultFile | null;
  status: "matched" | "unmatched";
};

export type LinkCycleViolation = {
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  message: string;
};

export type LinkSyncResult = {
  targetId: string;
  desiredSourceIds: string[];
  inserted: number;
  deleted: number;
  violations: LinkCycleViolation[];
};

export type ParseWikiLinksRequest = {
  markdownRelativePath: string;
  content: string;
};

export type ParseWikiLinksResult = {
  markdownRelativePath: string;
  links: ParsedWikiLink[];
  sync: LinkSyncResult | null;
  parsedAt: number;
};
