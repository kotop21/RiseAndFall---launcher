import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";

export async function ensureDirectory(dirPath: string): Promise<boolean> {
  const target = dirPath.trim();
  if (!target) return false;
  try {
    if (!existsSync(target)) {
      await mkdir(target, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

export async function createFile(
  filePath: string,
  content: Uint8Array | string,
): Promise<boolean> {
  const target = filePath.trim();
  if (!target) return false;
  try {
    if (!(await ensureDirectory(dirname(target)))) return false;
    await writeFile(target, content);
    return true;
  } catch {
    return false;
  }
}
