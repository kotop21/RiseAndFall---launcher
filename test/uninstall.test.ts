import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "@/lib/config/init";
import { createDefaultProfiles } from "@/lib/config/migrate";
import type { LauncherConfig } from "@/lib/config/types";
import { compactProfilesAfterRemoval, uninstallGameProfile } from "@/lib/manager/uninstall";

describe("Manager: Game Uninstallation & Compacting", () => {
  let testRoot: string;
  let testGameDir1: string;
  let testGameDir2: string;
  let testGameDir3: string;

  beforeEach(async () => {
    testRoot = join(
      tmpdir(),
      `raf-uninstall-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    );
    testGameDir1 = join(testRoot, "slot1-game");
    testGameDir2 = join(testRoot, "slot2-game");
    testGameDir3 = join(testRoot, "slot3-game");

    await mkdir(join(testGameDir1, "Data", "Saved Games"), { recursive: true });
    await mkdir(testGameDir2, { recursive: true });
    await mkdir(testGameDir3, { recursive: true });

    await writeFile(join(testGameDir1, "RiseAndFall.exe"), "dummy exe");
    await writeFile(join(testGameDir1, "Data", "Saved Games", "save1.sav"), "save data");
    await writeFile(join(testGameDir2, "RiseAndFall.exe"), "dummy exe 2");
    await writeFile(join(testGameDir3, "RiseAndFall.exe"), "dummy exe 3");
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true }).catch(() => {});
  });

  it("fails when profile has no targetDir configured", async () => {
    const config: LauncherConfig = {
      ...DEFAULT_CONFIG,
      gameProfiles: createDefaultProfiles(),
    };

    const res = await uninstallGameProfile("slot-1", config, async () => {});
    expect(res.success).toBe(false);
    expect(res.error).toBe("TARGET_DIR_REQUIRED");
  });

  it("compactProfilesAfterRemoval shifts remaining profiles (#2 -> #1, #3 -> #2)", () => {
    const profiles = createDefaultProfiles();
    if (profiles[0]) profiles[0].path = testGameDir1;
    if (profiles[1]) profiles[1].path = testGameDir2;
    if (profiles[2]) profiles[2].path = testGameDir3;

    // Remove slot-1 (which was active)
    const res1 = compactProfilesAfterRemoval("slot-1", profiles, "slot-1");
    expect(res1.updatedProfiles[0]?.path).toBe(testGameDir2);
    expect(res1.updatedProfiles[1]?.path).toBe(testGameDir3);
    expect(res1.updatedProfiles[2]?.path).toBe("");
    expect(res1.nextActiveId).toBe("slot-1");

    // Remove slot-2 when slot-3 was active
    const res2 = compactProfilesAfterRemoval("slot-2", profiles, "slot-3");
    expect(res2.updatedProfiles[0]?.path).toBe(testGameDir1);
    expect(res2.updatedProfiles[1]?.path).toBe(testGameDir3);
    expect(res2.updatedProfiles[2]?.path).toBe("");
    // Old slot-3 shifted to slot-2, so nextActiveId should be slot-2
    expect(res2.nextActiveId).toBe("slot-2");
  });

  it("successfully cleans game files, preserves saves, and shifts remaining profiles", async () => {
    let savedConfig: LauncherConfig | undefined;
    const profiles = createDefaultProfiles();
    if (profiles[0]) profiles[0].path = testGameDir1;
    if (profiles[1]) profiles[1].path = testGameDir2;
    if (profiles[2]) profiles[2].path = testGameDir3;

    const config: LauncherConfig = {
      ...DEFAULT_CONFIG,
      activeProfileId: "slot-1",
      gameDir: testGameDir1,
      gameProfiles: profiles,
    };

    const res = await uninstallGameProfile("slot-1", config, async (cfg) => {
      savedConfig = cfg;
    });

    expect(res.success).toBe(true);
    expect(Boolean(savedConfig)).toBe(true);
    if (!savedConfig) throw new Error("Expected savedConfig");

    // Slot 1 now contains testGameDir2 (shifted up from #2)
    expect(savedConfig.gameProfiles[0]?.path).toBe(testGameDir2);
    // Slot 2 now contains testGameDir3 (shifted up from #3)
    expect(savedConfig.gameProfiles[1]?.path).toBe(testGameDir3);
    // Slot 3 is now empty
    expect(savedConfig.gameProfiles[2]?.path).toBe("");

    // Active profile is slot-1 with testGameDir2
    expect(savedConfig.activeProfileId).toBe("slot-1");
    expect(savedConfig.gameDir).toBe(testGameDir2);

    // Saves must be preserved in testGameDir1
    const saveExists = await Bun.file(
      join(testGameDir1, "Data", "Saved Games", "save1.sav"),
    ).exists();
    expect(saveExists).toBe(true);

    // Exe in testGameDir1 must be gone
    const exeExists = await Bun.file(join(testGameDir1, "RiseAndFall.exe")).exists();
    expect(exeExists).toBe(false);
  });

  it("handles uninstallation of the only configured profile", async () => {
    let savedConfig: LauncherConfig | undefined;
    const profiles = createDefaultProfiles();
    if (profiles[0]) profiles[0].path = testGameDir1;

    const config: LauncherConfig = {
      ...DEFAULT_CONFIG,
      activeProfileId: "slot-1",
      gameDir: testGameDir1,
      gameProfiles: profiles,
    };

    const res = await uninstallGameProfile("slot-1", config, async (cfg) => {
      savedConfig = cfg;
    });

    expect(res.success).toBe(true);
    expect(Boolean(savedConfig)).toBe(true);
    if (!savedConfig) throw new Error("Expected savedConfig");

    expect(savedConfig.activeProfileId).toBe("slot-1");
    expect(savedConfig.gameDir).toBe("");
    expect(savedConfig.gameProfiles[0]?.path).toBe("");
  });
});
