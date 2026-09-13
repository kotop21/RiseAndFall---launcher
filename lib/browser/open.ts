import { spawn } from "node:child_process";

export async function openBrowser(url: string): Promise<boolean> {
  let cmd: string;
  let args: string[];

  switch (process.platform) {
    case "darwin":
      cmd = "open";
      args = [url];
      break;
    case "win32":
      cmd = "cmd";
      args = ["/c", "start", "", url];
      break;
    default:
      cmd = "xdg-open";
      args = [url];
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
