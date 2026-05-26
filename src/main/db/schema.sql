CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vaults (
  vault_id TEXT PRIMARY KEY,
  root_path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('pdf', 'markdown')),
  relative_path TEXT NOT NULL,
  absolute_path TEXT NOT NULL,
  pdf_path TEXT,
  md_path TEXT,
  size INTEGER NOT NULL,
  file_updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (vault_id) REFERENCES vaults(vault_id) ON DELETE CASCADE,
  UNIQUE (vault_id, relative_path)
);

CREATE TABLE IF NOT EXISTS document_links (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  UNIQUE (source_id, target_id),
  CHECK (source_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_vault_id ON documents(vault_id);
CREATE INDEX IF NOT EXISTS idx_document_links_source_id ON document_links(source_id);
CREATE INDEX IF NOT EXISTS idx_document_links_target_id ON document_links(target_id);
