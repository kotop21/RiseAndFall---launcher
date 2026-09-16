import { spawn } from "node:child_process";

export async function openBrowser(url: string): Promise<boolean> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return false;

  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [cleanUrl]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", cleanUrl]]
        : ["xdg-open", [cleanUrl]];

  return new Promise<boolean>((resolve) => {
    try {
      const proc = spawn(cmd, args, { stdio: "ignore", detached: true });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
      proc.unref();
    } catch {
      resolve(false);
    }
  });
}
