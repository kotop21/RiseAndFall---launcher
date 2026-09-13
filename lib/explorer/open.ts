import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export async function openExplorer(targetPath: string): Promise<boolean> {
  const cleanPath = targetPath.trim();
  if (!cleanPath || !existsSync(cleanPath)) {
    return false;
  }

  let cmd: string;
  let args: string[];

  switch (process.platform) {
    case "darwin":
      cmd = "open";
      args = [cleanPath];
      break;
    case "win32":
      cmd = "explorer";
      args = [cleanPath];
      break;
    default:
      cmd = "xdg-open";
      args = [cleanPath];
      break;
  }

  return new Promise<boolean>((resolve) => {
    try {
      const proc = spawn(cmd, args, {
        stdio: "ignore",
        detached: true,
      });

      let hasError = false;

      proc.on("error", () => {
        hasError = true;
        resolve(false);
      });

      proc.unref();

      setTimeout(() => {
        if (!hasError) {
          resolve(true);
        }
      }, 100);
    } catch {
      resolve(false);
    }
  });
}
