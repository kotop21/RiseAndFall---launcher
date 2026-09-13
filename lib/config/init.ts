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
  console.log(`Config: Target path: ${filePath}`);

  try {
    await mkdir(dirname(filePath), { recursive: true });
  } catch (err) {
    console.error(`Config: Failed to create config directory:`, err);
  }

  const exists = await fileExists(filePath);

  if (!exists) {
    console.warn(`Config: File not found. Generating default binary config...`);
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
      console.log(`Config: Default binary config successfully written.`);
    } catch (err) {
      console.error(`Config: Failed to write default binary config:`, err);
    }
    return DEFAULT_CONFIG;
  }

  try {
    const rawBytes = await readFile(filePath);
    console.log(
      `Config: Reading binary config (${rawBytes.byteLength} bytes)...`,
    );
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
  } catch (err) {
    console.error(
      `Config: Failed to decode binary config or corrupted file. Resetting to default:`,
      err,
    );
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
      console.log(`Config: Reset complete. Default binary config restored.`);
    } catch (writeErr) {
      console.error(`Config: Failed to restore default config:`, writeErr);
    }
    return DEFAULT_CONFIG;
  }
}
