import { DiscordRpcClient } from "./client";
import { logger } from "@/lib/logger";

class DiscordRpcManager {
  private client = new DiscordRpcClient();
  private launcherStartTime = Math.floor(Date.now() / 1000);
  private isGameRunning = false;
  private isEnabled = true;

  public init(enabled = true) {
    this.isEnabled = enabled;
    this.client.setEnabled(enabled);
    if (enabled) {
      logger.info("discord-rpc", "Initializing Discord Rich Presence...");
      this.updatePresence();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.client.setEnabled(enabled);
    if (enabled) {
      this.updatePresence();
    }
  }

  public setGameRunning(running: boolean) {
    this.isGameRunning = running;
    if (this.isEnabled) {
      this.updatePresence();
    }
  }

  private updatePresence() {
    this.client.setActivity({
      state: "Raf-Launcher",
      details: this.isGameRunning ? "In Game: Rise and Fall" : "In Launcher",
      timestamps: {
        start: this.launcherStartTime,
      },
      assets: {
        large_image: this.isGameRunning ? "game_icon" : "icon",
        large_text: "by kotop21",
      },
      instance: true,
    });
  }

  public destroy() {
    this.client.disconnect();
  }
}

export const discordRpc = new DiscordRpcManager();
