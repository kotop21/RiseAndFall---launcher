import { spawn } from "node:child_process";
import { createWriteStream, existsSync, readdirSync, statSync } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extractZip } from "@/lib/explorer/extract";
import type { ReleaseItem } from "@/lib/github/types";
import { logger } from "@/lib/logger";
import { setBackgroundActivity } from "@/lib/render/frame-loop";
import type { UpdateOptions, UpdateResult } from "./types";

export function isDevMode(): boolean {
  if (process.platform !== "win32") {
    return true;
  }
  const exec = process.execPath.toLowerCase();
  if (exec.includes("bun") || exec.includes("node")) {
    return true;
  }
  if (!exec.endsWith(".exe")) {
    return true;
  }
  const mainArg = process.argv[1] || "";
  if (mainArg.endsWith(".tsx") || mainArg.endsWith(".ts")) {
    return true;
  }
  return false;
}

export function resolveDownloadUrl(release: ReleaseItem): string | null {
  if (release.downloadUrl) {
    return release.downloadUrl;
  }

  if (release.assets && release.assets.length > 0) {
    const zipAsset = release.assets.find((a) => a.name.toLowerCase().endsWith(".zip"));
    if (zipAsset?.downloadUrl) return zipAsset.downloadUrl;

    const exeAsset = release.assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
    if (exeAsset?.downloadUrl) return exeAsset.downloadUrl;
  }

  const ver = release.version.trim();
  return `https://github.com/kotop21/RiseAndFall---launcher/releases/download/${ver}/RiseAndFall-launcher_${ver}.zip`;
}

function findExecutableInDir(dir: string): string | null {
  if (!existsSync(dir)) return null;

  const entries: string[] = [];
  function scan(current: string) {
    const items = readdirSync(current);
    for (const item of items) {
      const full = join(current, item);
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          scan(full);
        } else if (s.isFile() && item.toLowerCase().endsWith(".exe")) {
          entries.push(full);
        }
      } catch {}
    }
  }

  scan(dir);

  if (entries.length === 0) return null;

  // 1. Look for executable matching /launcher/i and not raf-settings
  const launcherExe = entries.find((path) => {
    const name = basename(path).toLowerCase();
    return name.includes("launcher") && !name.includes("settings");
  });
  if (launcherExe) return launcherExe;

  // 2. Look for riseandfall.exe (if launcher was named that)
  const rafExe = entries.find((path) => {
    const name = basename(path).toLowerCase();
    return name.includes("raf") && !name.includes("settings");
  });
  if (rafExe) return rafExe;

  // 3. Any exe that is not raf-settings, unins*, or vc_redist
  const fallbackExe = entries.find((path) => {
    const name = basename(path).toLowerCase();
    return !name.includes("settings") && !name.startsWith("unins") && !name.includes("redist");
  });

  return fallbackExe || entries[0] || null;
}

