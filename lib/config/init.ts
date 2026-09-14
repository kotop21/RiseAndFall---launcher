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
  } catch (err) {
    console.error("Config: failed to create config directory:", err);
  }

  const exists = await fileExists(filePath);

  if (!exists) {
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
      console.log("Config: initialized and loaded default config");
    } catch (err) {
      console.error("Config: failed to write default binary config:", err);
    }
    return DEFAULT_CONFIG;
  }

  try {
    const rawBytes = await readFile(filePath);
    const data = unpack(rawBytes) as Partial<LauncherConfig>;

    const loadedConfig: LauncherConfig = {
      gameDir: data.gameDir ?? DEFAULT_CONFIG.gameDir,
      gameArg: data.gameArg ?? DEFAULT_CONFIG.gameArg,
      launcherLang: data.launcherLang ?? DEFAULT_CONFIG.launcherLang,
      totalPlaytimeMinutes:
        typeof data.totalPlaytimeMinutes === "number"
          ? data.totalPlaytimeMinutes
          : DEFAULT_CONFIG.totalPlaytimeMinutes,
      lastLaunchDate: data.lastLaunchDate ?? DEFAULT_CONFIG.lastLaunchDate,
    };

    console.log("Config: loaded successfully");
    return loadedConfig;
  } catch (err) {
    console.error(
      "Config: failed to decode binary config. Resetting to default:",
      err,
    );
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
      console.log("Config: restored default config successfully");
    } catch (writeErr) {
      console.error("Config: failed to restore default config:", writeErr);
    }
    return DEFAULT_CONFIG;
  }
}
