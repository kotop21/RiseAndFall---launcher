import type { ChildProcess } from "node:child_process";

export interface ProcessDaemonResult {
  elapsedSeconds: number;
  elapsedMinutes: number;
}

export async function watchProcessDaemon(
  proc: ChildProcess,
  onFinish?: (res: ProcessDaemonResult) => void | Promise<void>,
): Promise<ProcessDaemonResult> {
  const startTime = Date.now();
  console.log(
    `Daemon: Attached to process [PID: ${proc.pid}]. Tracking session...`,
  );

  try {
    await new Promise<void>((resolve) => {
      proc.once("close", () => resolve());
      proc.once("exit", () => resolve());
      proc.once("error", () => resolve());
    });
  } catch (err) {
    console.error(`Daemon: Process exit wait failed [PID: ${proc.pid}]:`, err);
  } finally {
    const endTime = Date.now();
    const elapsedMs = Math.max(0, endTime - startTime);
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    console.log(
      `Daemon: Process [PID: ${proc.pid}] exited. Active time: ${elapsedMinutes}m (${elapsedSeconds}s)`,
    );

    const result: ProcessDaemonResult = {
      elapsedSeconds,
      elapsedMinutes,
    };

    if (onFinish) {
      try {
        await onFinish(result);
      } catch (finishErr) {
        console.error("Daemon: onFinish callback execution failed:", finishErr);
      }
    }

    return result;
  }
}
