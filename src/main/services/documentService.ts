import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, relative } from "node:path";
import { existsSync } from "node:fs";
import type { OpenDocumentResult, SaveMarkdownResult } from "@shared/types/workspace";
import type { VaultFile, VaultScanResult, VaultState } from "@shared/types/vault";
import { getAppDatabase } from "../db/database";
import { VaultRepo } from "../db/repositories/vaultRepo";
import { getSavedVaultPath } from "./settingsService";
import { createPdfUrl } from "./pdfProtocol";
import { syncVaultScanToDatabase } from "./vaultIndexService";
import { scanVault } from "./vaultScanner";

type DocumentServiceOptions = {
  rootPath?: string;
  db?: import("better-sqlite3").Database;
};

export async function openDocument(
  relativePath: string,
  options: DocumentServiceOptions = {}
): Promise<OpenDocumentResult> {
  const rootPath = await getActiveVaultPath(options);
  const initialScan = await scanVault(rootPath);
  const selectedFile = findFile(initialScan, relativePath);
  const title = selectedFile.name;
  const pdfFile = selectedFile.kind === "pdf" ? selectedFile : findCounterpart(initialScan, selectedFile, "pdf");
  let markdownFile =
    selectedFile.kind === "markdown"
      ? selectedFile
      : findCounterpart(initialScan, selectedFile, "markdown");
  let createdMarkdown = false;

  if (!markdownFile) {
    markdownFile = await createMarkdownForFile(rootPath, selectedFile);
    createdMarkdown = true;
  }

  const currentScan = createdMarkdown ? await scanVault(rootPath) : initialScan;
  syncVaultScanToDatabase(options.db ?? getAppDatabase(), currentScan);

  const currentMarkdown =
    currentScan.files.find((file) => file.relativePath === markdownFile.relativePath) ?? markdownFile;
  const currentPdf = pdfFile
    ? currentScan.files.find((file) => file.relativePath === pdfFile.relativePath) ?? pdfFile
    : null;

  return {
    title,
    selectedFile,
    pdfFile: currentPdf,
    markdownFile: currentMarkdown,
    markdownContent: await readFile(currentMarkdown.absolutePath, "utf8"),
    pdfUrl: currentPdf ? createPdfUrl(currentPdf.absolutePath) : null,
    createdMarkdown,
    vault: createVaultState(rootPath, currentScan)
  };
}

export async function saveMarkdown(
  relativePath: string,
  content: string,
  options: DocumentServiceOptions = {}
): Promise<SaveMarkdownResult> {
  const rootPath = await getActiveVaultPath(options);
  const absolutePath = resolveInsideVault(rootPath, relativePath);

  if (extname(absolutePath).toLowerCase() !== ".md") {
    throw new Error("Only Markdown files can be saved.");
  }

  await writeFile(absolutePath, content, "utf8");

  return {
    savedAt: Date.now()
  };
}

async function getActiveVaultPath(options: DocumentServiceOptions = {}): Promise<string> {
  if (options.rootPath) {
    return options.rootPath;
  }

  const savedPath = await getSavedVaultPath();
  const databasePath = new VaultRepo(getAppDatabase()).getMostRecent()?.rootPath ?? null;
  const rootPath = savedPath ?? databasePath;

  if (!rootPath || !existsSync(rootPath)) {
    throw new Error("No available Vault is selected.");
  }

  return rootPath;
}

function findFile(scan: VaultScanResult, relativePath: string): VaultFile {
  const file = scan.files.find((candidate) => candidate.relativePath === relativePath);

  if (!file) {
    throw new Error(`Document not found in Vault: ${relativePath}`);
  }

  return file;
}

function findCounterpart(
  scan: VaultScanResult,
  selectedFile: VaultFile,
  kind: VaultFile["kind"]
): VaultFile | null {
  const selectedStem = getStem(selectedFile.relativePath);

  return (
    scan.files.find((file) => file.kind === kind && getStem(file.relativePath) === selectedStem) ?? null
  );
}

async function createMarkdownForFile(rootPath: string, file: VaultFile): Promise<VaultFile> {
  const markdownRelativePath = replaceExtension(file.relativePath, ".md");
  const markdownAbsolutePath = resolveInsideVault(rootPath, markdownRelativePath);
  const title = basename(markdownRelativePath, ".md");

  await mkdir(dirname(markdownAbsolutePath), { recursive: true });

  if (!existsSync(markdownAbsolutePath)) {
    await writeFile(markdownAbsolutePath, `# ${title}\n\n`, "utf8");
  }

  return {
    id: markdownRelativePath,
    name: title,
    relativePath: markdownRelativePath,
    absolutePath: markdownAbsolutePath,
    extension: ".md",
    kind: "markdown",
    size: 0,
    updatedAt: Date.now()
  };
}

function createVaultState(rootPath: string, scan: VaultScanResult): VaultState {
  return {
    rootPath,
    scan
  };
}

function replaceExtension(relativePath: string, extension: ".md"): string {
  return `${relativePath.slice(0, relativePath.length - extname(relativePath).length)}${extension}`;
}

function getStem(relativePath: string): string {
  return replaceExtension(relativePath, ".md").toLowerCase();
}

function resolveInsideVault(rootPath: string, relativePath: string): string {
  const absolutePath = normalize(join(rootPath, relativePath));
  const backToRelative = relative(rootPath, absolutePath);

  if (backToRelative.startsWith("..") || backToRelative === "") {
    throw new Error("Path is outside the active Vault.");
  }

  return absolutePath;
}
