import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export async function openExplorer(targetPath: string): Promise<boolean> {
  const cleanPath = targetPath.trim();
  if (!cleanPath || !existsSync(cleanPath)) return false;

  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [cleanPath]]
      : process.platform === "win32"
        ? ["explorer", [cleanPath]]
        : ["xdg-open", [cleanPath]];

  return new Promise<boolean>((resolve) => {
    try {
      const proc = spawn(cmd, args, { stdio: "ignore", detached: true });
      let failed = false;

      proc.on("error", () => {
        failed = true;
        resolve(false);
      });

      proc.unref();
      setTimeout(() => {
        if (!failed) resolve(true);
      }, 100);
    } catch {
      resolve(false);
    }
  });
}
