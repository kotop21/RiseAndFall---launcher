import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname } from "node:path";
import { watchProcessDaemon, type ProcessDaemonResult } from "./daemon";
import { isWindows } from "@/lib/utils/os";
import { createLauncherError, LauncherAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface LaunchExeOptions {
  cwd?: string;
  args?: string[];
  rawArgs?: string;
  trackSession?: boolean;
  onSessionEnd?: (res: ProcessDaemonResult) => void | Promise<void>;
}

export type LaunchResult =
  | { success: true; pid: number; trackingSession: boolean }
  | { success: false; error: LauncherAppError };

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeGameArgs(raw: string): string {
  return raw && raw.trim() ? raw.replace(/(?<!\\)"/g, '\\"') : "";
}

export function parseArgs(rawArgs: string): string[] {
  if (!rawArgs || !rawArgs.trim()) return [];
  const matches = rawArgs.match(/(?:[^\s"]+|"[^"]*")+/g);
  return matches ? matches.map((arg) => arg.replace(/^"|"$/g, "")) : [];
}

export async function launchExe(
  exePath?: string | null,
  options: LaunchExeOptions = {},
): Promise<LaunchResult> {
  const cleanExePath = exePath?.trim();

  if (!cleanExePath) {
    logger.error("launch", "Executable path is empty");
    return {
      success: false,
      error: createLauncherError("GAME_EXE_NOT_FOUND", "Executable path is empty or undefined."),
    };
  }

  if (!(await checkFileExists(cleanExePath))) {
    logger.error("launch", `File not found at: ${cleanExePath}`);
    return {
      success: false,
      error: createLauncherError("GAME_EXE_NOT_FOUND", `File not found at: ${cleanExePath}`),
    };
  }

  const workingDir = options.cwd ?? dirname(cleanExePath);
  const trackSession = Boolean(options.trackSession);

  if (isWindows()) {
    try {
      const sourceArgs = options.rawArgs ?? (options.args ? options.args.join(" ") : "");
      const formattedArgs = sanitizeGameArgs(sourceArgs);
      const commandLine = formattedArgs ? `"${cleanExePath}" ${formattedArgs}` : `"${cleanExePath}"`;

      const proc = spawn(commandLine, {
        cwd: workingDir,
        stdio: "ignore",
        detached: true,
        shell: true,
        windowsVerbatimArguments: true,
      });

      proc.on("error", (err) => {
        logger.error("launch", "Windows process error event:", err);
      });

      if (!proc.pid) {
        logger.error("launch", "Windows process spawned with invalid PID");
        return {
          success: false,
          error: createLauncherError("PROCESS_SPAWN_FAILED", "Windows process spawned with an invalid PID."),
        };
      }

      if (trackSession) {
        watchProcessDaemon(proc, options.onSessionEnd).catch((err) => {
          logger.error("launch", "Daemon tracking error:", err);
        });
      } else {
        proc.unref();
      }

      logger.info("launch", `Started game process PID: ${proc.pid}`);
      return {
        success: true,
        pid: proc.pid,
        trackingSession: trackSession,
      };
    } catch (err) {
      logger.error("launch", "Failed executing game via Windows shell:", err);
      return {
        success: false,
        error: createLauncherError("PROCESS_SPAWN_FAILED", String(err), err),
      };
    }
  }

  try {
    const rawArgs = options.args ?? parseArgs(options.rawArgs ?? "");
    const proc = spawn("wine", [cleanExePath, ...rawArgs], {
      cwd: workingDir,
      stdio: "ignore",
      detached: true,
    });

    let spawnErr: unknown = null;
    await new Promise<void>((resolve) => {
      proc.once("error", (err: any) => {
        spawnErr = err;
        resolve();
      });
      setTimeout(resolve, 80);
    });

    if (spawnErr) {
      logger.error("launch", "Wine execution failed:", spawnErr);
      return {
        success: false,
        error: createLauncherError(
          "UNSUPPORTED_OS",
          "Wine executable was not found. Direct execution requires Windows or Wine installed in PATH.",
          spawnErr,
        ),
      };
    }

    if (trackSession) {
      watchProcessDaemon(proc, options.onSessionEnd).catch((err) => {
        logger.error("launch", "Daemon tracking error:", err);
      });
    } else {
      proc.unref();
    }

    logger.info("launch", `Started Wine process PID: ${proc.pid ?? 0}`);
    return {
      success: true,
      pid: proc.pid ?? 0,
      trackingSession: trackSession,
    };
  } catch (err) {
    logger.error("launch", "Unexpected error launching executable:", err);
    return {
      success: false,
      error: createLauncherError("PROCESS_SPAWN_FAILED", String(err), err),
    };
  }
}
