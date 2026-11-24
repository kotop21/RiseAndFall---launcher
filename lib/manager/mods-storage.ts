import { existsSync } from "node:fs";
import { readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { logger } from "@/lib/logger";
import { readLauncherJson, writeLauncherJson } from "./launcher-storage";

export const MODS_MANIFEST_FILE_NAME = "mods.json";

export interface InstalledModRecord {
  hash: string;
  check_file?: string;
  currentHash?: string;
  installedAt: number;
  files: string[];
}

export interface ModsManifest {
  version: string;
  updatedAt: number;
  mods: Record<string, InstalledModRecord>;
}

const DEFAULT_MODS_MANIFEST: ModsManifest = {
  version: "1.0.0",
  updatedAt: 0,
  mods: {},
};

export async function loadModsManifest(gameDir: string): Promise<ModsManifest> {
  const cleanDir = gameDir.trim();
  if (!cleanDir) return { ...DEFAULT_MODS_MANIFEST, mods: {} };

  try {
    const data = await readLauncherJson<Partial<ModsManifest>>(cleanDir, MODS_MANIFEST_FILE_NAME);
    if (!data || typeof data.mods !== "object" || data.mods === null) {
      return {
        version: "1.0.0",
        updatedAt: Date.now(),
        mods: {},
      };
    }

    return {
      version: typeof data.version === "string" ? data.version : "1.0.0",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
      mods: data.mods as Record<string, InstalledModRecord>,
    };
  } catch (err) {
    logger.error("mods-storage", `Failed loading mods manifest in: ${cleanDir}`, err);
    return { ...DEFAULT_MODS_MANIFEST, mods: {} };
  }
}

export async function saveModsManifest(gameDir: string, manifest: ModsManifest): Promise<boolean> {
  const cleanDir = gameDir.trim();
  if (!cleanDir) return false;

  const data: ModsManifest = {
    version: manifest.version || "1.0.0",
    updatedAt: Date.now(),
    mods: manifest.mods || {},
  };

  return writeLauncherJson(cleanDir, MODS_MANIFEST_FILE_NAME, data);
}

export async function recordInstalledMod(
  gameDir: string,
  modId: string,
  hash: string,
  files: string[],
  check_file?: string,
): Promise<boolean> {
  const cleanDir = gameDir.trim();
  if (!cleanDir || !modId) return false;

  try {
    const manifest = await loadModsManifest(cleanDir);
    const cleanFiles = Array.from(new Set(files.map((f) => f.replace(/\\/g, "/")))).sort();

    manifest.mods[modId] = {
      hash: hash.toLowerCase().trim(),
      check_file: check_file ? check_file.trim().replace(/\\/g, "/") : undefined,
      installedAt: Date.now(),
      files: cleanFiles,
    };

    return await saveModsManifest(cleanDir, manifest);
  } catch (err) {
    logger.error("mods-storage", `Failed recording mod ${modId} in: ${cleanDir}`, err);
    return false;
  }
}

export async function removeInstalledMod(
  gameDir: string,
  modId: string,
): Promise<{ success: boolean; removedCount: number }> {
  const cleanRoot = resolve(gameDir.trim());
  if (!cleanRoot || !existsSync(cleanRoot)) {
    return { success: false, removedCount: 0 };
  }

  try {
    const manifest = await loadModsManifest(cleanRoot);
    const record = manifest.mods[modId];
    if (!record) {
      logger.warn("mods-storage", `No mod record found for ${modId} in: ${cleanRoot}`);
      return { success: true, removedCount: 0 };
    }

    logger.info("mods-storage", `Removing ${record.files.length} files for mod ${modId}...`);

    let removedCount = 0;
    const touchedDirs = new Set<string>();

    for (const relPath of record.files) {
      const norm = relPath.replace(/\\/g, "/");
      if (norm.startsWith(".launcher") || norm.startsWith("Data/Saved Games")) {
        continue;
      }

      const fullPath = resolve(join(cleanRoot, norm));
      if (!fullPath.startsWith(cleanRoot + sep) && fullPath !== cleanRoot) {
        logger.warn("mods-storage", `Skipping suspicious path: ${relPath}`);
        continue;
      }

      try {
        if (existsSync(fullPath)) {
          await unlink(fullPath);
          removedCount++;
        }
      } catch (err) {
        logger.warn("mods-storage", `Failed deleting file ${fullPath}:`, err);
      }

      let parent = dirname(fullPath);
      while (parent.startsWith(cleanRoot + sep) && parent !== cleanRoot) {
        touchedDirs.add(parent);
        parent = dirname(parent);
      }
    }

    // Prune empty parent directories bottom-up
    const sortedDirs = Array.from(touchedDirs).sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
      try {
        if (existsSync(dir)) {
          const remaining = await readdir(dir);
          if (remaining.length === 0) {
            await rmdir(dir);
          }
        }
      } catch {}
    }

    delete manifest.mods[modId];
    await saveModsManifest(cleanRoot, manifest);

    logger.info(
      "mods-storage",
      `Successfully uninstalled mod ${modId} (${removedCount} files removed)`,
    );
    return { success: true, removedCount };
  } catch (err) {
    logger.error("mods-storage", `Failed uninstalling mod ${modId}:`, err);
    return { success: false, removedCount: 0 };
  }
}
