import { exec } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

export function isProcessAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

export async function killProcessTree(pid: number): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await execAsync(`taskkill /F /T /PID ${pid}`);
    } else {
      process.kill(pid, "SIGKILL");
    }
    logger.info("killer", `Terminated process tree PID: ${pid}`);
    return true;
  } catch (err) {
    logger.error("killer", `Failed terminating process tree PID: ${pid}`, err);
    return false;
  }
}
