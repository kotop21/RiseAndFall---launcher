import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { downloadFromMirrors, type ManifestPackage } from "@/lib/api";
import { createLauncherError, type LauncherAppError, normalizeError } from "@/lib/errors";
import { extractZip } from "@/lib/explorer/extract";
import { logger } from "@/lib/logger";
import { calculateFileSha256 } from "@/lib/utils/hash";
import { recordInstalledFiles, scanFileStats } from "./install-manifest";
import {
  loadModsManifest,
  type ModsManifest,
  recordInstalledMod,
  removeInstalledMod,
  saveModsManifest,
} from "./mods-storage";

export type ModInstallStatus = "not_installed" | "update_available" | "installed";

export interface ModInstallProgress {
  message: string;
  percent?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
}

export async function getModStatus(
  gameDir: string,
  mod: ManifestPackage,
  preloadedManifest?: ModsManifest,
): Promise<ModInstallStatus> {
  const cleanDir = gameDir.trim();
  if (!cleanDir || !existsSync(cleanDir)) {
    return "not_installed";
  }

  const localConfig = preloadedManifest || (await loadModsManifest(cleanDir));
  const modRecord = localConfig.mods[mod.id];

  // 1. Если мода НЕТ в конфигурации — он никогда не устанавливался пользователем!
  // Статус строго 'not_installed' (кнопка «Установить»), никакого 'update_available'
  if (!modRecord) {
    return "not_installed";
  }

  // 2. Если файл проверки задан, проверяем физическое наличие на диске
  const checkRel = mod.check_file?.trim() || modRecord.check_file || modRecord.files?.[0];
  if (checkRel) {
    const fullPath = join(cleanDir, checkRel);
    if (!existsSync(fullPath)) {
      return "not_installed";
    }
  }

  // 3. Сверяем хеш из API манифеста с хешем в конфигурации
  const apiHash = (mod.hash || "").trim().toLowerCase();
  const configHash = (modRecord.hash || "").trim().toLowerCase();

  if (!apiHash || !configHash) {
    return "installed";
  }

  if (configHash === apiHash) {
    return "installed";
  }

  // Хеш в конфигурации отличается от API манифеста -> доступно обновление
  return "update_available";
}

/**
 * Синхронизирует локальную конфигурацию (.launcher/mods.json) с физическими файлами на диске.
 * Вызывается при открытии диалога ДО получения API манифеста.
 * Проверяет ТОЛЬКО те моды, которые уже записаны в конфигурации:
 * берет нужный файл, вычисляет его hash, если физический файл отличается от конфигурации —
 * перезаписывает hash в конфигурации на текущий.
 */
export async function syncLocalModsWithDisk(gameDir: string): Promise<ModsManifest> {
  const cleanDir = gameDir.trim();
  const manifest = await loadModsManifest(cleanDir);
  if (!cleanDir || !existsSync(cleanDir)) return manifest;

  let dirty = false;

  for (const [modId, record] of Object.entries(manifest.mods)) {
    if (!record) continue;

    const checkRel = record.check_file || record.files?.[0];
    if (!checkRel) continue;

    const fullPath = join(cleanDir, checkRel);
    if (!existsSync(fullPath)) {
      // Физический файл удален с диска
      delete manifest.mods[modId];
      dirty = true;
      continue;
    }

    const diskHash = await calculateFileSha256(fullPath);
    if (!diskHash) continue;

    // Если физический файл отличается от того, что записано в конфигурации —
    // перезаписываем конфигурацию текущим хешем
    if (diskHash.toLowerCase() !== (record.hash || "").toLowerCase()) {
      record.hash = diskHash.toLowerCase();
      dirty = true;
    }
  }

  if (dirty) {
    await saveModsManifest(cleanDir, manifest).catch(() => {});
  }

  return manifest;
}

export async function checkAllModsStatus(
  gameDir: string,
  mods: ManifestPackage[],
  preloadedManifest?: ModsManifest,
): Promise<Record<string, ModInstallStatus>> {
  const cleanDir = gameDir.trim();
  const results: Record<string, ModInstallStatus> = {};
  if (!cleanDir || mods.length === 0) return results;

  const localConfig = preloadedManifest || (await loadModsManifest(cleanDir));
  for (const mod of mods) {
    results[mod.id] = await getModStatus(cleanDir, mod, localConfig);
  }
  return results;
}

