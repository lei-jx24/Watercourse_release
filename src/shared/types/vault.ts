export type VaultFileKind = "pdf" | "markdown";

export type VaultFile = {
  id: string;
  name: string;
  relativePath: string;
  absolutePath: string;
  extension: ".pdf" | ".md";
  kind: VaultFileKind;
  size: number;
  updatedAt: number;
};

export type VaultTreeNode = {
  id: string;
  name: string;
  relativePath: string;
  kind: "directory" | VaultFileKind;
  children?: VaultTreeNode[];
  file?: VaultFile;
};

export type VaultScanResult = {
  rootPath: string;
  files: VaultFile[];
  tree: VaultTreeNode[];
  scannedAt: number;
};

export type VaultState = {
  rootPath: string | null;
  scan: VaultScanResult | null;
};

export type VaultChangeReason = "initial" | "manual" | "watcher";

export type VaultChangedEvent = {
  reason: VaultChangeReason;
  vault: VaultState;
  changedAt: number;
};
