import { spawn } from "node:child_process";
import { logger } from "@/lib/logger";

export function openExplorer(dirPath: string): boolean {
  const cleanPath = dirPath?.trim();
  if (!cleanPath) return false;

  const platform = process.platform;
  let cmd = "xdg-open";
  let args = [cleanPath];

  if (platform === "win32") {
    cmd = "explorer.exe";
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
