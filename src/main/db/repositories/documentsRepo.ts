import type Database from "better-sqlite3";
import type { VaultFile } from "@shared/types/vault";

export type DocumentRecord = {
  documentId: string;
  vaultId: string;
  title: string;
  kind: VaultFile["kind"];
  relativePath: string;
  absolutePath: string;
  pdfPath: string | null;
  mdPath: string | null;
  size: number;
  fileUpdatedAt: number;
  createdAt: number;
  updatedAt: number;
};

type DocumentRow = {
  document_id: string;
  vault_id: string;
  title: string;
  kind: VaultFile["kind"];
  relative_path: string;
  absolute_path: string;
  pdf_path: string | null;
  md_path: string | null;
  size: number;
  file_updated_at: number;
  created_at: number;
  updated_at: number;
};

export class DocumentsRepo {
  constructor(private readonly db: Database.Database) {}

  upsertScannedFile(vaultId: string, file: VaultFile, now = Date.now()): DocumentRecord {
    const documentId = createDocumentId(vaultId, file.relativePath);

    this.db
      .prepare(
        `INSERT INTO documents (
           document_id, vault_id, title, kind, relative_path, absolute_path,
           pdf_path, md_path, size, file_updated_at, created_at, updated_at
         )
         VALUES (
           @documentId, @vaultId, @title, @kind, @relativePath, @absolutePath,
           @pdfPath, @mdPath, @size, @fileUpdatedAt, @now, @now
         )
         ON CONFLICT(vault_id, relative_path) DO UPDATE SET
           title = excluded.title,
           kind = excluded.kind,
           absolute_path = excluded.absolute_path,
           pdf_path = excluded.pdf_path,
           md_path = excluded.md_path,
           size = excluded.size,
           file_updated_at = excluded.file_updated_at,
           updated_at = excluded.updated_at`
      )
      .run({
        documentId,
        vaultId,
        title: file.name,
        kind: file.kind,
        relativePath: file.relativePath,
        absolutePath: file.absolutePath,
        pdfPath: file.kind === "pdf" ? file.absolutePath : null,
        mdPath: file.kind === "markdown" ? file.absolutePath : null,
        size: file.size,
        fileUpdatedAt: file.updatedAt,
        now
      });

    const record = this.getById(documentId);

    if (!record) {
      throw new Error("Failed to upsert document.");
    }

    return record;
  }

  replaceVaultScan(vaultId: string, files: VaultFile[], now = Date.now()): DocumentRecord[] {
    const sync = this.db.transaction(() => {
      const upsert = this.db.prepare(
        `INSERT INTO documents (
           document_id, vault_id, title, kind, relative_path, absolute_path,
           pdf_path, md_path, size, file_updated_at, created_at, updated_at
         )
         VALUES (
           @documentId, @vaultId, @title, @kind, @relativePath, @absolutePath,
           @pdfPath, @mdPath, @size, @fileUpdatedAt, @now, @now
         )
         ON CONFLICT(vault_id, relative_path) DO UPDATE SET
           title = excluded.title,
           kind = excluded.kind,
           absolute_path = excluded.absolute_path,
           pdf_path = excluded.pdf_path,
           md_path = excluded.md_path,
           size = excluded.size,
           file_updated_at = excluded.file_updated_at,
           updated_at = excluded.updated_at`
      );
      const validIds = new Set<string>();

      for (const file of files) {
        const documentId = createDocumentId(vaultId, file.relativePath);
        validIds.add(documentId);

        upsert.run({
          documentId,
          vaultId,
          title: file.name,
          kind: file.kind,
          relativePath: file.relativePath,
          absolutePath: file.absolutePath,
          pdfPath: file.kind === "pdf" ? file.absolutePath : null,
          mdPath: file.kind === "markdown" ? file.absolutePath : null,
          size: file.size,
          fileUpdatedAt: file.updatedAt,
          now
        });
      }

      const existing = this.listByVault(vaultId);

      for (const document of existing) {
        if (!validIds.has(document.documentId)) {
          this.deleteById(document.documentId);
        }
      }

      return this.listByVault(vaultId);
    });

    return sync();
  }

  getById(documentId: string): DocumentRecord | null {
    const row = this.db
      .prepare("SELECT * FROM documents WHERE document_id = ?")
      .get(documentId) as DocumentRow | undefined;

    return row ? mapDocument(row) : null;
  }

  listByVault(vaultId: string): DocumentRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM documents WHERE vault_id = ? ORDER BY relative_path")
      .all(vaultId) as DocumentRow[];

    return rows.map(mapDocument);
  }

  deleteById(documentId: string): void {
    this.db.prepare("DELETE FROM documents WHERE document_id = ?").run(documentId);
  }
}

export function createDocumentId(vaultId: string, relativePath: string): string {
  return `${vaultId}:${relativePath}`;
}

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    documentId: row.document_id,
    vaultId: row.vault_id,
    title: row.title,
    kind: row.kind,
    relativePath: row.relative_path,
    absolutePath: row.absolute_path,
    pdfPath: row.pdf_path,
    mdPath: row.md_path,
    size: row.size,
    fileUpdatedAt: row.file_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
