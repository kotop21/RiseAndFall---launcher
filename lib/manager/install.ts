import { join } from "node:path";
import { unlink, readFile, open } from "node:fs/promises";
import { existsSync } from "node:fs";
import { unpack } from "msgpackr";
import { downloadSingleFileStream } from "@/lib/api/download";
import { ensureDirectory } from "@/lib/explorer/create";
import { extractZip } from "@/lib/explorer/extract";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import { getConfigPath } from "@/lib/config/dir";
import { saveConfig } from "@/lib/config/save";
import { DEFAULT_CONFIG } from "@/lib/config/init";
import { migrateConfig } from "@/lib/config/migrate";
import type { LauncherConfig } from "@/lib/config/types";
import { createLauncherError, normalizeError, type LauncherAppError } from "@/lib/errors";
import { getCurrentLanguage, getTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";

export type InstallStatus = "idle" | "downloading" | "extracting" | "completed" | "error";

export interface InstallProgress {
  status: InstallStatus;
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
}

export interface InstallGameOptions {
  targetDir: string;
  lang: "en" | "ru";
  cleanBeforeInstall?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: InstallProgress) => void;
}

export async function installGamePackage({
  targetDir,
  lang,
  cleanBeforeInstall = false,
  signal,
  onProgress,
}: InstallGameOptions): Promise<{
  success: boolean;
  config?: LauncherConfig;
  error?: LauncherAppError;
}> {
  const currentLang = getCurrentLanguage();
  const cleanDir = targetDir.trim();
  if (!cleanDir) {
    logger.error("install", "Target directory is empty");
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_REQUIRED"),
    };
  }

  if (!(await ensureDirectory(cleanDir))) {
    logger.error("install", `Target directory is invalid or inaccessible: ${cleanDir}`);
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_INVALID"),
    };
  }

  if (cleanBeforeInstall) {
    onProgress?.({
      status: "extracting",
      message: getTranslation(currentLang, "install.cleaningOld"),
    });
    if (!(await cleanGameDirectory(cleanDir))) {
      logger.error("install", `Failed cleaning directory: ${cleanDir}`);
      const isRuOrUa = currentLang === "ru" || currentLang === "ua";
      const desc = isRuOrUa
        ? "Не удалось очистить папку. Закройте игру и другие программы."
        : "Failed cleaning folder. Ensure the game is closed and try again.";
      return {
        success: false,
        error: createLauncherError("FS_ACCESS_DENIED", desc),
      };
    }
  }

  const packages = [
    { key: "game", label: getTranslation(currentLang, "install.pkgBaseGame") },
    {
      key: `lang:${lang}`,
      label: getTranslation(currentLang, "install.pkgLangPack").replace("{lang}", lang.toUpperCase()),
    },
    { key: "mod:bfm", label: getTranslation(currentLang, "install.pkgModBfm") },
  ];

  let cumulativeBytes = 0;

  for (let i = 0; i < packages.length; i++) {
    if (signal?.aborted) {
      try {
        await cleanGameDirectory(cleanDir);
      } catch {}
      return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
    }

    const pkg = packages[i];
    const stepLabel = `[${i + 1}/${packages.length}] ${pkg.label}`;

    onProgress?.({
      status: "downloading",
      message: getTranslation(currentLang, "install.connecting").replace("{step}", stepLabel),
      bytesDownloaded: cumulativeBytes,
    });

    const streamRes = await downloadSingleFileStream(pkg.key, signal);
    if (!streamRes.ok || !streamRes.stream) {
      const err = streamRes.error ?? createLauncherError("DOWNLOAD_FAILED");
      logger.error("install", `Package download stream failed for ${pkg.key}:`, err);
      onProgress?.({ status: "error", message: err.description });
      return { success: false, error: err };
    }

    const currentFileTotal = streamRes.totalBytes || 0;
    const tempArchivePath = join(cleanDir, `pkg_${i}_${Date.now()}.zip`);

    let fileHandle = null;
    let reader = null;

    try {
      fileHandle = await open(tempArchivePath, "w");
      reader = streamRes.stream.getReader();

      let stepBytes = 0;
      let lastProgressUpdate = Date.now();

      while (true) {
        if (signal?.aborted) throw createLauncherError("INSTALL_CANCELLED");

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          await fileHandle.write(value);
          stepBytes += value.length;

          const now = Date.now();
          if (now - lastProgressUpdate > 150) {
            lastProgressUpdate = now;
            const currentMB = (stepBytes / 1024 / 1024).toFixed(1);
            const totalMB = currentFileTotal > 0 ? `${(currentFileTotal / 1024 / 1024).toFixed(1)} MB` : "Unknown";

            onProgress?.({
              status: "downloading",
              message: `${stepLabel}: ${currentMB} / ${totalMB}`,
              bytesDownloaded: cumulativeBytes + stepBytes,
              totalBytes: currentFileTotal,
            });

            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }

      await fileHandle.close();
      fileHandle = null;

      cumulativeBytes += stepBytes;

      if (signal?.aborted) throw createLauncherError("INSTALL_CANCELLED");

      onProgress?.({
        status: "extracting",
        message: getTranslation(currentLang, "install.extracting").replace("{step}", stepLabel),
        bytesDownloaded: cumulativeBytes,
      });

      if (!(await extractZip(tempArchivePath, cleanDir))) {
        throw createLauncherError("EXTRACTION_FAILED");
      }
    } catch (err: unknown) {
      if (reader) {
        try {
          await reader.cancel();
        } catch {}
      }

      if (fileHandle) {
        try {
          await fileHandle.close();
        } catch {}
      }

      try {
        await unlink(tempArchivePath);
      } catch {}

      const normalized = normalizeError(err, "EXTRACTION_FAILED");
      logger.error("install", `Error while processing package ${pkg.key}:`, normalized);

      if (normalized.code === "INSTALL_CANCELLED" || signal?.aborted) {
        try {
          await cleanGameDirectory(cleanDir);
        } catch {}
        return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
      }

      const launchErr = createLauncherError(normalized.code, undefined, err);
      onProgress?.({ status: "error", message: launchErr.description });
      return { success: false, error: launchErr };
    } finally {
      if (fileHandle) {
        try {
          await fileHandle.close();
        } catch {}
      }
      try {
        await unlink(tempArchivePath);
      } catch {}
    }
  }

  let currentCfg: LauncherConfig = { ...DEFAULT_CONFIG };
  const cfgPath = getConfigPath();
  if (existsSync(cfgPath)) {
    try {
      const raw = await readFile(cfgPath);
      const data = (unpack(raw) || {}) as Record<string, any>;
      currentCfg = migrateConfig(data).config;
    } catch (err) {
      logger.error("install", "Failed reading current config for update:", err);
    }
  }

  const activeId = currentCfg.activeProfileId || "slot-1";
  const updatedProfiles = (currentCfg.gameProfiles || DEFAULT_CONFIG.gameProfiles).map((p) =>
    p.id === activeId ? { ...p, path: cleanDir } : p
  );

  const updatedConfig: LauncherConfig = {
    ...currentCfg,
    gameDir: cleanDir,
    gameProfiles: updatedProfiles,
    launcherLang: currentLang,
  };

  try {
    await saveConfig(updatedConfig);
  } catch (err) {
    logger.error("install", "Failed saving updated config after install:", err);
  }

  onProgress?.({
    status: "completed",
    message: getTranslation(currentLang, "install.completed"),
    bytesDownloaded: cumulativeBytes,
  });

  logger.info("install", `Game package installed successfully to: ${cleanDir}`);
  return { success: true, config: updatedConfig };
}
