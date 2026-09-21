import { logger } from "@/lib/logger";
import type { LauncherConfig, GameBuildProfile } from "./types";

export const CURRENT_CONFIG_VERSION = 5;
export const DEFAULT_GAME_ARG = '-datapath "Data\\" -redistpath "Redist\\"';

export function createDefaultProfiles(
  initialPath = "",
  initialArg = DEFAULT_GAME_ARG,
): GameBuildProfile[] {
  return [
    { id: "slot-1", name: "Slot 1", path: initialPath, gameArg: initialArg },
    { id: "slot-2", name: "Slot 2", path: "", gameArg: DEFAULT_GAME_ARG },
    { id: "slot-3", name: "Slot 3", path: "", gameArg: DEFAULT_GAME_ARG },
    { id: "slot-4", name: "Slot 4", path: "", gameArg: DEFAULT_GAME_ARG },
    { id: "slot-5", name: "Slot 5", path: "", gameArg: DEFAULT_GAME_ARG },
  ];
}

export function migrateConfig(raw: Record<string, any>): {
  config: LauncherConfig;
  wasMigrated: boolean;
} {
  const version = typeof raw.version === "number" ? raw.version : 1;
  let wasMigrated = false;

  const legacyArg =
    typeof raw.gameArg === "string" ? raw.gameArg : DEFAULT_GAME_ARG;

  let profiles: GameBuildProfile[] = [];
  if (Array.isArray(raw.gameProfiles) && raw.gameProfiles.length > 0) {
    profiles = raw.gameProfiles.slice(0, 5).map((p, idx) => ({
      id: typeof p.id === "string" ? p.id : `slot-${idx + 1}`,
      name: typeof p.name === "string" ? p.name : `Slot ${idx + 1}`,
      path: typeof p.path === "string" ? p.path : "",
      gameArg:
        typeof p.gameArg === "string" && p.gameArg.trim()
          ? p.gameArg
          : legacyArg,
    }));
  }

  if (profiles.length === 0) {
    const legacyDir = typeof raw.gameDir === "string" ? raw.gameDir : "";
    profiles = createDefaultProfiles(legacyDir, legacyArg);
    wasMigrated = true;
  }

  while (profiles.length < 5) {
    const idx = profiles.length + 1;
    profiles.push({
      id: `slot-${idx}`,
      name: `Slot ${idx}`,
      path: "",
      gameArg: DEFAULT_GAME_ARG,
    });
    wasMigrated = true;
  }

  if (typeof raw.gameDir === "string" && raw.gameDir && !profiles[0].path) {
    profiles[0].path = raw.gameDir;
    wasMigrated = true;
  }

  let activeProfileId =
    typeof raw.activeProfileId === "string" && raw.activeProfileId
      ? raw.activeProfileId
      : "slot-1";

  if (!profiles.some((p) => p.id === activeProfileId)) {
    activeProfileId = profiles[0].id;
    wasMigrated = true;
  }

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const effectiveGameDir = activeProfile?.path || "";
  const effectiveGameArg = activeProfile?.gameArg || legacyArg;

  if (version < CURRENT_CONFIG_VERSION) {
    wasMigrated = true;
  }

  const config: LauncherConfig = {
    version: CURRENT_CONFIG_VERSION,
    gameDir: effectiveGameDir,
    gameArg: effectiveGameArg,
    launcherLang:
      typeof raw.launcherLang === "string" ? raw.launcherLang : "en",
    launcherPlaytimeMinutes:
      typeof raw.launcherPlaytimeMinutes === "number"
        ? raw.launcherPlaytimeMinutes
        : 0,
    totalPlaytimeMinutes:
      typeof raw.totalPlaytimeMinutes === "number"
        ? raw.totalPlaytimeMinutes
        : 0,
    lastLaunchDate:
      typeof raw.lastLaunchDate === "string" || raw.lastLaunchDate === null
        ? raw.lastLaunchDate
        : null,
    gameProfiles: profiles,
    activeProfileId,
    discordRpc: typeof raw.discordRpc === "boolean" ? raw.discordRpc : true,
    lowPerformanceMode:
      typeof raw.lowPerformanceMode === "boolean"
        ? raw.lowPerformanceMode
        : false,
  };

  if (wasMigrated) {
    logger.info(
      "config",
      `migrated schema from v${version} to v${CURRENT_CONFIG_VERSION}`,
    );
  }

  return { config, wasMigrated };
}
