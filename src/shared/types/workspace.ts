import type { VaultFile, VaultState } from "./vault";

export type OpenDocumentRequest = {
  relativePath: string;
};

export type OpenDocumentResult = {
  title: string;
  selectedFile: VaultFile;
  pdfFile: VaultFile | null;
  markdownFile: VaultFile;
  markdownContent: string;
  pdfUrl: string | null;
  createdMarkdown: boolean;
  vault: VaultState;
};

export type SaveMarkdownRequest = {
  relativePath: string;
  content: string;
};

export type SaveMarkdownResult = {
  savedAt: number;
};
