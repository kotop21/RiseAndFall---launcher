import { DEFAULT_GAME_ARG } from "@/lib/config/migrate";
import { saveConfig } from "@/lib/config/save";
import type { GameBuildProfile, LauncherConfig } from "@/lib/config/types";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import { logger } from "@/lib/logger";
import { invalidateGameStatusCache } from "@/lib/utils/game-status";

export interface UninstallGameResult {
  success: boolean;
  error?: "TARGET_DIR_REQUIRED" | "CLEAN_FAILED" | "CONFIG_WRITE_FAILED";
  nextConfig?: LauncherConfig;
}

/**
 * Re-indexes and compacts configured profiles after a profile is removed:
 * remaining configured profiles shift up (e.g. #2 -> #1, #3 -> #2),
 * and the empty slots are placed at the end.
 */
export function compactProfilesAfterRemoval(
  removedProfileId: string,
  profiles: GameBuildProfile[],
  currentActiveId: string,
): {
  updatedProfiles: GameBuildProfile[];
  nextActiveId: string;
} {
  // 1. Get all configured profiles except the one being removed
  const remaining = profiles.filter((p) => p.id !== removedProfileId && Boolean(p.path?.trim()));

  // 2. Identify which profile was active before
  const activeProfileBefore = profiles.find((p) => p.id === currentActiveId);
  const wasActiveRemoved = currentActiveId === removedProfileId;

  // 3. Rebuild 5 slots with remaining configured profiles compacted at the beginning
  const updatedProfiles: GameBuildProfile[] = [];
  for (let i = 0; i < 5; i++) {
    const slotId = `slot-${i + 1}`;
    const slotName = `Slot ${i + 1}`;
    const item = remaining[i];
    if (item) {
      updatedProfiles.push({
        id: slotId,
        name: slotName,
        path: item.path,
        gameArg: item.gameArg || DEFAULT_GAME_ARG,
      });
    } else {
      updatedProfiles.push({
        id: slotId,
        name: slotName,
        path: "",
        gameArg: DEFAULT_GAME_ARG,
      });
    }
  }

  // 4. Determine nextActiveId
  let nextActiveId = "slot-1";
  if (wasActiveRemoved) {
    // If the active profile was deleted, default to slot-1 (which now holds former slot-2, or is empty)
    nextActiveId = "slot-1";
  } else if (activeProfileBefore?.path?.trim()) {
    // If another profile was active, find where its path moved in remaining
    const newIdx = remaining.findIndex((p) => p.path === activeProfileBefore.path);
    if (newIdx >= 0) {
      nextActiveId = `slot-${newIdx + 1}`;
    } else {
      nextActiveId = "slot-1";
    }
  }

  return {
    updatedProfiles,
    nextActiveId,
  };
}

/**
 * Safely uninstalls game files for a specific profile slot, preserves user saves/mods,
 * completely removes the profile, and re-indexes remaining profiles (#2 -> #1, #3 -> #2).
 */
export async function uninstallGameProfile(
  profileId: string,
  currentConfig: LauncherConfig,
  saveFn: (cfg: LauncherConfig) => Promise<void> = saveConfig,
): Promise<UninstallGameResult> {
  const profile = currentConfig.gameProfiles?.find((p) => p.id === profileId);
  const targetDir = profile?.path?.trim() || "";

  if (!targetDir) {
    logger.warn("uninstall", `Cannot uninstall: profile ${profileId} has no path configured`);
    return { success: false, error: "TARGET_DIR_REQUIRED" };
  }

  logger.info(
    "uninstall",
    `Starting game uninstallation for profile ${profileId} at: ${targetDir}`,
  );

  // Clean directory safely (removes manifest files or preserves Data/Saved Games)
  const cleaned = await cleanGameDirectory(targetDir);
  if (!cleaned) {
    logger.error("uninstall", `Failed cleaning directory: ${targetDir}`);
    return { success: false, error: "CLEAN_FAILED" };
  }

  // Re-index remaining profiles: remaining shift up (#2 -> #1, #3 -> #2)
  const { updatedProfiles, nextActiveId } = compactProfilesAfterRemoval(
    profileId,
    currentConfig.gameProfiles || [],
    currentConfig.activeProfileId || "slot-1",
  );

  const activeProf = updatedProfiles.find((p) => p.id === nextActiveId);
  const nextGameDir = activeProf?.path || "";
  const nextGameArg = activeProf?.gameArg || DEFAULT_GAME_ARG;

  const nextConfig: LauncherConfig = {
    ...currentConfig,
    activeProfileId: nextActiveId,
    gameProfiles: updatedProfiles,
    gameDir: nextGameDir,
    gameArg: nextGameArg,
  };

  try {
    await saveFn(nextConfig);
    logger.info("uninstall", `Saved updated config after uninstallation of profile ${profileId}`);
  } catch (err) {
    logger.error("uninstall", "Failed saving config after game uninstallation:", err);
    return { success: false, error: "CONFIG_WRITE_FAILED", nextConfig };
  }

  invalidateGameStatusCache(targetDir);
  if (nextGameDir) {
    invalidateGameStatusCache(nextGameDir);
  }

  logger.info("uninstall", `Uninstallation completed successfully for profile ${profileId}`);
  return { success: true, nextConfig };
}
