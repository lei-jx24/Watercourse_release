import type { IpcMain } from "electron";
import type { GraphData } from "@shared/types/graph";
import { getAppDatabase } from "../db/database";
import { VaultRepo } from "../db/repositories/vaultRepo";
import { getGraphForVault } from "../services/graphService";

export function registerGraphIpc(ipcMain: IpcMain): void {
  ipcMain.handle("graph:get", async (): Promise<GraphData> => {
    const db = getAppDatabase();
    const vault = new VaultRepo(db).getMostRecent();

    if (!vault) {
      return {
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
        generatedAt: Date.now()
      };
    }

    return getGraphForVault(db, vault.vaultId);
  });
}
