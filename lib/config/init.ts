import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { pack, unpack } from "msgpackr";
import { getConfigPath } from "./dir";
import {
  CURRENT_CONFIG_VERSION,
  DEFAULT_GAME_ARG,
  createDefaultProfiles,
  migrateConfig,
} from "./migrate";
import type { LauncherConfig } from "./types";
import { logger } from "@/lib/logger";

export const DEFAULT_CONFIG: LauncherConfig = {
  version: CURRENT_CONFIG_VERSION,
  gameDir: "",
  gameArg: DEFAULT_GAME_ARG,
  launcherLang: "en",
  totalPlaytimeMinutes: 0,
  launcherPlaytimeMinutes: 0,
  lastLaunchDate: null,
  gameProfiles: createDefaultProfiles(),
  activeProfileId: "slot-1",
  discordRpc: true,
  lowPerformanceMode: false,
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function isForceWelcome(): boolean {
  const flag = (
    process.env.FORCE_WELCOME ||
    process.env.TEST_MODE ||
    process.env.WELCOME ||
    ""
  )
    .toLowerCase()
    .trim();
  return flag === "1" || flag === "true" || flag === "yes";
}

export async function hasExistingConfigFile(): Promise<boolean> {
  return fileExists(getConfigPath());
}

export async function initConfig(): Promise<{
  config: LauncherConfig;
  isFirstLaunch: boolean;
}> {
  const filePath = getConfigPath();
  const forceWelcome = isForceWelcome();

  try {
    await mkdir(dirname(filePath), { recursive: true });
  } catch (err) {
    logger.error(
      "config",
      `Failed creating config directory at ${dirname(filePath)}:`,
      err,
    );
  }

  const exists = await fileExists(filePath);

  if (!exists) {
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
      logger.info("config", `Initialized default configuration at ${filePath}`);
    } catch (err) {
      logger.error(
        "config",
        `Failed writing default config to ${filePath}:`,
        err,
      );
    }
    return { config: DEFAULT_CONFIG, isFirstLaunch: true };
  }

  try {
    const rawBytes = await readFile(filePath);
    const data = (unpack(rawBytes) || {}) as Record<string, any>;
    const { config, wasMigrated } = migrateConfig(data);

    if (wasMigrated) {
      try {
        await writeFile(filePath, pack(config));
        logger.info(
          "config",
          `Persisted migrated configuration to ${filePath}`,
        );
      } catch (err) {
        logger.error(
          "config",
          `Failed writing migrated config to ${filePath}:`,
          err,
        );
      }
    }

    return { config, isFirstLaunch: forceWelcome };
  } catch (err) {
    logger.error(
      "config",
      `Failed parsing or reading configuration at ${filePath}, falling back to defaults:`,
      err,
    );
    try {
      await writeFile(filePath, pack(DEFAULT_CONFIG));
    } catch (writeErr) {
      logger.error(
        "config",
        `Failed recreating fallback config at ${filePath}:`,
        writeErr,
      );
    }
    return { config: DEFAULT_CONFIG, isFirstLaunch: true };
  }
}
