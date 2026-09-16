import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { pack, unpack } from "msgpackr";
import { getConfigPath } from "./dir";
import type { LauncherConfig } from "./types";

export const DEFAULT_CONFIG: LauncherConfig = {
  gameDir: "",
  gameArg: '-datapath "Data\\" -redistpath "Redist\\"',
  launcherLang: "en",
  totalPlaytimeMinutes: 0,
  lastLaunchDate: null,
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initConfig(): Promise<LauncherConfig> {
  const filePath = getConfigPath();

  try {
    await mkdir(dirname(filePath), { recursive: true });
  } catch {}

  if (!(await fileExists(filePath))) {
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
    } catch {}
    return DEFAULT_CONFIG;
  }

  try {
    const rawBytes = await readFile(filePath);
    const data = unpack(rawBytes) as Partial<LauncherConfig>;

    return {
      gameDir: data.gameDir ?? DEFAULT_CONFIG.gameDir,
      gameArg: data.gameArg ?? DEFAULT_CONFIG.gameArg,
      launcherLang: data.launcherLang ?? DEFAULT_CONFIG.launcherLang,
      totalPlaytimeMinutes:
        typeof data.totalPlaytimeMinutes === "number"
          ? data.totalPlaytimeMinutes
          : DEFAULT_CONFIG.totalPlaytimeMinutes,
      lastLaunchDate: data.lastLaunchDate ?? DEFAULT_CONFIG.lastLaunchDate,
    };
  } catch {
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
    } catch {}
    return DEFAULT_CONFIG;
  }
}
