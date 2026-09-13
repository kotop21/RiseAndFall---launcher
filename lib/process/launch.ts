import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { watchProcessDaemon, type ProcessDaemonResult } from "./daemon";
import { isWindows } from "@/lib/utils/os";

export interface LaunchExeOptions {
  cwd?: string;
  args?: string[];
  trackSession?: boolean;
  onSessionEnd?: (res: ProcessDaemonResult) => void | Promise<void>;
}

export type LaunchResult =
  | { success: true; pid: number; trackingSession: boolean }
  | {
      success: false;
      error: "unsupported_os" | "file_not_found" | "spawn_failed";
      details?: string;
    };

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function launchExe(
  exePath?: string | null,
  options: LaunchExeOptions = {},
): Promise<LaunchResult> {
  const cleanExePath = exePath?.trim();

  if (!cleanExePath) {
    console.error("Process: Executable path is empty or undefined.");
    return { success: false, error: "file_not_found" };
  }

  const exists = await checkFileExists(cleanExePath);

  if (!exists) {
    console.error(`Process: Target executable not found at: ${cleanExePath}`);
    return { success: false, error: "file_not_found" };
  }

  const workingDir =
    options.cwd ??
    cleanExePath.substring(
      0,
      Math.max(cleanExePath.lastIndexOf("/"), cleanExePath.lastIndexOf("\\")),
    );
  const rawArgs = options.args ?? [];
  const trackSession = Boolean(options.trackSession);

  if (isWindows()) {
    try {
      const proc = spawn(cleanExePath, rawArgs, {
        cwd: workingDir,
        stdio: "ignore",
        detached: true,
      });

      if (trackSession) {
        watchProcessDaemon(proc, options.onSessionEnd).catch((err) => {
          console.error("Process: Daemon tracking error:", err);
        });
      } else {
        proc.unref();
      }

      console.log(
        `Process: Successfully launched ${cleanExePath} [PID: ${proc.pid}]`,
      );
      return {
        success: true,
        pid: proc.pid ?? 0,
        trackingSession: trackSession,
      };
    } catch (err) {
      console.error("Process: Failed to spawn Windows executable:", err);
      return { success: false, error: "spawn_failed", details: String(err) };
    }
  }

  try {
    const proc = spawn("wine", [cleanExePath, ...rawArgs], {
      cwd: workingDir,
      stdio: "ignore",
      detached: true,
    });

    let hasSpawnError = false;
    await new Promise<void>((resolve) => {
      proc.once("error", (err: any) => {
        if (err?.code === "ENOENT") {
          hasSpawnError = true;
        }
        resolve();
      });
      setTimeout(resolve, 50);
    });

    if (hasSpawnError) {
      console.error("Process: Wine is not installed or not in PATH.");
      return {
        success: false,
        error: "unsupported_os",
        details: "Direct .exe execution requires Windows or Wine.",
      };
    }

    if (trackSession) {
      watchProcessDaemon(proc, options.onSessionEnd).catch((err) => {
        console.error("Process: Daemon tracking error:", err);
      });
    } else {
      proc.unref();
    }

    console.log(`Process: Spawned via Wine [PID: ${proc.pid}]`);
    return {
      success: true,
      pid: proc.pid ?? 0,
      trackingSession: trackSession,
    };
  } catch (err) {
    console.error("Process: Wine spawn failed:", err);
    return { success: false, error: "spawn_failed", details: String(err) };
  }
}

export function parseArgs(rawArgs: string): string[] {
  if (!rawArgs || !rawArgs.trim()) return [];
  const matches = rawArgs.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (!matches) return [];
  return matches.map((arg) => arg.replace(/^"|"$/g, ""));
}
