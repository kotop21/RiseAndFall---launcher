import { existsSync } from "node:fs";
import { readdir, rmdir, stat, unlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { logger } from "@/lib/logger";
import {
  getLauncherDir,
  getLauncherFilePath,
  hasLauncherFile,
  hasLauncherFileSync,
  LAUNCHER_DIR_NAME,
  pruneLauncherDirIfEmpty,
  readLauncherJson,
  removeLauncherFile,
  writeLauncherJson,
} from "./launcher-storage";

export interface InstallManifest {
  version: string;
  updatedAt: number;
  packages: string[];
  files: string[];
}

export interface FileStatInfo {
  size: number;
  mtimeMs: number;
}

export const MANIFEST_DIR_NAME = LAUNCHER_DIR_NAME;
export const MANIFEST_FILE_NAME = "install_manifest.json";

export function getManifestDir(gameDir: string): string {
  return getLauncherDir(gameDir);
}

export function getManifestPath(gameDir: string): string {
  return getLauncherFilePath(gameDir, MANIFEST_FILE_NAME);
}

export function hasInstallManifestSync(gameDir: string): boolean {
  return hasLauncherFileSync(gameDir, MANIFEST_FILE_NAME);
}

export async function hasInstallManifest(gameDir: string): Promise<boolean> {
  return hasLauncherFile(gameDir, MANIFEST_FILE_NAME);
}

export async function loadInstallManifest(gameDir: string): Promise<InstallManifest | null> {
  try {
    const parsed = await readLauncherJson<Partial<InstallManifest>>(gameDir, MANIFEST_FILE_NAME);
    if (!parsed || !Array.isArray(parsed.files)) {
      if (parsed) {
        logger.warn("manifest", `Corrupted manifest file in: ${gameDir}`);
      }
      return null;
    }
    return {
      version: typeof parsed.version === "string" ? parsed.version : "2.0.0",
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
      packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      files: parsed.files.map((f) => String(f).replace(/\\/g, "/")),
    };
  } catch (err) {
    logger.error("manifest", `Failed loading manifest in: ${gameDir}`, err);
    return null;
  }
}

export async function saveInstallManifest(
  gameDir: string,
  manifest: InstallManifest,
): Promise<boolean> {
  const cleanFiles = Array.from(new Set(manifest.files.map((f) => f.replace(/\\/g, "/")))).sort();
  const cleanPackages = Array.from(new Set(manifest.packages));
  const data: InstallManifest = {
    version: manifest.version || "2.0.0",
    updatedAt: Date.now(),
    packages: cleanPackages,
    files: cleanFiles,
  };
  return writeLauncherJson(gameDir, MANIFEST_FILE_NAME, data);
}

export function isExcludedManifestPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  if (norm === MANIFEST_DIR_NAME || norm.startsWith(`${MANIFEST_DIR_NAME}/`)) return true;
  if (norm === "Data/Saved Games" || norm.startsWith("Data/Saved Games/")) return true;
  if (norm.startsWith(".temp_")) return true;
  if (norm.startsWith("pkg_") && norm.endsWith(".zip")) return true;
  return false;
}

export async function scanFileStats(
  targetDir: string,
  currentSubDir = "",
  result = new Map<string, FileStatInfo>(),
): Promise<Map<string, FileStatInfo>> {
  const dir = currentSubDir ? join(targetDir, currentSubDir) : targetDir;
  if (!existsSync(dir)) return result;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = currentSubDir
        ? `${currentSubDir}/${entry.name}`.replace(/\\/g, "/")
        : entry.name.replace(/\\/g, "/");

      if (isExcludedManifestPath(relPath)) {
        continue;
      }

      const fullPath = join(targetDir, relPath);
      if (entry.isDirectory()) {
        await scanFileStats(targetDir, relPath, result);
      } else if (entry.isFile()) {
        try {
          const s = await stat(fullPath);
          result.set(relPath, { size: s.size, mtimeMs: s.mtimeMs });
        } catch {}
      }
    }
  } catch (err) {
    logger.warn("manifest", `Error reading directory while scanning stats: ${dir}`, err);
  }

  return result;
}

