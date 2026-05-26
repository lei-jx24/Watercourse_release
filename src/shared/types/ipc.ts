import type { VaultChangedEvent, VaultState } from "./vault";
import type { GraphData } from "./graph";
import type { ParseWikiLinksRequest, ParseWikiLinksResult } from "./link";
import type {
  OpenDocumentRequest,
  OpenDocumentResult,
  SaveMarkdownRequest,
  SaveMarkdownResult
} from "./workspace";

export type AppPingResponse = {
  appName: string;
  status: "ok";
  timestamp: number;
};

export type ElectronApi = {
  ping: () => Promise<AppPingResponse>;
  vault: {
    getState: () => Promise<VaultState>;
    choose: () => Promise<VaultState>;
    rescan: () => Promise<VaultState>;
    onChanged: (callback: (event: VaultChangedEvent) => void) => () => void;
  };
  documents: {
    open: (request: OpenDocumentRequest) => Promise<OpenDocumentResult>;
    saveMarkdown: (request: SaveMarkdownRequest) => Promise<SaveMarkdownResult>;
  };
  links: {
    parse: (request: ParseWikiLinksRequest) => Promise<ParseWikiLinksResult>;
  };
  graph: {
    get: () => Promise<GraphData>;
  };
};
