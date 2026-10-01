import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { unpack } from "msgpackr";
import {
  downloadFromMirrors,
  fetchManifest,
  formatSpeed,
  type ManifestPackage,
  type ManifestResponse,
} from "@/lib/api";
import { getConfigPath } from "@/lib/config/dir";
import { DEFAULT_CONFIG } from "@/lib/config/init";
import { migrateConfig } from "@/lib/config/migrate";
import { saveConfig } from "@/lib/config/save";
import type { LauncherConfig } from "@/lib/config/types";
import { createLauncherError, type LauncherAppError, normalizeError } from "@/lib/errors";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import { ensureDirectory } from "@/lib/explorer/create";
import { extractZip } from "@/lib/explorer/extract";
import { getCurrentLanguage, getTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { setBackgroundActivity } from "@/lib/render/frame-loop";

export * from "./install-manager";
export { formatSpeed };

export type InstallStatus = "idle" | "downloading" | "extracting" | "completed" | "error";

export interface InstallProgress {
  status: InstallStatus;
  message: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
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
  setBackgroundActivity("install-game", true);
  try {
    return await doInstallGamePackage({
      targetDir,
      lang,
      cleanBeforeInstall,
      signal,
      onProgress,
    });
  } finally {
    setBackgroundActivity("install-game", false);
  }
}

async function doInstallGamePackage({
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

  logger.info("install", "Fetching installation manifest...");
  onProgress?.({
    status: "downloading",
    message: getTranslation(currentLang, "install.fetchingManifest"),
  });

  let manifest: ManifestResponse;
  try {
    manifest = await fetchManifest(signal);
  } catch (err: unknown) {
    const normalized = normalizeError(err, "MANIFEST_FAILED");
    logger.error("install", "Failed to fetch installation manifest:", normalized);
    onProgress?.({ status: "error", message: normalized.description });
    return {
      success: false,
      error: createLauncherError(normalized.code, normalized.description, err),
    };
  }

  // Queue ordering:
  // 1) id === "game"
  // 2) id === `lang_${lang}`
  // 3) id === "mod_bfm"
  const targetIds = ["game", `lang_${lang}`, "mod_bfm"];
  const packages: ManifestPackage[] = [];
  for (const id of targetIds) {
    const pkg = manifest.packages.find((p) => p.id === id);
    if (pkg) {
      packages.push(pkg);
    }
  }

  if (packages.length === 0 || !packages.some((p) => p.id === "game")) {
    const err = createLauncherError(
      "MANIFEST_FAILED",
      "Manifest is missing the required base game package ('game')",
    );
    logger.error("install", err.description);
    onProgress?.({ status: "error", message: err.description });
    return { success: false, error: err };
  }

  let cumulativeBytes = 0;

  for (let i = 0; i < packages.length; i++) {
    if (signal?.aborted) {
      try {
        await cleanGameDirectory(cleanDir);
      } catch {}
      return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
    }

    const pkg = packages[i];
    const stepLabel = `[${i + 1}/${packages.length}] ${pkg.name}`;

    logger.info("install", `Starting package download: ${pkg.name} (${pkg.id})`);

    onProgress?.({
      status: "downloading",
      message: getTranslation(currentLang, "install.connecting").replace("{step}", stepLabel),
      bytesDownloaded: cumulativeBytes,
    });

    const tempArchivePath = join(cleanDir, `pkg_${pkg.id}_${Date.now()}.zip`);

    try {
      const dlRes = await downloadFromMirrors(pkg.mirrors, tempArchivePath, {
        signal,
        onProgress: (p) => {
          const currentMB = (p.bytesDownloaded / 1024 / 1024).toFixed(1);
          const speedStr = formatSpeed(p.bytesPerSecond ?? 0);
          const sizeStr =
            p.totalBytes && p.totalBytes > 0
              ? `${currentMB} / ${(p.totalBytes / 1024 / 1024).toFixed(1)} MB`
              : `${currentMB} MB`;

          onProgress?.({
            status: "downloading",
            message: `${stepLabel}: ${sizeStr} (${speedStr})`,
            bytesDownloaded: cumulativeBytes + p.bytesDownloaded,
            totalBytes: p.totalBytes,
            bytesPerSecond: p.bytesPerSecond,
          });
        },
      });

      cumulativeBytes += dlRes.bytesDownloaded;
    } catch (err: unknown) {
      try {
        await unlink(tempArchivePath);
      } catch {}

      if (signal?.aborted) {
        try {
          await cleanGameDirectory(cleanDir);
        } catch {}
        return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
      }

      logger.error("install", `All mirrors failed for package ${pkg.id}`, {
        mirrors: pkg.mirrors,
      });

      const normalized = normalizeError(err, "DOWNLOAD_FAILED");
      const launchErr = createLauncherError(normalized.code, normalized.description, err);
      onProgress?.({ status: "error", message: launchErr.description });
      return { success: false, error: launchErr };
    }

    if (signal?.aborted) {
      try {
        await unlink(tempArchivePath);
        await cleanGameDirectory(cleanDir);
      } catch {}
      return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
    }

    onProgress?.({
      status: "extracting",
      message: getTranslation(currentLang, "install.extracting").replace("{step}", stepLabel),
      bytesDownloaded: cumulativeBytes,
    });

    try {
      if (!(await extractZip(tempArchivePath, cleanDir))) {
        throw createLauncherError("EXTRACTION_FAILED");
      }
      logger.info("install", `Package extracted successfully: ${pkg.name} (${pkg.id})`);
    } catch (err: unknown) {
      try {
        await unlink(tempArchivePath);
      } catch {}

      const normalized = normalizeError(err, "EXTRACTION_FAILED");
      logger.error("install", `Error while extracting package ${pkg.id}:`, normalized);

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
      const data = (unpack(raw) || {}) as Record<string, unknown>;
      currentCfg = migrateConfig(data).config;
    } catch (err) {
      logger.error("install", "Failed reading current config for update:", err);
    }
  }

  const activeId = currentCfg.activeProfileId || "slot-1";
  const updatedProfiles = (currentCfg.gameProfiles || DEFAULT_CONFIG.gameProfiles).map((p) =>
    p.id === activeId ? { ...p, path: cleanDir } : p,
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