export async function installMod(
  gameDir: string,
  mod: ManifestPackage,
  options?: {
    signal?: AbortSignal;
    onProgress?: (progress: ModInstallProgress) => void;
  },
): Promise<{ success: boolean; error?: LauncherAppError }> {
  const cleanDir = gameDir.trim();
  if (!cleanDir || !existsSync(cleanDir)) {
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_INVALID"),
    };
  }

  if (!mod.mirrors || mod.mirrors.length === 0) {
    return {
      success: false,
      error: createLauncherError(
        "MIRRORS_UNAVAILABLE",
        `No download mirrors provided for ${mod.name}`,
      ),
    };
  }

  const signal = options?.signal;
  const onProgress = options?.onProgress;

  if (signal?.aborted) {
    return {
      success: false,
      error: createLauncherError("INSTALL_CANCELLED"),
    };
  }

  const tempArchivePath = join(cleanDir, `mod_${mod.id}_${Date.now()}.zip`);

  try {
    const initialFiles = await scanFileStats(cleanDir);

    onProgress?.({
      message: `Downloading ${mod.name}...`,
      percent: 0,
    });

    await downloadFromMirrors(mod.mirrors, tempArchivePath, {
      signal,
      onProgress: (p) => {
        const percent =
          p.totalBytes && p.totalBytes > 0
            ? Math.round((p.bytesDownloaded / p.totalBytes) * 100)
            : undefined;
        onProgress?.({
          message: `${mod.name}: ${(p.bytesDownloaded / 1024 / 1024).toFixed(1)} MB`,
          percent,
          bytesDownloaded: p.bytesDownloaded,
          totalBytes: p.totalBytes,
        });
      },
    });

    if (signal?.aborted) {
      return {
        success: false,
        error: createLauncherError("INSTALL_CANCELLED"),
      };
    }

    onProgress?.({
      message: `Extracting...`,
    });

    const extracted = await extractZip(tempArchivePath, cleanDir);
    if (!extracted) {
      return {
        success: false,
        error: createLauncherError(
          "EXTRACTION_FAILED",
          `Failed extracting archive for ${mod.name}`,
        ),
      };
    }

    // Determine files that belong to this mod by comparing before and after
    const currentFiles = await scanFileStats(cleanDir);
    const modFiles: string[] = [];
    for (const [relPath, curStat] of currentFiles.entries()) {
      if (initialFiles.has(relPath)) {
        const initStat = initialFiles.get(relPath);
        if (
          initStat &&
          initStat.size === curStat.size &&
          Math.abs(initStat.mtimeMs - curStat.mtimeMs) < 1000
        ) {
          continue;
        }
      }
      modFiles.push(relPath);
    }

    // Also include check_file if it was extracted
    if (mod.check_file && !modFiles.includes(mod.check_file.replace(/\\/g, "/"))) {
      modFiles.push(mod.check_file.replace(/\\/g, "/"));
    }

    // Determine hash to record
    let finalHash = mod.hash?.trim() || "";
    if (mod.check_file) {
      const fullCheckPath = join(cleanDir, mod.check_file.trim());
      const computed = await calculateFileSha256(fullCheckPath);
      if (computed) {
        finalHash = computed;
      }
    }

    // 1. Record specifically in .launcher/mods.json
    await recordInstalledMod(cleanDir, mod.id, finalHash, modFiles, mod.check_file);

    // 2. Also record in .launcher/install_manifest.json for global game uninstaller
    await recordInstalledFiles(cleanDir, mod.id, initialFiles);

    logger.info(
      "mod-service",
      `Mod ${mod.id} (${mod.name}) installed successfully (${modFiles.length} files)`,
    );
    return { success: true };
  } catch (err) {
    if (signal?.aborted) {
      return {
        success: false,
        error: createLauncherError("INSTALL_CANCELLED"),
      };
    }
    const normalized = normalizeError(err, "DOWNLOAD_FAILED");
    logger.error("mod-service", `Error installing mod ${mod.id}:`, normalized);
    return {
      success: false,
      error: createLauncherError(normalized.code, normalized.description, err),
    };
  } finally {
    try {
      if (existsSync(tempArchivePath)) {
        await unlink(tempArchivePath);
      }
    } catch {}
  }
}

export async function uninstallMod(
  gameDir: string,
  modId: string,
): Promise<{ success: boolean; error?: LauncherAppError }> {
  const cleanDir = gameDir.trim();
  if (!cleanDir || !existsSync(cleanDir)) {
    return {
      success: false,
      error: createLauncherError("TARGET_DIR_INVALID"),
    };
  }

  try {
    const res = await removeInstalledMod(cleanDir, modId);
    if (!res.success) {
      return {
        success: false,
        error: createLauncherError("FS_ACCESS_DENIED", `Failed to remove files for mod ${modId}`),
      };
    }
    return { success: true };
  } catch (err) {
    const normalized = normalizeError(err, "FS_ACCESS_DENIED");
    logger.error("mod-service", `Error uninstalling mod ${modId}:`, normalized);
    return {
      success: false,
      error: createLauncherError(normalized.code, normalized.description, err),
    };
  }
}
