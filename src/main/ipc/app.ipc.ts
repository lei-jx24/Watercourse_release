import type { IpcMain } from "electron";
import { APP_NAME } from "@shared/constants";
import type { AppPingResponse } from "@shared/types/ipc";

export function registerAppIpc(ipcMain: IpcMain): void {
  ipcMain.handle("app:ping", (): AppPingResponse => {
    return {
      appName: APP_NAME,
      status: "ok",
      timestamp: Date.now()
    };
  });
}
