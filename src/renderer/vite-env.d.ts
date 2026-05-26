/// <reference types="vite/client" />

import type { ElectronApi } from "@shared/types/ipc";

declare global {
  interface Window {
    watercourse: ElectronApi;
  }
}
