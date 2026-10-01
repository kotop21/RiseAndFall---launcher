import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pack, unpack } from "msgpackr";
import { getConfigPath } from "@/lib/config/dir";
import { initConfig } from "@/lib/config/init";
import { saveConfig } from "@/lib/config/save";
import type { LauncherConfig } from "@/lib/config/types";
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
          // Только реактивное обновление в памяти, без дисковых I/O
          this.onUpdateCallback?.(this.totalMinutes);
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

  public async saveToDisk(): Promise<void> {
    try {
      const { config } = await initConfig();
      if (config.launcherPlaytimeMinutes === this.totalMinutes) return;
      const nextConfig = {
        ...config,
        launcherPlaytimeMinutes: this.totalMinutes,
      };
      await saveConfig(nextConfig);
      logger.info("tracker", `Persisted launcher playtime: ${this.totalMinutes} min`);
    } catch (err) {
      logger.error("tracker", "Failed to persist launcher playtime:", err);
    }
  }

  private persistSync() {
    this.destroy();
    try {
      const cfgPath = getConfigPath();
      if (existsSync(cfgPath)) {
        const raw = readFileSync(cfgPath);
        const data = (unpack(raw) || {}) as Partial<LauncherConfig>;
        data.launcherPlaytimeMinutes = this.totalMinutes;
        writeFileSync(cfgPath, pack(data));
      }
    } catch {}
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
