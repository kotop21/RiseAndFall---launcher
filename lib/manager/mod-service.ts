import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { downloadFromMirrors, type ManifestPackage, type ManifestResponse } from "@/lib/api";
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
export type ModInstallPhase = "connecting" | "downloading" | "extracting";

export interface ModInstallProgress {
  phase: ModInstallPhase;
  message: string;
  percent?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
}

export interface ModsStateSnapshot {
  mods: ManifestPackage[];
  requiredModIds: string[];
  statuses: Record<string, ModInstallStatus>;
}

export interface ModQueueProgress {
  currentIndex: number;
  totalCount: number;
  mod: ManifestPackage;
  phase: ModInstallPhase;
  percent?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
}

export interface ModQueueResult {
  success: boolean;
  completedIds: string[];
  failedMod?: ManifestPackage;
  error?: LauncherAppError;
}

const ONE_KB = 1024;
const ONE_MB = 1024 * 1024;
const ONE_GB = 1024 * 1024 * 1024;

function parseNumericByteSize(size?: number | string): number | null {
  if (size === undefined || size === null || size === "") return null;
  if (typeof size === "number") {
    return Number.isFinite(size) && size >= 0 ? size : null;
  }
  const clean = size.trim().toLowerCase();
  if (!clean || clean.endsWith("gb") || clean.endsWith("mb") || clean.endsWith("kb")) {
    return null;
  }
  const parsed = Number.parseFloat(clean);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Formats a byte count (or pre-formatted size string) for mod cards and progress readouts.
 */
export function formatByteSize(size?: number | string): string {
  if (size === undefined || size === null || size === "") return "—";
  if (typeof size === "string") {
    const clean = size.trim().toLowerCase();
    if (clean.endsWith("gb") || clean.endsWith("mb") || clean.endsWith("kb")) {
      return size.trim();
    }
  }

  const bytes = parseNumericByteSize(size) ?? 0;
  if (bytes <= 0) return "0 KB";
  if (bytes >= ONE_GB) return `${(bytes / ONE_GB).toFixed(1)} GB`;
  if (bytes >= ONE_MB) return `${(bytes / ONE_MB).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / ONE_KB))} KB`;
}

/**
 * Formats downloaded bytes against total expected bytes using matching units (e.g. "12.4 / 45.0 MB").
 */
export function formatByteProgress(bytesDownloaded: number, totalBytes?: number | string): string {
  const safeDownloaded =
    Number.isFinite(bytesDownloaded) && bytesDownloaded > 0 ? bytesDownloaded : 0;
  const totalNumeric = parseNumericByteSize(totalBytes);

  if (totalNumeric !== null && totalNumeric > 0) {
    if (totalNumeric >= ONE_GB) {
      return `${(safeDownloaded / ONE_GB).toFixed(2)} / ${(totalNumeric / ONE_GB).toFixed(2)} GB`;
    }
    if (totalNumeric >= ONE_MB) {
      return `${(safeDownloaded / ONE_MB).toFixed(1)} / ${(totalNumeric / ONE_MB).toFixed(1)} MB`;
    }
    return `${Math.round(safeDownloaded / ONE_KB)} / ${Math.max(1, Math.round(totalNumeric / ONE_KB))} KB`;
  }

  if (typeof totalBytes === "string" && totalBytes.trim()) {
    return `${formatByteSize(safeDownloaded)} / ${totalBytes.trim()}`;
  }

  return formatByteSize(safeDownloaded);
}

/**
 * Normalizes required mod IDs from the server manifest.
 */
export function extractRequiredModIds(manifest: Pick<ManifestResponse, "required_mods">): string[] {
  if (!Array.isArray(manifest.required_mods)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawId of manifest.required_mods) {
    const id = String(rawId).trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
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

/**
 * Synchronizes local mod metadata with files on disk and evaluates mod statuses against a manifest.
 */
export async function evaluateModsState(
  gameDir: string,
  manifest: ManifestResponse,
): Promise<ModsStateSnapshot> {
  const cleanDir = gameDir.trim();
  const mods = (manifest.packages || []).filter((pkg) => pkg.id.startsWith("mod_"));
  const requiredModIds = extractRequiredModIds(manifest);

  if (!cleanDir || !existsSync(cleanDir)) {
    return { mods, requiredModIds, statuses: {} };
  }

  let localConfig: ModsManifest | undefined;
  try {
    localConfig = await syncLocalModsWithDisk(cleanDir);
  } catch (err) {
    logger.warn("mod-service", "Failed syncing local mods with disk:", err);
  }

  const statuses = await checkAllModsStatus(cleanDir, mods, localConfig);
  return { mods, requiredModIds, statuses };
}

/**
 * Returns required mods that are missing or need an update according to manifest hashes and disk state.
 */
export async function getRequiredModsToSync(
  gameDir: string,
  manifest: ManifestResponse,
): Promise<ManifestPackage[]> {
  const cleanDir = gameDir.trim();
  if (!cleanDir || !existsSync(cleanDir)) return [];

  const { mods, requiredModIds, statuses } = await evaluateModsState(cleanDir, manifest);
  if (requiredModIds.length === 0) return [];

  const modsById = new Map(mods.map((mod) => [mod.id, mod]));
  const pending: ManifestPackage[] = [];

  for (const reqId of requiredModIds) {
    const pkg = modsById.get(reqId);
    if (!pkg) continue;
    const status = statuses[pkg.id] || "not_installed";
    if (status === "not_installed" || status === "update_available") {
      pending.push(pkg);
    }
  }

  return pending;
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
      phase: "connecting",
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
          phase: "downloading",
          message: `${mod.name}: ${(p.bytesDownloaded / ONE_MB).toFixed(1)} MB`,
          percent,
          bytesDownloaded: p.bytesDownloaded,
          totalBytes: p.totalBytes,
          bytesPerSecond: p.bytesPerSecond,
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
      phase: "extracting",
      message: `Extracting...`,
      percent: 100,
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

/**
 * Installs a queue of required mods sequentially, reporting per-item index and phase progress.
 * Stops immediately on the first failure so callers can retry only remaining mods.
 */
export async function installRequiredModsQueue(
  gameDir: string,
  mods: ManifestPackage[],
  options?: {
    signal?: AbortSignal;
    onProgress?: (progress: ModQueueProgress) => void;
    installFn?: typeof installMod;
  },
): Promise<ModQueueResult> {
  const cleanDir = gameDir.trim();
  const signal = options?.signal;
  const onProgress = options?.onProgress;
  const installFn = options?.installFn ?? installMod;
  const completedIds: string[] = [];

  if (mods.length === 0) {
    return { success: true, completedIds };
  }

  for (let i = 0; i < mods.length; i++) {
    const mod = mods[i];
    if (!mod) continue;

    if (signal?.aborted) {
      return {
        success: false,
        completedIds,
        failedMod: mod,
        error: createLauncherError("INSTALL_CANCELLED"),
      };
    }

    onProgress?.({
      currentIndex: i + 1,
      totalCount: mods.length,
      mod,
      phase: "connecting",
      percent: 0,
    });

    const res = await installFn(cleanDir, mod, {
      signal,
      onProgress: (p) => {
        onProgress?.({
          currentIndex: i + 1,
          totalCount: mods.length,
          mod,
          phase: p.phase,
          percent: p.percent,
          bytesDownloaded: p.bytesDownloaded,
          totalBytes: p.totalBytes,
          bytesPerSecond: p.bytesPerSecond,
        });
      },
    });

    if (!res.success) {
      return {
        success: false,
        completedIds,
        failedMod: mod,
        error: res.error ?? createLauncherError("DOWNLOAD_FAILED"),
      };
    }

    completedIds.push(mod.id);
  }

  return { success: true, completedIds };
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

function getModSortTier(status: ModInstallStatus, isRequired: boolean): number {
  if (isRequired && status === "not_installed") {
    return 0;
  }
  if (status === "installed" || status === "update_available") {
    return 1;
  }
  return 2;
}

/**
 * Sorts mods into 3 ordered groups without visual dividers:
 * 0. Required mods that are not yet installed
 * 1. Already installed mods (including those with available updates)
 * 2. Optional mods that are not installed
 * Within each group, sorts alphabetically by title supporting Ukrainian, Russian, English, and Latin scripts.
 */
export function sortModsForDisplay(
  mods: ManifestPackage[],
  statuses: Record<string, ModInstallStatus>,
  requiredModIds: readonly string[],
  lang?: string,
): ManifestPackage[] {
  const requiredSet = new Set(requiredModIds);
  const primaryLocale =
    lang === "ua" ? "uk" : lang === "ru" ? "ru" : lang === "en" ? "en" : undefined;
  const locales = primaryLocale ? [primaryLocale, "uk", "ru", "en"] : ["uk", "ru", "en"];
  const collator = new Intl.Collator(locales, { sensitivity: "base", numeric: true });

  return [...mods].sort((a, b) => {
    const statusA = statuses[a.id] || "not_installed";
    const statusB = statuses[b.id] || "not_installed";
    const tierDiff =
      getModSortTier(statusA, requiredSet.has(a.id)) -
      getModSortTier(statusB, requiredSet.has(b.id));
    if (tierDiff !== 0) {
      return tierDiff;
    }

    const nameCompare = collator.compare(a.name.trim(), b.name.trim());
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return a.id.localeCompare(b.id);
  });
}
