import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import type { VaultFile, VaultScanResult, VaultTreeNode } from "@shared/types/vault";

const supportedExtensions = new Set([".pdf", ".md"]);
const scanBatchSize = 64;

export async function scanVault(rootPath: string): Promise<VaultScanResult> {
  const rootStats = await stat(rootPath);

  if (!rootStats.isDirectory()) {
    throw new Error("Vault path must be a directory.");
  }

  const files = await collectVaultFiles(rootPath, rootPath);

  return {
    rootPath,
    files,
    tree: buildVaultTree(files),
    scannedAt: Date.now()
  };
}

async function collectVaultFiles(rootPath: string, currentPath: string): Promise<VaultFile[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: VaultFile[] = [];
  const fileTasks: Array<() => Promise<VaultFile | null>> = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const absolutePath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectVaultFiles(rootPath, absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = extname(entry.name).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      continue;
    }

    fileTasks.push(async () => {
      const fileStats = await stat(absolutePath);
      const relativePath = normalizeRelativePath(relative(rootPath, absolutePath));
      const typedExtension = extension as VaultFile["extension"];

      return {
        id: relativePath,
        name: basename(entry.name, extension),
        relativePath,
        absolutePath,
        extension: typedExtension,
        kind: typedExtension === ".pdf" ? "pdf" : "markdown",
        size: fileStats.size,
        updatedAt: fileStats.mtimeMs
      };
    });
  }

  files.push(...(await runInBatches(fileTasks, scanBatchSize)));
  return files.sort((first, second) => first.relativePath.localeCompare(second.relativePath));
}

async function runInBatches<T>(
  tasks: Array<() => Promise<T | null>>,
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];

  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map((task) => task()));

    for (const result of batchResults) {
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

export function buildVaultTree(files: VaultFile[]): VaultTreeNode[] {
  const root: VaultTreeNode[] = [];

  for (const file of files) {
    const parts = file.relativePath.split("/");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      if (isFile) {
        currentLevel.push({
          id: file.relativePath,
          name: file.name,
          relativePath: file.relativePath,
          kind: file.kind,
          file
        });
        return;
      }

      let directory = currentLevel.find(
        (node) => node.kind === "directory" && node.relativePath === currentPath
      );

      if (!directory) {
        directory = {
          id: currentPath,
          name: part,
          relativePath: currentPath,
          kind: "directory",
          children: []
        };
        currentLevel.push(directory);
      }

      currentLevel = directory.children ?? [];
    });
  }

  sortTree(root);
  return root;
}

function sortTree(nodes: VaultTreeNode[]): void {
  nodes.sort((first, second) => {
    if (first.kind === "directory" && second.kind !== "directory") {
      return -1;
    }

    if (first.kind !== "directory" && second.kind === "directory") {
      return 1;
    }

    return first.name.localeCompare(second.name);
  });

  nodes.forEach((node) => {
    if (node.children) {
      sortTree(node.children);
    }
  });
}

function normalizeRelativePath(path: string): string {
  return path.split(sep).join("/");
}