export async function recordInstalledFiles(
  gameDir: string,
  packageId: string,
  initialUserFiles?: Map<string, FileStatInfo>,
): Promise<InstallManifest | null> {
  try {
    const existingManifest = (await loadInstallManifest(gameDir)) || {
      version: "2.0.0",
      updatedAt: Date.now(),
      packages: [],
      files: [],
    };

    const currentFiles = await scanFileStats(gameDir);
    const manifestFilesSet = new Set<string>(existingManifest.files);

    for (const [relPath, curStat] of currentFiles.entries()) {
      if (isExcludedManifestPath(relPath)) continue;

      if (initialUserFiles?.has(relPath)) {
        const initStat = initialUserFiles.get(relPath);
        if (
          initStat &&
          initStat.size === curStat.size &&
          Math.abs(initStat.mtimeMs - curStat.mtimeMs) < 1000 &&
          !manifestFilesSet.has(relPath)
        ) {
          // File existed before installation began, was not touched, and wasn't in the manifest
          continue;
        }
      }

      manifestFilesSet.add(relPath);
    }

    const updatedPackages = Array.from(new Set([...existingManifest.packages, packageId]));
    const updatedManifest: InstallManifest = {
      version: existingManifest.version || "2.0.0",
      updatedAt: Date.now(),
      packages: updatedPackages,
      files: Array.from(manifestFilesSet).sort(),
    };

    await saveInstallManifest(gameDir, updatedManifest);
    return updatedManifest;
  } catch (err) {
    logger.error("manifest", `Failed recording installed files for ${packageId}:`, err);
    return null;
  }
}

export async function removeInstalledFiles(gameDir: string): Promise<boolean> {
  const cleanRoot = resolve(gameDir.trim());
  if (!cleanRoot || !existsSync(cleanRoot)) {
    logger.error("manifest", `Target directory does not exist for manifest removal: ${cleanRoot}`);
    return false;
  }

  const manifest = await loadInstallManifest(cleanRoot);
  if (!manifest) {
    logger.warn("manifest", `No manifest found to remove files in: ${cleanRoot}`);
    return false;
  }

  logger.info("manifest", `Removing ${manifest.files.length} installed files via manifest...`);

  const touchedDirs = new Set<string>();

  for (const relPath of manifest.files) {
    if (isExcludedManifestPath(relPath)) continue;

    const fullPath = resolve(join(cleanRoot, relPath));
    // Path traversal safety check
    if (!fullPath.startsWith(cleanRoot + sep) && fullPath !== cleanRoot) {
      logger.warn("manifest", `Skipping suspicious path traversal in manifest: ${relPath}`);
      continue;
    }

    try {
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch (err) {
      logger.warn("manifest", `Failed deleting file ${fullPath}:`, err);
    }

    // Collect parent directory chain
    let parent = dirname(fullPath);
    while (parent.startsWith(cleanRoot + sep) && parent !== cleanRoot) {
      touchedDirs.add(parent);
      parent = dirname(parent);
    }
  }

  // Prune empty directories bottom-up (longest path first)
  const sortedDirs = Array.from(touchedDirs).sort((a, b) => b.length - a.length);
  for (const dir of sortedDirs) {
    try {
      if (existsSync(dir)) {
        const remaining = await readdir(dir);
        if (remaining.length === 0) {
          await rmdir(dir);
        }
      }
    } catch (err) {
      logger.warn("manifest", `Failed pruning directory ${dir}:`, err);
    }
  }

  // Remove manifest file and .launcher folder if empty
  await removeLauncherFile(cleanRoot, MANIFEST_FILE_NAME);
  await pruneLauncherDirIfEmpty(cleanRoot);

  logger.info("manifest", `Successfully cleaned manifest-tracked files in: ${cleanRoot}`);
  return true;
}
