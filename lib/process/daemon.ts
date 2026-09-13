import type { ChildProcess } from "node:child_process";
import { isProcessNotResponding, killProcessTree } from "./killer";

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
  let hangStartTime: number | null = null;

  const cleanup = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  if (pid && pid > 0 && process.platform === "win32") {
    pollInterval = setInterval(async () => {
      const hanging = await isProcessNotResponding(pid);

      if (hanging) {
        if (!hangStartTime) {
          hangStartTime = Date.now();
        } else if (Date.now() - hangStartTime >= 5000) {
          terminatedDueToHang = true;
          console.warn(
            `Daemon: Process [PID: ${pid}] not responding for 5s. Terminating forcefully...`,
          );
          cleanup();
          await killProcessTree(pid);
        }
      } else {
        hangStartTime = null;
      }
    }, 2500);
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
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

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
