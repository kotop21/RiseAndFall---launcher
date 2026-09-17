import { initConfig } from "./init";
import { saveConfig } from "./save";
import type { LauncherConfig } from "./types";
import { logger } from "@/lib/logger";

export async function recordGameSession(
  playtimeMinutes: number,
  launchDate: Date = new Date(),
): Promise<LauncherConfig> {
  const { config } = await initConfig();
  const nextConfig: LauncherConfig = {
    ...config,
    totalPlaytimeMinutes:
      Math.max(0, config.totalPlaytimeMinutes) + Math.max(0, playtimeMinutes),
    lastLaunchDate: launchDate.toISOString(),
  };

  try {
    await saveConfig(nextConfig);
    logger.info("session", `Recorded game session: +${playtimeMinutes} min`);
    return nextConfig;
  } catch (err) {
    logger.error("session", "Failed saving session time:", err);
    throw err;
  }
}
