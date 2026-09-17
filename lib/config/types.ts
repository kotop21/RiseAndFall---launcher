export interface GameBuildProfile {
  id: string;
  name: string;
  path: string;
  gameArg: string;
}

export interface LauncherConfig {
  version: number;
  gameDir: string;
  gameArg: string;
  launcherLang: string;
  totalPlaytimeMinutes: number;
  lastLaunchDate: string | null;
  gameProfiles: GameBuildProfile[];
  activeProfileId: string;
}

export interface LauncherState {
  config: LauncherConfig;
}
