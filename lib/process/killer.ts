import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function isProcessNotResponding(pid: number): Promise<boolean> {
  if (process.platform !== "win32") return false;
  try {
    const { stdout } = await execAsync(
      `tasklist /FI "PID eq ${pid}" /FI "STATUS eq NOT RESPONDING" /FO CSV /NH`,
    );
    const trimmed = stdout.trim();
    return trimmed.length > 0 && trimmed.includes(String(pid));
  } catch {
    return false;
  }
}

export async function killProcessTree(pid: number): Promise<void> {
  try {
    if (process.platform === "win32") {
      await execAsync(`taskkill /F /T /PID ${pid}`);
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {}
}
