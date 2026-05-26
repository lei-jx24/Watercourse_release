import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { AppPingResponse, ElectronApi } from "@shared/types/ipc";
import type { GraphData } from "@shared/types/graph";
import type { ParseWikiLinksRequest, ParseWikiLinksResult } from "@shared/types/link";
import type { VaultChangedEvent, VaultState } from "@shared/types/vault";
import type {
  OpenDocumentRequest,
  OpenDocumentResult,
  SaveMarkdownRequest,
  SaveMarkdownResult
} from "@shared/types/workspace";

const electronApi: ElectronApi = {
  ping: () => ipcRenderer.invoke("app:ping") as Promise<AppPingResponse>,
  vault: {
    getState: () => ipcRenderer.invoke("vault:get-state") as Promise<VaultState>,
    choose: () => ipcRenderer.invoke("vault:choose") as Promise<VaultState>,
    rescan: () => ipcRenderer.invoke("vault:rescan") as Promise<VaultState>,
    onChanged: (callback: (event: VaultChangedEvent) => void) => {
      const listener = (_event: IpcRendererEvent, payload: VaultChangedEvent) => {
        callback(payload);
      };

      ipcRenderer.on("vault:changed", listener);

      return () => {
        ipcRenderer.removeListener("vault:changed", listener);
      };
    }
  },
  documents: {
    open: (request: OpenDocumentRequest) =>
      ipcRenderer.invoke("documents:open", request) as Promise<OpenDocumentResult>,
    saveMarkdown: (request: SaveMarkdownRequest) =>
      ipcRenderer.invoke("documents:save-markdown", request) as Promise<SaveMarkdownResult>
  },
  links: {
    parse: (request: ParseWikiLinksRequest) =>
      ipcRenderer.invoke("links:parse", request) as Promise<ParseWikiLinksResult>
  },
  graph: {
    get: () => ipcRenderer.invoke("graph:get") as Promise<GraphData>
  }
};

contextBridge.exposeInMainWorld("watercourse", electronApi);
