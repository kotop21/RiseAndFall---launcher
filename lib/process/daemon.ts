import type { ChildProcess } from "node:child_process";
import { getProcessCpuUsage, killProcessTree } from "./killer";
import { logger } from "@/lib/logger";

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
      try {
        if (proc.exitCode !== null || proc.killed) {
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
            logger.info("daemon", `Process PID ${pid} hung detected. Terminating process tree...`);
            await killProcessTree(pid);
          }
        } else {
          lastCpuSignature = currentCpuSignature;
          freezeStartTime = null;
        }
      } catch (err) {
        logger.error("daemon", `Poll interval error for PID ${pid}:`, err);
      }
    }, 2000);
  }

  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      proc.once("close", done);
      proc.once("exit", done);
      proc.once("error", (err) => {
        logger.error("daemon", `Process PID ${pid} emitted error event:`, err);
        done();
      });
    });
  } catch (err) {
    logger.error("daemon", `Unexpected error waiting for process PID ${pid}:`, err);
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
      } catch (err) {
        logger.error("daemon", "Error in onFinish callback:", err);
      }
    }

    return result;
  }
}
