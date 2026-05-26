import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";

export type LogLevel = "info" | "warn" | "error";

export async function writeLog(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const logsDir = join(app.getPath("userData"), "logs");
    await mkdir(logsDir, { recursive: true });
    await appendFile(join(logsDir, "watercourse.log"), `${formatLine(level, message, details)}\n`);
  } catch {
    // Logging must never interrupt source-file scanning or editor persistence.
  }
}

export function writeLogSync(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>
): void {
  void writeLog(level, message, details);
}

function formatLine(
  level: LogLevel,
  message: string,
  details?: Record<string, unknown>
): string {
  return JSON.stringify({
    at: new Date().toISOString(),
    level,
    message,
    details: details ? sanitizeDetails(details) : undefined
  });
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value
    ])
  );
}
