import type { ChildProcess } from "node:child_process";
import { logger } from "@/lib/logger";
import { isProcessAlive } from "./killer";

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

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  try {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      };

      proc.once("close", done);
      proc.once("exit", done);
      proc.once("error", (err) => {
        logger.error("daemon", `Process PID ${pid} emitted error event:`, err);
        done();
      });

      if (pid && pid > 0) {
        pollInterval = setInterval(() => {
          if (proc.exitCode !== null || proc.killed || !isProcessAlive(pid)) {
            done();
          }
        }, 2000);
      }
    });
  } catch (err) {
    logger.error("daemon", `Unexpected error waiting for process PID ${pid}:`, err);
  } finally {
    cleanup();
  }

  const elapsedSeconds = Math.max(1, Math.floor(Math.max(0, Date.now() - startTime) / 1000));
  const result: ProcessDaemonResult = {
    elapsedSeconds,
    elapsedMinutes: Math.max(1, Math.floor(elapsedSeconds / 60)),
    terminatedDueToHang: false,
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
