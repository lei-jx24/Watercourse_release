import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";

type Settings = {
  vaultPath: string | null;
};

const defaultSettings: Settings = {
  vaultPath: null
};

function getSettingsPath(): string {
  return join(app.getPath("userData"), "settings.json");
}

export async function readSettings(): Promise<Settings> {
  try {
    const content = await readFile(getSettingsPath(), "utf8");
    return { ...defaultSettings, ...JSON.parse(content) };
  } catch {
    return defaultSettings;
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  const settingsPath = getSettingsPath();
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function getSavedVaultPath(): Promise<string | null> {
  const settings = await readSettings();
  return settings.vaultPath;
}

export async function saveVaultPath(vaultPath: string): Promise<void> {
  await writeSettings({ vaultPath });
}
