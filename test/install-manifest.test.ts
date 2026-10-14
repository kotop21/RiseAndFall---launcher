import { describe, expect, it } from "bun:test";
import { exists, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import {
  getManifestDir,
  getManifestPath,
  hasInstallManifest,
  hasInstallManifestSync,
  isExcludedManifestPath,
  loadInstallManifest,
  recordInstalledFiles,
  removeInstalledFiles,
  saveInstallManifest,
  scanFileStats,
} from "@/lib/manager/install-manifest";

describe("Install Manifest: Path & Exclusion Rules", () => {
  it("resolves manifest directory and file paths correctly", () => {
    const base = "/test/RiseAndFall-launcher";
    expect(getManifestDir(base)).toBe("/test/RiseAndFall-launcher/.launcher");
    expect(getManifestPath(base)).toBe(
      "/test/RiseAndFall-launcher/.launcher/install_manifest.json",
    );
  });

  it("identifies excluded paths properly", () => {
    expect(isExcludedManifestPath(".launcher")).toBe(true);
    expect(isExcludedManifestPath(".launcher/install_manifest.json")).toBe(true);
    expect(isExcludedManifestPath("Data/Saved Games")).toBe(true);
    expect(isExcludedManifestPath("Data/Saved Games/save.sav")).toBe(true);
    expect(isExcludedManifestPath("Data\\Saved Games\\save.sav")).toBe(true);
    expect(isExcludedManifestPath(".temp_trash_12345")).toBe(true);
    expect(isExcludedManifestPath("pkg_game_12345.zip")).toBe(true);

    expect(isExcludedManifestPath("RiseAndFall.exe")).toBe(false);
    expect(isExcludedManifestPath("Data/Sound/intro.mp3")).toBe(false);
    expect(isExcludedManifestPath("version.txt")).toBe(false);
  });
});

describe("Install Manifest: Serialization & Deserialization", () => {
  it("saves, checks existence, and loads manifest accurately", async () => {
    const tempDir = join(tmpdir(), `raf-manifest-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      expect(hasInstallManifestSync(tempDir)).toBe(false);
      expect(await hasInstallManifest(tempDir)).toBe(false);
      expect(await loadInstallManifest(tempDir)).toBeNull();

      const success = await saveInstallManifest(tempDir, {
        version: "2.0.0",
        updatedAt: 1234567890,
        packages: ["game"],
        files: ["RiseAndFall.exe", "Data\\Sound\\intro.mp3", "RiseAndFall.exe"], // includes backslash and duplicate
      });

      expect(success).toBe(true);
      expect(hasInstallManifestSync(tempDir)).toBe(true);
      expect(await hasInstallManifest(tempDir)).toBe(true);

      const loaded = await loadInstallManifest(tempDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.version).toBe("2.0.0");
      expect(loaded?.packages).toEqual(["game"]);
      // Deduplicated, sorted, normalized to POSIX
      expect(loaded?.files).toEqual(["Data/Sound/intro.mp3", "RiseAndFall.exe"]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Install Manifest: Cumulative File Recording & Pre-existing User Files", () => {
  it("records installed files across packages and excludes untouched user files", async () => {
    const tempDir = join(tmpdir(), `raf-manifest-record-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // 1. Pre-existing user files (e.g. custom user files before install)
      const userFile = join(tempDir, "user_custom.cfg");
      await writeFile(userFile, "USER_CONFIG");
      const userSavedDir = join(tempDir, "Data", "Saved Games");
      await mkdir(userSavedDir, { recursive: true });
      await writeFile(join(userSavedDir, "slot1.sav"), "SAVE_DATA");

      // Snapshot initial files
      const initialStats = await scanFileStats(tempDir);
      expect(initialStats.has("user_custom.cfg")).toBe(true);
      // Saved Games must be excluded from stats
      expect(initialStats.has("Data/Saved Games/slot1.sav")).toBe(false);

      // 2. Package 1 ('game') extracted
      await writeFile(join(tempDir, "RiseAndFall.exe"), "EXE_BYTES");
      await writeFile(join(tempDir, "version.txt"), "2.0.0");
      const pkg1Manifest = await recordInstalledFiles(tempDir, "game", initialStats);
      expect(pkg1Manifest).not.toBeNull();
      expect(pkg1Manifest?.packages).toEqual(["game"]);
      expect(pkg1Manifest?.files).toEqual(["RiseAndFall.exe", "version.txt"]);
      // user_custom.cfg and slot1.sav must NOT be in manifest
      expect(pkg1Manifest?.files.includes("user_custom.cfg")).toBe(false);

      // 3. Package 2 ('lang_ru') extracted
      const langDir = join(tempDir, "Data", "Lang");
      await mkdir(langDir, { recursive: true });
      await writeFile(join(langDir, "strings.txt"), "RU_TEXT");
      const pkg2Manifest = await recordInstalledFiles(tempDir, "lang_ru", initialStats);
      expect(pkg2Manifest?.packages).toEqual(["game", "lang_ru"]);
      expect(pkg2Manifest?.files).toEqual([
        "Data/Lang/strings.txt",
        "RiseAndFall.exe",
        "version.txt",
      ]);

      // 4. Package 3 ('mod_bfm') extracted
      await writeFile(join(tempDir, "mod.txt"), "MOD_DATA");
      const pkg3Manifest = await recordInstalledFiles(tempDir, "mod_bfm", initialStats);
      expect(pkg3Manifest?.packages).toEqual(["game", "lang_ru", "mod_bfm"]);
      expect(pkg3Manifest?.files).toContain("mod.txt");
      expect(pkg3Manifest?.files.length).toBe(4);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Install Manifest: Safe Removal & Preservation of User Files", () => {
  it("removes only manifest files and empty dirs, preserving user files and Data/Saved Games", async () => {
    const tempDir = join(tmpdir(), `raf-manifest-remove-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      // Create game files
      await writeFile(join(tempDir, "RiseAndFall.exe"), "EXE_BYTES");
      const soundDir = join(tempDir, "Data", "Sound", "Intro");
      await mkdir(soundDir, { recursive: true });
      await writeFile(join(soundDir, "intro.mp3"), "INTRO_SOUND");

      // Create user files that should NOT be touched
      const userScreenshotsDir = join(tempDir, "Screenshots");
      await mkdir(userScreenshotsDir, { recursive: true });
      const userScreenshot = join(userScreenshotsDir, "victory.png");
      await writeFile(userScreenshot, "IMAGE_BYTES");

      const userMapDir = join(tempDir, "Data", "CustomMaps");
      await mkdir(userMapDir, { recursive: true });
      const userMap = join(userMapDir, "arena.map");
      await writeFile(userMap, "MAP_BYTES");

      const savedGamesDir = join(tempDir, "Data", "Saved Games");
      await mkdir(savedGamesDir, { recursive: true });
      const userSave = join(savedGamesDir, "campaign.sav");
      await writeFile(userSave, "SAVE_DATA");

      // Save manifest recording only the game files
      await saveInstallManifest(tempDir, {
        version: "2.0.0",
        updatedAt: Date.now(),
        packages: ["game"],
        files: ["RiseAndFall.exe", "Data/Sound/Intro/intro.mp3"],
      });

      // Verify manifest exists
      expect(hasInstallManifestSync(tempDir)).toBe(true);

      // Execute cleanGameDirectory (which will branch to removeInstalledFiles)
      const cleanResult = await cleanGameDirectory(tempDir);
      expect(cleanResult).toBe(true);

      // 1. Manifest-tracked files must be gone
      expect(await exists(join(tempDir, "RiseAndFall.exe"))).toBe(false);
      expect(await exists(join(soundDir, "intro.mp3"))).toBe(false);

      // 2. Empty parent directory of deleted file must be pruned
      expect(await exists(soundDir)).toBe(false);
      expect(await exists(join(tempDir, "Data", "Sound"))).toBe(false);

      // 3. User files and folders MUST BE PRESERVED
      expect(await exists(userScreenshot)).toBe(true);
      expect(await readFile(userScreenshot, "utf-8")).toBe("IMAGE_BYTES");

      expect(await exists(userMap)).toBe(true);
      expect(await readFile(userMap, "utf-8")).toBe("MAP_BYTES");

      expect(await exists(userSave)).toBe(true);
      expect(await readFile(userSave, "utf-8")).toBe("SAVE_DATA");

      // 4. Data directory still exists because it contains CustomMaps and Saved Games
      expect(await exists(join(tempDir, "Data"))).toBe(true);

      // 5. Manifest file and .launcher folder must be cleaned up
      expect(await exists(getManifestPath(tempDir))).toBe(false);
      expect(await exists(getManifestDir(tempDir))).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("cleans up empty game directory completely when no user files remain", async () => {
    const tempDir = join(tmpdir(), `raf-manifest-fullclean-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    try {
      await writeFile(join(tempDir, "RiseAndFall.exe"), "EXE_BYTES");
      const dataDir = join(tempDir, "Data", "Sound");
      await mkdir(dataDir, { recursive: true });
      await writeFile(join(dataDir, "intro.mp3"), "INTRO_SOUND");

      await saveInstallManifest(tempDir, {
        version: "2.0.0",
        updatedAt: Date.now(),
        packages: ["game"],
        files: ["RiseAndFall.exe", "Data/Sound/intro.mp3"],
      });

      const res = await removeInstalledFiles(tempDir);
      expect(res).toBe(true);

      expect(await exists(join(tempDir, "RiseAndFall.exe"))).toBe(false);
      expect(await exists(join(tempDir, "Data"))).toBe(false);
      expect(await exists(getManifestDir(tempDir))).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
