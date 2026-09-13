import { spawn } from "node:child_process";

export async function openExplorer(targetPath: string): Promise<boolean> {
  const cleanPath = targetPath.trim();
  if (!cleanPath) {
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
      cmd = "explorer.exe";
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

      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
      proc.unref();
    } catch {
      resolve(false);
    }
  });
}
