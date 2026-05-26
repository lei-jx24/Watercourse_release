import type Database from "better-sqlite3";

export type DocumentLinkRecord = {
  linkId: number;
  sourceId: string;
  targetId: string;
  createdAt: number;
};

type DocumentLinkRow = {
  link_id: number;
  source_id: string;
  target_id: string;
  created_at: number;
};

export class LinksRepo {
  constructor(private readonly db: Database.Database) {}

  insert(sourceId: string, targetId: string, now = Date.now()): DocumentLinkRecord | null {
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO document_links (source_id, target_id, created_at)
         VALUES (?, ?, ?)`
      )
      .run(sourceId, targetId, now);

    if (result.changes === 0) {
      return this.getByPair(sourceId, targetId);
    }

    return this.getById(Number(result.lastInsertRowid));
  }

  getById(linkId: number): DocumentLinkRecord | null {
    const row = this.db
      .prepare("SELECT * FROM document_links WHERE link_id = ?")
      .get(linkId) as DocumentLinkRow | undefined;

    return row ? mapLink(row) : null;
  }

  getByPair(sourceId: string, targetId: string): DocumentLinkRecord | null {
    const row = this.db
      .prepare("SELECT * FROM document_links WHERE source_id = ? AND target_id = ?")
      .get(sourceId, targetId) as DocumentLinkRow | undefined;

    return row ? mapLink(row) : null;
  }

  list(): DocumentLinkRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM document_links ORDER BY link_id")
      .all() as DocumentLinkRow[];

    return rows.map(mapLink);
  }

  listForDocument(documentId: string): DocumentLinkRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM document_links
         WHERE source_id = ? OR target_id = ?
         ORDER BY link_id`
      )
      .all(documentId, documentId) as DocumentLinkRow[];

    return rows.map(mapLink);
  }

  listByTarget(targetId: string): DocumentLinkRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM document_links WHERE target_id = ? ORDER BY link_id")
      .all(targetId) as DocumentLinkRow[];

    return rows.map(mapLink);
  }

  delete(sourceId: string, targetId: string): void {
    this.db
      .prepare("DELETE FROM document_links WHERE source_id = ? AND target_id = ?")
      .run(sourceId, targetId);
  }

  deleteForDocument(documentId: string): void {
    this.db
      .prepare("DELETE FROM document_links WHERE source_id = ? OR target_id = ?")
      .run(documentId, documentId);
  }
}

function mapLink(row: DocumentLinkRow): DocumentLinkRecord {
  return {
    linkId: row.link_id,
    sourceId: row.source_id,
    targetId: row.target_id,
    createdAt: row.created_at
  };
}
