import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@/lib/logger";

export const LAUNCHER_DIR_NAME = ".launcher";

export function getLauncherDir(gameDir: string): string {
  return join(gameDir.trim(), LAUNCHER_DIR_NAME);
}

export function getLauncherFilePath(gameDir: string, fileName: string): string {
  return join(getLauncherDir(gameDir), fileName);
}

export async function ensureLauncherDir(gameDir: string): Promise<boolean> {
  const dir = getLauncherDir(gameDir);
  if (!dir) return false;

  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      if (process.platform === "win32") {
        try {
          spawn("attrib", ["+h", dir], { stdio: "ignore" }).on("error", () => {});
        } catch {}
      }
    }
    return true;
  } catch (err) {
    logger.error("storage", `Failed ensuring .launcher directory at: ${dir}`, err);
    return false;
  }
}

export function hasLauncherFileSync(gameDir: string, fileName: string): boolean {
  const trimmed = gameDir.trim();
  if (!trimmed) return false;
  try {
    return existsSync(getLauncherFilePath(trimmed, fileName));
  } catch {
    return false;
  }
}

export async function hasLauncherFile(gameDir: string, fileName: string): Promise<boolean> {
  return hasLauncherFileSync(gameDir, fileName);
}

export async function readLauncherJson<T>(gameDir: string, fileName: string): Promise<T | null> {
  const filePath = getLauncherFilePath(gameDir, fileName);
  try {
    if (!existsSync(filePath)) return null;
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error("storage", `Failed reading JSON file at: ${filePath}`, err);
    return null;
  }
}

export async function writeLauncherJson<T>(
  gameDir: string,
  fileName: string,
  data: T,
): Promise<boolean> {
  const filePath = getLauncherFilePath(gameDir, fileName);
  try {
    const ok = await ensureLauncherDir(gameDir);
    if (!ok) return false;
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    logger.error("storage", `Failed writing JSON file at: ${filePath}`, err);
    return false;
  }
}

export async function removeLauncherFile(gameDir: string, fileName: string): Promise<boolean> {
  const filePath = getLauncherFilePath(gameDir, fileName);
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    return true;
  } catch (err) {
    logger.warn("storage", `Failed removing launcher file: ${filePath}`, err);
    return false;
  }
}

export async function pruneLauncherDirIfEmpty(gameDir: string): Promise<boolean> {
  const dir = getLauncherDir(gameDir);
  try {
    if (existsSync(dir)) {
      const remaining = await readdir(dir);
      if (remaining.length === 0) {
        await rmdir(dir);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
