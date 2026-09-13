import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { watchProcessDaemon, type ProcessDaemonResult } from "./daemon";
import { isWindows } from "@/lib/utils/os";

export interface LaunchExeOptions {
  cwd?: string;
  args?: string[];
  rawArgs?: string;
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

export function sanitizeGameArgs(raw: string): string {
  if (!raw || !raw.trim()) return "";
  return raw.replace(/(?<!\\)\\"/g, '\\\\"');
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

  const trackSession = Boolean(options.trackSession);

  if (isWindows()) {
    try {
      const sourceArgs =
        options.rawArgs ?? (options.args ? options.args.join(" ") : "");
      const formattedArgs = sanitizeGameArgs(sourceArgs);

      const commandLine = formattedArgs
        ? `"${cleanExePath}" ${formattedArgs}`
        : `"${cleanExePath}"`;

      const proc = spawn(commandLine, {
        cwd: workingDir,
        stdio: "ignore",
        detached: true,
        shell: true,
        windowsVerbatimArguments: true,
      });

      if (trackSession) {
        watchProcessDaemon(proc, options.onSessionEnd).catch((err) => {
          console.error("Process: Daemon tracking error:", err);
        });
      } else {
        proc.unref();
      }

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
    const rawArgs = options.args ?? parseArgs(options.rawArgs ?? "");
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

    return {
      success: true,
      pid: proc.pid ?? 0,
      trackingSession: trackSession,
    };
  } catch (err) {
    return { success: false, error: "spawn_failed", details: String(err) };
  }
}

export function parseArgs(rawArgs: string): string[] {
  if (!rawArgs || !rawArgs.trim()) return [];
  const matches = rawArgs.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (!matches) return [];
  return matches.map((arg) => arg.replace(/^"|"$/g, ""));
}
