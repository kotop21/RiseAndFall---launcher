import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "@/lib/logger";

export function openExplorer(dirPath: string): boolean {
  let cleanPath = dirPath?.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleanPath) return false;

  if (!existsSync(cleanPath)) {
    logger.warn("explorer", `Failed opening folder, path does not exist: ${cleanPath}`);
    return false;
  }

  try {
    if (statSync(cleanPath).isFile()) {
      cleanPath = dirname(cleanPath);
    }
  } catch {
    // Continue with cleanPath if statSync fails
  }

  const platform = process.platform;
  let cmd = "xdg-open";
  let args = [cleanPath];

  if (platform === "win32") {
    cleanPath = cleanPath.replaceAll("/", "\\");
    // Strip trailing slashes unless it is a drive root like C:\
    if (cleanPath.length > 3 && cleanPath.endsWith("\\")) {
      cleanPath = cleanPath.replace(/\\+$/, "");
    }
    const winDir = process.env.WINDIR || process.env.SystemRoot || "C:\\Windows";
    const fullExplorerPath = `${winDir}\\explorer.exe`;
    cmd = existsSync(fullExplorerPath) ? fullExplorerPath : "explorer.exe";
    args = [cleanPath];
  } else if (platform === "darwin") {
    cmd = "open";
    args = [cleanPath];
  }

  try {
    const proc = spawn(cmd, args, { stdio: "ignore", detached: true });
    proc.on("error", (err) => {
      logger.error("explorer", `Failed opening folder ${cleanPath}:`, err);
    });
    proc.unref();
    return true;
  } catch (err) {
    logger.error("explorer", `Exception opening folder ${cleanPath}:`, err);
    return false;
  }
}
