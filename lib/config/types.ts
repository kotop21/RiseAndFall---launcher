export interface LauncherConfig {
  gameDir: string;
  gameArg: string;
  launcherLang: string;
  totalPlaytimeMinutes: number;
  lastLaunchDate: string | null;
}

export interface LauncherState {
  config: LauncherConfig;
}
