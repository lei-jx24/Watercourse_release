import { existsSync } from "node:fs";
import { extname, normalize, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";
import { getAppDatabase } from "../db/database";
import { VaultRepo } from "../db/repositories/vaultRepo";
import { getSavedVaultPath } from "./settingsService";
import { writeLog } from "./loggerService";

const pdfProtocolScheme = "watercourse-pdf";

export function createPdfUrl(absolutePath: string): string {
  return `${pdfProtocolScheme}://open?path=${encodeURIComponent(absolutePath)}`;
}

export function registerPdfProtocol(): void {
  protocol.handle(pdfProtocolScheme, async (request) => {
    try {
      const absolutePath = new URL(request.url).searchParams.get("path");

      if (!absolutePath || !(await canServePdf(absolutePath))) {
        return new Response("PDF not found.", { status: 404 });
      }

      return net.fetch(pathToFileURL(absolutePath).toString());
    } catch (error) {
      await writeLog("error", "Failed to serve PDF through local protocol.", {
        url: request.url,
        error
      });
      return new Response("Unable to load PDF.", { status: 500 });
    }
  });
}

export function registerPdfProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: pdfProtocolScheme,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true
      }
    }
  ]);
}

async function canServePdf(absolutePath: string): Promise<boolean> {
  if (extname(absolutePath).toLowerCase() !== ".pdf" || !existsSync(absolutePath)) {
    return false;
  }

  const rootPath = await getActiveVaultPath();

  if (!rootPath) {
    return false;
  }

  const normalizedRoot = normalize(rootPath);
  const normalizedPath = normalize(absolutePath);
  const backToRoot = relative(normalizedRoot, normalizedPath);

  return backToRoot !== "" && !backToRoot.startsWith("..");
}

async function getActiveVaultPath(): Promise<string | null> {
  const savedPath = await getSavedVaultPath();

  if (savedPath && existsSync(savedPath)) {
    return savedPath;
  }

  return new VaultRepo(getAppDatabase()).getMostRecent()?.rootPath ?? null;
}
