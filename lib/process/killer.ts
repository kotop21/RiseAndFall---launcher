import { exec } from "node:child_process";
import { promisify } from "node:util";
import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

export async function getProcessCpuUsage(pid: number): Promise<string> {
  if (process.platform !== "win32") return "";
  try {
    const { stdout } = await execAsync(`wmic process where ProcessId=${pid} get UserModeTime,KernelTime /Value`);
    return stdout.trim();
  } catch {
    return "";
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
