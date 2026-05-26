import type { IpcMain } from "electron";
import type {
  OpenDocumentRequest,
  OpenDocumentResult,
  SaveMarkdownRequest,
  SaveMarkdownResult
} from "@shared/types/workspace";
import { openDocument, saveMarkdown } from "../services/documentService";

export function registerDocumentsIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    "documents:open",
    async (_event, request: OpenDocumentRequest): Promise<OpenDocumentResult> => {
      return openDocument(request.relativePath);
    }
  );

  ipcMain.handle(
    "documents:save-markdown",
    async (_event, request: SaveMarkdownRequest): Promise<SaveMarkdownResult> => {
      return saveMarkdown(request.relativePath, request.content);
    }
  );
}
