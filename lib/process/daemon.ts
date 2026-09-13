import type { ChildProcess } from "node:child_process";
import { getProcessCpuUsage, killProcessTree } from "./killer";

export interface ProcessDaemonResult {
  elapsedSeconds: number;
  elapsedMinutes: number;
  terminatedDueToHang?: boolean;
}

export async function watchProcessDaemon(
  proc: ChildProcess,
  onFinish?: (res: ProcessDaemonResult) => void | Promise<void>,
): Promise<ProcessDaemonResult> {
  const startTime = Date.now();
  const pid = proc.pid;
  let terminatedDueToHang = false;

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let lastCpuSignature = "";
  let freezeStartTime: number | null = null;

  const cleanup = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  if (pid && pid > 0 && process.platform === "win32") {
    pollInterval = setInterval(async () => {
      if (proc.exitCode !== null) {
        cleanup();
        return;
      }

      const currentCpuSignature = await getProcessCpuUsage(pid);

      if (!currentCpuSignature) {
        return;
      }

      if (currentCpuSignature === lastCpuSignature) {
        if (!freezeStartTime) {
          freezeStartTime = Date.now();
        } else if (Date.now() - freezeStartTime >= 5000) {
          terminatedDueToHang = true;
          console.warn(
            `Daemon: Process [PID: ${pid}] frozen (CPU unresponsive) for 5s. Terminating...`,
          );
          cleanup();
          await killProcessTree(pid);
        }
      } else {
        lastCpuSignature = currentCpuSignature;
        freezeStartTime = null;
      }
    }, 2000);
  }

  try {
    await new Promise<void>((resolve) => {
      proc.once("close", () => resolve());
      proc.once("exit", () => resolve());
      proc.once("error", () => resolve());
    });
  } catch {
  } finally {
    cleanup();

    const endTime = Date.now();
    const elapsedMs = Math.max(0, endTime - startTime);
    const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
    const elapsedMinutes = Math.max(1, Math.floor(elapsedSeconds / 60));

    const result: ProcessDaemonResult = {
      elapsedSeconds,
      elapsedMinutes,
      terminatedDueToHang,
    };

    if (onFinish) {
      try {
        await onFinish(result);
      } catch {}
    }

    return result;
  }
}
