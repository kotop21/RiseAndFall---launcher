import { initConfig } from "./init";
import { saveConfig } from "./save";
import type { LauncherConfig } from "./types";

export async function recordGameSession(
  playtimeMinutes: number,
  launchDate: Date = new Date(),
): Promise<LauncherConfig> {
  const currentConfig = await initConfig();
  const nextConfig: LauncherConfig = {
    ...currentConfig,
    totalPlaytimeMinutes:
      Math.max(0, currentConfig.totalPlaytimeMinutes) + Math.max(0, playtimeMinutes),
    lastLaunchDate: launchDate.toISOString(),
  };

  await saveConfig(nextConfig);
  return nextConfig;
}
