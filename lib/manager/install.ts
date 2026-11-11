import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { unpack } from "msgpackr";
import {
  downloadFromMirrors,
  fetchManifest,
  formatSpeed,
  getInstallPackageQueue,
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
import { recordInstalledFiles, scanFileStats } from "./install-manifest";
import { ensureInstallDir } from "./install-path";
import { recordInstalledMod } from "./mods-storage";

export * from "./install-manager";
export * from "./install-manifest";
export * from "./install-path";
export * from "./launcher-storage";
export * from "./mod-service";
export * from "./mods-storage";
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
  lang: string;
  cleanBeforeInstall?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: InstallProgress) => void;
  manifest?: ManifestResponse;
}

export async function installGamePackage({
  targetDir,
  lang,
  cleanBeforeInstall = false,
  signal,
  onProgress,
  manifest,
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
      manifest,
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
  manifest: preloadedManifest,
}: InstallGameOptions): Promise<{
  success: boolean;
  config?: LauncherConfig;
  error?: LauncherAppError;
}> {
  const currentLang = getCurrentLanguage();
  const rawDir = targetDir.trim();
  if (!rawDir) {
    logger.error("install", "Target directory is empty");
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_REQUIRED"),
    };
  }

  const cleanDir = ensureInstallDir(rawDir);

  if (!(await ensureDirectory(cleanDir))) {
    logger.error("install", `Target directory is invalid or inaccessible: ${cleanDir}`);
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_INVALID"),
    };
  }

  try {
    let currentCfg: LauncherConfig = { ...DEFAULT_CONFIG };
    const cfgPath = getConfigPath();
    if (existsSync(cfgPath)) {
      const raw = await readFile(cfgPath);
      const data = (unpack(raw) || {}) as Record<string, unknown>;
      currentCfg = migrateConfig(data).config;
    }
    const activeId = currentCfg.activeProfileId || "slot-1";
    const updatedProfiles = (currentCfg.gameProfiles || DEFAULT_CONFIG.gameProfiles).map((p) =>
      p.id === activeId ? { ...p, path: cleanDir } : p,
    );
    await saveConfig({
      ...currentCfg,
      gameDir: cleanDir,
      gameProfiles: updatedProfiles,
      launcherLang: currentLang,
    });
  } catch (cfgErr) {
    logger.warn("install", "Failed persisting targetDir to config before install:", cfgErr);
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

  const initialUserFiles = await scanFileStats(cleanDir);

  let manifest: ManifestResponse;
  if (
    preloadedManifest &&
    Array.isArray(preloadedManifest.packages) &&
    preloadedManifest.packages.length > 0
  ) {
    logger.info("install", "Using pre-cached installation manifest");
    manifest = preloadedManifest;
  } else {
    logger.info("install", "Fetching installation manifest...");
    onProgress?.({
      status: "downloading",
      message: getTranslation(currentLang, "install.fetchingManifest"),
    });

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
  }

  // Queue ordering from manifest (e.g. install_ru, install_en, or fallback)
  let targetIds: string[];
  try {
    targetIds = getInstallPackageQueue(manifest, lang);
  } catch (err: unknown) {
    const norm = normalizeError(err, "MANIFEST_FAILED");
    logger.error("install", "Failed resolving package queue from manifest:", norm);
    onProgress?.({ status: "error", message: norm.description });
    return {
      success: false,
      error: createLauncherError(norm.code, norm.description, err),
    };
  }
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
      return {
        success: false,
        error: createLauncherError("INSTALL_CANCELLED"),
      };
    }

    const pkg = packages[i];
    if (!pkg) continue;
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
        return {
          success: false,
          error: createLauncherError("INSTALL_CANCELLED"),
        };
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
      } catch {}
      return {
        success: false,
        error: createLauncherError("INSTALL_CANCELLED"),
      };
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
      await recordInstalledFiles(cleanDir, pkg.id, initialUserFiles);
      if (pkg.id.startsWith("mod_")) {
        try {
          const modFiles = pkg.check_file ? [pkg.check_file.replace(/\\/g, "/")] : [];
          await recordInstalledMod(cleanDir, pkg.id, pkg.hash || "", modFiles, pkg.check_file);
        } catch {}
      }
    } catch (err: unknown) {
      try {
        await unlink(tempArchivePath);
      } catch {}

      const normalized = normalizeError(err, "EXTRACTION_FAILED");
      logger.error("install", `Error while extracting package ${pkg.id}:`, normalized);

      if (normalized.code === "INSTALL_CANCELLED" || signal?.aborted) {
        return {
          success: false,
          error: createLauncherError("INSTALL_CANCELLED"),
        };
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
