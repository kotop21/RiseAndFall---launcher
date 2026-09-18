export interface DiscordActivityTimestamps {
  start?: number;
  end?: number;
}

export interface DiscordActivityAssets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

export interface DiscordActivity {
  state?: string;
  details?: string;
  timestamps?: DiscordActivityTimestamps;
  assets?: DiscordActivityAssets;
  instance?: boolean;
}
