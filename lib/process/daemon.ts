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
      if (!currentCpuSignature) return;

      if (currentCpuSignature === lastCpuSignature) {
        if (!freezeStartTime) {
          freezeStartTime = Date.now();
        } else if (Date.now() - freezeStartTime >= 5000) {
          terminatedDueToHang = true;
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
  } finally {
    cleanup();
    const elapsedSeconds = Math.max(1, Math.floor(Math.max(0, Date.now() - startTime) / 1000));
    const result: ProcessDaemonResult = {
      elapsedSeconds,
      elapsedMinutes: Math.max(1, Math.floor(elapsedSeconds / 60)),
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
