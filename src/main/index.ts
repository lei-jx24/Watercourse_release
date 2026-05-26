import { app, BrowserWindow, ipcMain } from "electron";
import { createMainWindow } from "./window/createMainWindow";
import { registerAppIpc } from "./ipc/app.ipc";
import { registerDocumentsIpc } from "./ipc/documents.ipc";
import { registerGraphIpc } from "./ipc/graph.ipc";
import { registerLinksIpc } from "./ipc/links.ipc";
import { registerVaultIpc } from "./ipc/vault.ipc";
import { registerPdfProtocol, registerPdfProtocolScheme } from "./services/pdfProtocol";

const gotLock = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;

registerPdfProtocolScheme();

function ensureMainWindow(): BrowserWindow {
  const existingWindow = BrowserWindow.getAllWindows()[0];

  if (existingWindow) {
    mainWindow = existingWindow;
    return existingWindow;
  }

  mainWindow = createMainWindow();
  return mainWindow;
}

function focusMainWindow(): void {
  const window = ensureMainWindow();

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
}

if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    registerPdfProtocol();
    registerAppIpc(ipcMain);
    registerDocumentsIpc(ipcMain);
    registerGraphIpc(ipcMain);
    registerLinksIpc(ipcMain);
    mainWindow = createMainWindow();
    registerVaultIpc(ipcMain, () => ensureMainWindow());

    app.on("second-instance", () => {
      focusMainWindow();
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
