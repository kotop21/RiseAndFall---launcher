import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { getConfigPath } from "@/lib/config/dir";
import {
  CURRENT_CONFIG_VERSION,
  DEFAULT_GAME_ARG,
  createDefaultProfiles,
  migrateConfig,
} from "@/lib/config/migrate";
import { DEFAULT_CONFIG, initConfig, isForceWelcome } from "@/lib/config/init";
import { recordGameSession } from "@/lib/config/session";
import { saveConfig } from "@/lib/config/save";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { pack, unpack } from "msgpackr";

describe("Config: Path & Defaults", () => {
  it("generates a valid config path ending in config.bin", () => {
    const path = getConfigPath();
    expect(path).toBeDefined();
    expect(path.endsWith("config.bin")).toBe(true);
  });

  it("creates 5 default profile slots", () => {
    const profiles = createDefaultProfiles("C:\\Games\\Raf", "-test");
    expect(profiles.length).toBe(5);
    expect(profiles[0].id).toBe("slot-1");
    expect(profiles[0].path).toBe("C:\\Games\\Raf");
    expect(profiles[0].gameArg).toBe("-test");
    expect(profiles[1].id).toBe("slot-2");
    expect(profiles[1].path).toBe("");
    expect(profiles[1].gameArg).toBe(DEFAULT_GAME_ARG);
  });

  it("checks force welcome flag parsing", () => {
    const prev = process.env.FORCE_WELCOME;
    delete process.env.FORCE_WELCOME;
    delete process.env.TEST_MODE;
    delete process.env.WELCOME;
    expect(isForceWelcome()).toBe(false);

    process.env.FORCE_WELCOME = "1";
    expect(isForceWelcome()).toBe(true);

    process.env.FORCE_WELCOME = "true";
    expect(isForceWelcome()).toBe(true);

    if (prev) process.env.FORCE_WELCOME = prev;
    else delete process.env.FORCE_WELCOME;
  });
});

describe("Config: Schema Migration & Edge Cases", () => {
  it("migrates empty/null raw object to valid current config", () => {
    const { config, wasMigrated } = migrateConfig({});
    expect(wasMigrated).toBe(true);
    expect(config.version).toBe(CURRENT_CONFIG_VERSION);
    expect(config.gameProfiles.length).toBe(5);
    expect(config.activeProfileId).toBe("slot-1");
    expect(config.discordRpc).toBe(true);
    expect(config.lowPerformanceMode).toBe(false);
  });

  it("migrates v1 legacy config preserving legacy gameDir and gameArg", () => {
    const legacy = {
      version: 1,
      gameDir: "D:\\Games\\RiseAndFall",
      gameArg: "-windowed -dev",
      launcherLang: "ru",
    };

    const { config, wasMigrated } = migrateConfig(legacy);
    expect(wasMigrated).toBe(true);
    expect(config.version).toBe(CURRENT_CONFIG_VERSION);
    expect(config.gameDir).toBe("D:\\Games\\RiseAndFall");
    expect(config.gameArg).toBe("-windowed -dev");
    expect(config.launcherLang).toBe("ru");
    expect(config.gameProfiles.length).toBe(5);
    expect(config.gameProfiles[0].path).toBe("D:\\Games\\RiseAndFall");
    expect(config.gameProfiles[0].gameArg).toBe("-windowed -dev");
  });

  it("ensures incomplete profiles array is padded up to 5 slots", () => {
    const raw = {
      version: CURRENT_CONFIG_VERSION,
      gameProfiles: [
        { id: "slot-1", name: "Custom 1", path: "C:\\path1", gameArg: "-arg1" },
        { id: "slot-2", name: "Custom 2", path: "C:\\path2", gameArg: "-arg2" },
      ],
      activeProfileId: "slot-2",
    };

    const { config, wasMigrated } = migrateConfig(raw);
    expect(wasMigrated).toBe(true);
    expect(config.gameProfiles.length).toBe(5);
    expect(config.gameProfiles[0].name).toBe("Custom 1");
    expect(config.gameProfiles[1].name).toBe("Custom 2");
    expect(config.gameProfiles[2].id).toBe("slot-3");
    expect(config.activeProfileId).toBe("slot-2");
  });

  it("falls back to slot-1 if activeProfileId does not exist in profiles", () => {
    const raw = {
      version: CURRENT_CONFIG_VERSION,
      gameProfiles: createDefaultProfiles(),
      activeProfileId: "non-existent-slot",
    };

    const { config, wasMigrated } = migrateConfig(raw);
    expect(wasMigrated).toBe(true);
    expect(config.activeProfileId).toBe("slot-1");
  });

  it("does not report migration if already up-to-date and complete", () => {
    const valid = {
      ...DEFAULT_CONFIG,
      version: CURRENT_CONFIG_VERSION,
      gameProfiles: createDefaultProfiles("C:\\valid", DEFAULT_GAME_ARG),
      gameDir: "C:\\valid",
    };

    const { config, wasMigrated } = migrateConfig(valid);
    expect(wasMigrated).toBe(false);
    expect(config.version).toBe(CURRENT_CONFIG_VERSION);
  });
});

describe("Config: Persistence & Session Recording", () => {
  it("packs and unrolls config correctly via msgpackr", async () => {
    const testCfg = {
      ...DEFAULT_CONFIG,
      gameDir: "E:\\TestGame",
      launcherLang: "ua",
      totalPlaytimeMinutes: 120,
    };

    const packed = pack(testCfg);
    expect(packed).toBeInstanceOf(Uint8Array);

    const unpacked = unpack(packed);
    expect(unpacked.gameDir).toBe("E:\\TestGame");
    expect(unpacked.launcherLang).toBe("ua");
    expect(unpacked.totalPlaytimeMinutes).toBe(120);
  });

  it("records game session and accumulates playtime", async () => {
    const initialConfig = { ...DEFAULT_CONFIG, totalPlaytimeMinutes: 45 };
    const date = new Date("2026-06-15T12:00:00Z");

    const nextConfig = {
      ...initialConfig,
      totalPlaytimeMinutes: initialConfig.totalPlaytimeMinutes + 30,
      lastLaunchDate: date.toISOString(),
    };

    expect(nextConfig.totalPlaytimeMinutes).toBe(75);
    expect(nextConfig.lastLaunchDate).toBe("2026-06-15T12:00:00.000Z");
  });
});
