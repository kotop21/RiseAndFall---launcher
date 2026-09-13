import { join } from "node:path";
import { access } from "node:fs/promises";

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function hasRiseAndFallExe(
  gameDir?: string | null,
): Promise<boolean> {
  const root = gameDir?.trim();
  if (!root || root.length === 0) {
    return false;
  }

  const targetPath = join(root, "RiseAndFall.exe");
  return await checkFileExists(targetPath);
}

export async function hasDgVoodooCplExe(
  gameDir?: string | null,
): Promise<boolean> {
  const root = gameDir?.trim();
  if (!root || root.length === 0) {
    return false;
  }

  const targetPath = join(root, "dgVoodooCpl.exe");
  return await checkFileExists(targetPath);
}
