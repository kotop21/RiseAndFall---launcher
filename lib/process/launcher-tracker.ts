import { saveConfig } from "@/lib/config/save";
import { initConfig } from "@/lib/config/init";
import { logger } from "@/lib/logger";

class LauncherTimeTracker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private accumulatedSeconds = 0;
  private lastTick = Date.now();
  private totalMinutes = 0;
  private isStarted = false;
  private onUpdateCallback?: (minutes: number) => void;

  public init(initialMinutes = 0, onUpdate?: (minutes: number) => void) {
    if (this.isStarted) return;
    this.isStarted = true;
    this.totalMinutes = initialMinutes;
    this.onUpdateCallback = onUpdate;
    this.lastTick = Date.now();

    this.timer = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.floor((now - this.lastTick) / 1000);
      if (deltaSec > 0) {
        this.accumulatedSeconds += deltaSec;
        this.lastTick = now;

        if (this.accumulatedSeconds >= 60) {
          const addedMinutes = Math.floor(this.accumulatedSeconds / 60);
          this.accumulatedSeconds %= 60;
          this.totalMinutes += addedMinutes;
          this.persist();
        }
      }
    }, 1000);

    const handleExit = () => {
      if (this.accumulatedSeconds >= 30) {
        this.totalMinutes += 1;
        this.accumulatedSeconds = 0;
      }
      this.persistSync();
    };

    process.once("beforeExit", handleExit);
    process.once("SIGINT", handleExit);
    process.once("SIGTERM", handleExit);
  }

  public getTotalMinutes(): number {
    return this.totalMinutes;
  }

  private async persist() {
    try {
      const { config } = await initConfig();
      const nextConfig = {
        ...config,
        launcherPlaytimeMinutes: this.totalMinutes,
      };
      await saveConfig(nextConfig);
      this.onUpdateCallback?.(this.totalMinutes);
    } catch (err) {
      logger.error("tracker", "Failed to persist launcher playtime:", err);
    }
  }

  private persistSync() {
    this.destroy();
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isStarted = false;
  }
}

export const launcherTracker = new LauncherTimeTracker();
