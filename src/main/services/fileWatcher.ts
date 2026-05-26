import { existsSync, watch, type FSWatcher } from "node:fs";
import type { BrowserWindow } from "electron";
import type { VaultChangedEvent, VaultState } from "@shared/types/vault";
import { getAppDatabase } from "../db/database";
import { clearGraphCache } from "./graphService";
import { writeLog } from "./loggerService";
import { syncAllMarkdownLinks } from "./vaultLinkSyncService";
import { syncVaultScanToDatabase } from "./vaultIndexService";
import { scanVault } from "./vaultScanner";

type FileWatcherOptions = {
  getMainWindow: () => BrowserWindow;
};

let watcher: FSWatcher | null = null;
let activeRootPath: string | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

export function watchVault(rootPath: string, options: FileWatcherOptions): void {
  if (activeRootPath === rootPath && watcher) {
    return;
  }

  stopWatchingVault();
  activeRootPath = rootPath;

  try {
    watcher = watch(rootPath, { recursive: true }, () => {
      scheduleVaultRefresh(rootPath, options);
    });
  } catch (error) {
    watcher = null;
    void writeLog("warn", "Failed to start Vault file watcher.", { rootPath, error });
  }
}

export function stopWatchingVault(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  watcher?.close();
  watcher = null;
  activeRootPath = null;
}

function scheduleVaultRefresh(rootPath: string, options: FileWatcherOptions): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    refreshVaultFromWatcher(rootPath, options).catch(() => {
      void writeLog("error", "Failed to refresh Vault after file watcher event.", { rootPath });
      emitVaultChanged(options, {
        reason: "watcher",
        vault: { rootPath: existsSync(rootPath) ? rootPath : null, scan: null },
        changedAt: Date.now()
      });
    });
  }, 350);
}

async function refreshVaultFromWatcher(
  rootPath: string,
  options: FileWatcherOptions
): Promise<void> {
  if (!existsSync(rootPath)) {
    emitVaultChanged(options, {
      reason: "watcher",
      vault: { rootPath: null, scan: null },
      changedAt: Date.now()
    });
    return;
  }

  const db = getAppDatabase();
  const scan = await scanVault(rootPath);
  const indexedVault = syncVaultScanToDatabase(db, scan).vault;
  await syncAllMarkdownLinks(db, indexedVault.vaultId, scan);
  clearGraphCache(indexedVault.vaultId);

  emitVaultChanged(options, {
    reason: "watcher",
    vault: createVaultState(rootPath, scan),
    changedAt: Date.now()
  });
}

function emitVaultChanged(options: FileWatcherOptions, event: VaultChangedEvent): void {
  const mainWindow = options.getMainWindow();

  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send("vault:changed", event);
  }
}

function createVaultState(rootPath: string, scan: VaultState["scan"]): VaultState {
  return {
    rootPath,
    scan
  };
}
