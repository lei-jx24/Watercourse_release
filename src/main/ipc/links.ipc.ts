import type { IpcMain } from "electron";
import type { ParseWikiLinksRequest, ParseWikiLinksResult } from "@shared/types/link";
import { getAppDatabase } from "../db/database";
import { syncLinksForDocument } from "../services/linkService";
import { getSavedVaultPath } from "../services/settingsService";
import { resolveWikiLinks } from "../services/markdownParser";
import { syncVaultScanToDatabase } from "../services/vaultIndexService";
import { scanVault } from "../services/vaultScanner";

export function registerLinksIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    "links:parse",
    async (_event, request: ParseWikiLinksRequest): Promise<ParseWikiLinksResult> => {
      const rootPath = await getSavedVaultPath();

      if (!rootPath) {
        return {
          markdownRelativePath: request.markdownRelativePath,
          links: [],
          sync: null,
          parsedAt: Date.now()
        };
      }

      const scan = await scanVault(rootPath);
      const db = getAppDatabase();
      const indexedVault = syncVaultScanToDatabase(db, scan).vault;
      const parsedLinks = resolveWikiLinks(request.content, scan.files);
      const sync = syncLinksForDocument(db, {
        vaultId: indexedVault.vaultId,
        targetRelativePath: request.markdownRelativePath,
        parsedLinks
      });

      return {
        markdownRelativePath: request.markdownRelativePath,
        links: parsedLinks,
        sync,
        parsedAt: Date.now()
      };
    }
  );
}
