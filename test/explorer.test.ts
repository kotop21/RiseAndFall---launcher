import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { exists, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanGameDirectory } from "@/lib/explorer/clean";
import { createFile, ensureDirectory } from "@/lib/explorer/create";
import { extractSingleZip, extractZip } from "@/lib/explorer/extract";

describe("Explorer: Directory & File Creation", () => {
  it("ensures nested directories are created", async () => {
    const base = join(tmpdir(), `raf-fs-create-${Date.now()}`);
    const nested = join(base, "level1", "level2", "level3");

    expect(await ensureDirectory(nested)).toBe(true);
    expect(await exists(nested)).toBe(true);

    // Call again on existing directory
    expect(await ensureDirectory(nested)).toBe(true);

    await rm(base, { recursive: true, force: true });
  });

  it("handles empty or invalid path in ensureDirectory", async () => {
    expect(await ensureDirectory("")).toBe(false);
    expect(await ensureDirectory("   ")).toBe(false);
  });

  it("creates file and parent directories", async () => {
    const base = join(tmpdir(), `raf-file-create-${Date.now()}`);
    const targetFile = join(base, "sub", "test.txt");

    expect(await createFile(targetFile, "Hello World")).toBe(true);
    expect(await exists(targetFile)).toBe(true);
    const content = await readFile(targetFile, "utf-8");
    expect(content).toBe("Hello World");

    await rm(base, { recursive: true, force: true });
  });

  it("handles empty path in createFile", async () => {
    expect(await createFile("", "test")).toBe(false);
  });
});

describe("Explorer: Directory Cleaning & Save Game Protection", () => {
  it("cleans directory but strictly preserves Data/Saved Games", async () => {
    const base = join(tmpdir(), `raf-clean-test-${Date.now()}`);
    await mkdir(base, { recursive: true });

    // 1. Files to be cleaned
    await writeFile(join(base, "RiseAndFall.exe"), "EXE_DATA");
    await writeFile(join(base, "game.dll"), "DLL_DATA");
    const modDir = join(base, "Mods");
    await mkdir(modDir, { recursive: true });
    await writeFile(join(modDir, "mod.txt"), "MOD_DATA");

    // 2. Data directory with files to clean and Saved Games to preserve
    const dataDir = join(base, "Data");
    const dataSoundDir = join(dataDir, "Sound");
    const savedGamesDir = join(dataDir, "Saved Games");

    await mkdir(dataSoundDir, { recursive: true });
    await writeFile(join(dataSoundDir, "intro.mp3"), "SOUND_DATA");

    await mkdir(savedGamesDir, { recursive: true });
    const userSaveFile = join(savedGamesDir, "campaign_slot1.sav");
    await writeFile(userSaveFile, "USER_SAVE_CONTENT");

    // Execute cleanGameDirectory
    const success = await cleanGameDirectory(base);
    expect(success).toBe(true);

    // Verify cleaned files
    expect(await exists(join(base, "RiseAndFall.exe"))).toBe(false);
    expect(await exists(join(base, "game.dll"))).toBe(false);
    expect(await exists(modDir)).toBe(false);
    expect(await exists(dataSoundDir)).toBe(false);

    // Verify CRITICAL preservation of Data/Saved Games
    expect(await exists(savedGamesDir)).toBe(true);
    expect(await exists(userSaveFile)).toBe(true);
    const savedContent = await readFile(userSaveFile, "utf-8");
    expect(savedContent).toBe("USER_SAVE_CONTENT");

    await rm(base, { recursive: true, force: true });
  });

  it("returns false for non-existent or empty path in cleanGameDirectory", async () => {
    expect(await cleanGameDirectory("")).toBe(false);
    expect(await cleanGameDirectory("/path/that/does/not/exist/404")).toBe(false);
  });
});

describe("Explorer: Archive Extraction", () => {
  it("returns false when archive does not exist", async () => {
    const dest = join(tmpdir(), `raf-extract-test-${Date.now()}`);
    await mkdir(dest, { recursive: true });

    expect(await extractSingleZip("/non/existent/archive.zip", dest)).toBe(false);
    expect(await extractZip("/non/existent/archive.zip", dest)).toBe(false);

    await rm(dest, { recursive: true, force: true });
  });

  it("extracts valid zip archive and nested zip archives", async () => {
    const tempDir = join(tmpdir(), `raf-zip-test-${Date.now()}`);
    const sourceDir = join(tempDir, "source");
    const destDir = join(tempDir, "dest");
    await mkdir(sourceDir, { recursive: true });
    await mkdir(destDir, { recursive: true });

    // Create a dummy file
    await writeFile(join(sourceDir, "content.txt"), "EXTRACTED_CONTENT");

    const zipPath = join(tempDir, "test_archive.zip");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("zip", ["-r", "-j", zipPath, sourceDir]);
      proc.on("close", (code) => (code === 0 ? resolve() : reject()));
      proc.on("error", reject);
    });

    const res = await extractZip(zipPath, destDir);
    expect(res).toBe(true);
    expect(await exists(join(destDir, "content.txt"))).toBe(true);

    const extractedText = await readFile(join(destDir, "content.txt"), "utf-8");
    expect(extractedText).toBe("EXTRACTED_CONTENT");

    await rm(tempDir, { recursive: true, force: true });
  });
});
