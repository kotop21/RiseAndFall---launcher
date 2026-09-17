import { spawn } from "node:child_process";
import { logger } from "@/lib/logger";

export function openBrowser(url: string): boolean {
  const cleanUrl = url?.trim();
  if (!cleanUrl) return false;

  const platform = process.platform;
  let cmd = "xdg-open";
  let args = [cleanUrl];

  if (platform === "win32") {
    cmd = "cmd.exe";
    args = ["/c", "start", '""', cleanUrl];
  } else if (platform === "darwin") {
    cmd = "open";
    args = [cleanUrl];
  }

  try {
    const proc = spawn(cmd, args, { stdio: "ignore", detached: true });
    proc.on("error", (err) => {
      logger.error("browser", `Failed to open url ${cleanUrl}:`, err);
    });
    proc.unref();
    return true;
  } catch (err) {
    logger.error("browser", `Exception opening url ${cleanUrl}:`, err);
    return false;
  }
}