export async function downloadReleaseArchive(
  url: string,
  targetFilePath: string,
  options?: UpdateOptions,
): Promise<boolean> {
  const signal = options?.signal;
  const onProgress = options?.onProgress;

  logger.info("updater", `Starting download from: ${url}`);
  const res = await fetch(url, {
    signal,
    headers: {
      "User-Agent": "BunGpuix-Launcher",
      Accept: "application/octet-stream, */*",
    },
  });

  if (!res.ok) {
    logger.error("updater", `Download failed with HTTP ${res.status}`);
    return false;
  }

  if (!res.body) {
    logger.error("updater", "Response body is empty");
    return false;
  }

  const lenHeader = res.headers.get("content-length");
  const totalBytes = lenHeader ? parseInt(lenHeader, 10) : undefined;

  try {
    let bytesDownloaded = 0;
    let lastProgressUpdate = 0;

    const progressTransform = new Transform({
      transform(chunk: Buffer | Uint8Array, _encoding, callback) {
        bytesDownloaded += chunk.length;
        const now = Date.now();
        if (now - lastProgressUpdate > 100) {
          lastProgressUpdate = now;
          const percent = totalBytes
            ? Math.min(100, Math.round((bytesDownloaded / totalBytes) * 100))
            : undefined;

          onProgress?.({
            phase: "downloading",
            message: totalBytes
              ? `${(bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
              : `${(bytesDownloaded / 1024 / 1024).toFixed(1)} MB`,
            bytesDownloaded,
            totalBytes,
            percent,
          });
        }
        callback(null, chunk);
      },
    });

    const nodeReadable = Readable.fromWeb(
      res.body as unknown as Parameters<typeof Readable.fromWeb>[0],
    );
    const fileWriteStream = createWriteStream(targetFilePath, { highWaterMark: 64 * 1024 });

    await pipeline(nodeReadable, progressTransform, fileWriteStream, { signal });
    logger.info("updater", `Download finished (${bytesDownloaded} bytes)`);
    return true;
  } catch (err) {
    logger.error("updater", "Download error:", err);
    try {
      await rm(targetFilePath, { force: true });
    } catch {}
    return false;
  }
}

export async function updateLauncher(
  release: ReleaseItem,
  options?: UpdateOptions,
): Promise<UpdateResult> {
  setBackgroundActivity("launcher-update", true);
  try {
    return await doUpdateLauncher(release, options);
  } finally {
    setBackgroundActivity("launcher-update", false);
  }
}

async function doUpdateLauncher(
  release: ReleaseItem,
  options?: UpdateOptions,
): Promise<UpdateResult> {
  const onProgress = options?.onProgress;
  const signal = options?.signal;

  const downloadUrl = resolveDownloadUrl(release);
  if (!downloadUrl) {
    logger.error("updater", "Could not resolve download URL for release", release.version);
    return { success: false, error: "Download URL not available" };
  }

  const isZip = !downloadUrl.toLowerCase().endsWith(".exe");
  const tempDir = join(tmpdir(), `raf-launcher-update-${Date.now()}`);

  try {
    await mkdir(tempDir, { recursive: true });

    const archiveFileName = isZip ? "package.zip" : "launcher_new.exe";
    const archivePath = join(tempDir, archiveFileName);

    onProgress?.({
      phase: "downloading",
      message: "0%",
      percent: 0,
    });

    const downloaded = await downloadReleaseArchive(downloadUrl, archivePath, options);
    if (!downloaded || signal?.aborted) {
      return { success: false, error: "Download failed or aborted" };
    }

    onProgress?.({
      phase: "extracting",
      message: "Unpacking update...",
    });

    const stagingDir = join(tempDir, "staging");
    await mkdir(stagingDir, { recursive: true });

    if (isZip) {
      const extracted = await extractZip(archivePath, stagingDir);
      if (!extracted) {
        logger.error("updater", "Failed to extract update zip archive");
        return { success: false, error: "Failed extracting update archive" };
      }
    } else {
      // Direct exe downloaded
      const directTarget = join(stagingDir, "raf-launcher.exe");
      await copyFile(archivePath, directTarget);
    }

    // Determine payload root (handle if zip had a single enclosing folder)
    let payloadDir = stagingDir;
    try {
      const topItems = await readdir(stagingDir);
      if (topItems.length === 1) {
        const singleItemPath = join(stagingDir, topItems[0]);
        const s = await stat(singleItemPath);
        if (s.isDirectory()) {
          payloadDir = singleItemPath;
        }
      }
    } catch {}

    const newExeFullPath = findExecutableInDir(payloadDir);
    if (!newExeFullPath) {
      logger.error("updater", "No valid executable found in update payload");
      return { success: false, error: "No executable found in update archive" };
    }

    const newExeRelPath = relative(payloadDir, newExeFullPath);
    logger.info("updater", `Detected new executable: ${newExeRelPath} in ${payloadDir}`);

    // If running in dev mode or non-windows:
    if (isDevMode()) {
      logger.info(
        "updater",
        `Dev mode active. Update verified in staging: ${payloadDir} (Main exe: ${newExeRelPath})`,
      );
      onProgress?.({
        phase: "completed",
        message: "Dev test completed",
      });
      return {
        success: true,
        isDev: true,
        stagedDir: payloadDir,
      };
    }

    // Production Windows update
    onProgress?.({
      phase: "applying",
      message: "Applying update...",
    });

    const currentExePath = process.execPath;
    const currentLauncherDir = dirname(currentExePath);
    const newExeDestPath = join(currentLauncherDir, newExeRelPath);

    // Create the batch update runner
    const batPath = join(tempDir, "apply_update.bat");
    const batContent = `@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

set OLD_PID=%~1
set STAGING_DIR=%~2
set TARGET_DIR=%~3
set NEW_EXE=%~4
set OLD_EXE=%~5

:WAIT_LOOP
timeout /t 1 /nobreak > nul
tasklist /FI "PID eq !OLD_PID!" 2>nul | findstr /i "!OLD_PID!" > nul
if !ERRORLEVEL! equ 0 (
    goto WAIT_LOOP
)

timeout /t 1 /nobreak > nul

if not "!OLD_EXE!"=="" (
    if not "!OLD_EXE!"=="!NEW_EXE!" (
        if exist "!OLD_EXE!" del /f /q "!OLD_EXE!" > nul 2>&1
    )
)

if exist "!TARGET_DIR!\\_internal" (
    rmdir /s /q "!TARGET_DIR!\\_internal" > nul 2>&1
)

xcopy "!STAGING_DIR!\\*" "!TARGET_DIR!\\" /E /Y /H /R /Q > nul 2>&1

start "" "!NEW_EXE!"

timeout /t 2 /nobreak > nul
rmdir /s /q "!STAGING_DIR!" > nul 2>&1
(goto) 2>nul & del "%~f0"
`;

    await writeFile(batPath, batContent, "utf-8");

    logger.info("updater", `Launching update helper script: ${batPath}`);
    const proc = spawn(
      "cmd.exe",
      [
        "/c",
        batPath,
        String(process.pid),
        payloadDir,
        currentLauncherDir,
        newExeDestPath,
        currentExePath,
      ],
      {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );

    proc.unref();

    setTimeout(() => {
      process.exit(0);
    }, 200);

    return { success: true, isDev: false };
  } catch (err) {
    logger.error("updater", "Error applying launcher update:", err);
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
