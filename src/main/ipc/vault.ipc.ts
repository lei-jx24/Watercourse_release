import { existsSync } from "node:fs";
import { dialog, type BrowserWindow, type IpcMain } from "electron";
import type { VaultState } from "@shared/types/vault";
import { getAppDatabase } from "../db/database";
import { VaultRepo } from "../db/repositories/vaultRepo";
import { getSavedVaultPath, saveVaultPath } from "../services/settingsService";
import { watchVault } from "../services/fileWatcher";
import { clearGraphCache } from "../services/graphService";
import { syncAllMarkdownLinks } from "../services/vaultLinkSyncService";
import { syncVaultScanToDatabase } from "../services/vaultIndexService";
import { scanVault } from "../services/vaultScanner";

export function registerVaultIpc(ipcMain: IpcMain, getMainWindow: () => BrowserWindow): void {
  ipcMain.handle("vault:get-state", async (): Promise<VaultState> => {
    const rootPath = await getSavedVaultPathFromAppData();

    if (!rootPath || !existsSync(rootPath)) {
      return { rootPath: null, scan: null };
    }

    const scan = await scanVault(rootPath);
    await syncVaultState(rootPath, scan, getMainWindow);

    return {
      rootPath,
      scan
    };
  });

  ipcMain.handle("vault:choose", async (): Promise<VaultState> => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "Choose Watercourse Vault",
      properties: ["openDirectory", "createDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      const rootPath = await getSavedVaultPathFromAppData();

      if (!rootPath || !existsSync(rootPath)) {
        return { rootPath: null, scan: null };
      }

      const scan = await scanVault(rootPath);
      await syncVaultState(rootPath, scan, getMainWindow);
      return { rootPath, scan };
    }

    const rootPath = result.filePaths[0];
    await saveVaultPath(rootPath);
    const scan = await scanVault(rootPath);
    await syncVaultState(rootPath, scan, getMainWindow);

    return {
      rootPath,
      scan
    };
  });

  ipcMain.handle("vault:rescan", async (): Promise<VaultState> => {
    const rootPath = await getSavedVaultPathFromAppData();

    if (!rootPath || !existsSync(rootPath)) {
      return { rootPath: null, scan: null };
    }

    const scan = await scanVault(rootPath);
    await syncVaultState(rootPath, scan, getMainWindow);

    return {
      rootPath,
      scan
    };
  });
}

async function getSavedVaultPathFromAppData(): Promise<string | null> {
  const settingsPath = await getSavedVaultPath();

  if (settingsPath) {
    return settingsPath;
  }

  return new VaultRepo(getAppDatabase()).getMostRecent()?.rootPath ?? null;
}

async function syncVaultState(
  rootPath: string,
  scan: Awaited<ReturnType<typeof scanVault>>,
  getMainWindow: () => BrowserWindow
): Promise<void> {
  const db = getAppDatabase();
  const indexedVault = syncVaultScanToDatabase(db, scan).vault;
  await syncAllMarkdownLinks(db, indexedVault.vaultId, scan);
  clearGraphCache(indexedVault.vaultId);
  watchVault(rootPath, { getMainWindow });
}
