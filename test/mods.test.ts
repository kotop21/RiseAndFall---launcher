import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ManifestPackage } from "@/lib/api";
import {
  ensureLauncherDir,
  getLauncherDir,
  getLauncherFilePath,
  pruneLauncherDirIfEmpty,
  readLauncherJson,
  writeLauncherJson,
} from "@/lib/manager/launcher-storage";
import {
  checkAllModsStatus,
  getModStatus,
  installMod,
  syncLocalModsWithDisk,
  uninstallMod,
} from "@/lib/manager/mod-service";
import {
  loadModsManifest,
  recordInstalledMod,
  removeInstalledMod,
} from "@/lib/manager/mods-storage";
import { calculateFileSha256 } from "@/lib/utils/hash";

const TEST_DIR = join(import.meta.dir, ".tmp-mods-test");

describe("Mods System: Hash Calculation", () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("calculates SHA-256 for existing file", async () => {
    const filePath = join(TEST_DIR, "test.txt");
    await writeFile(filePath, "hello world", "utf-8");

    const hash = await calculateFileSha256(filePath);
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("returns null for non-existent or empty path", async () => {
    expect(await calculateFileSha256("")).toBeNull();
    expect(await calculateFileSha256(join(TEST_DIR, "missing.txt"))).toBeNull();
  });
});

describe("Mods System: Launcher Storage", () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("ensures launcher dir exists and resolves correct paths", async () => {
    const dir = getLauncherDir(TEST_DIR);
    expect(dir.endsWith(".launcher")).toBe(true);
    expect(getLauncherFilePath(TEST_DIR, "mods.json")).toBe(join(dir, "mods.json"));

    const ok = await ensureLauncherDir(TEST_DIR);
    expect(ok).toBe(true);
    expect(existsSync(dir)).toBe(true);
  });

  it("reads and writes JSON data safely", async () => {
    const payload = { test: 123, name: "raf-mod" };
    const saved = await writeLauncherJson(TEST_DIR, "sample.json", payload);
    expect(saved).toBe(true);

    const loaded = await readLauncherJson<{ test: number; name: string }>(TEST_DIR, "sample.json");
    expect(loaded).toEqual(payload);
  });

  it("returns null when reading non-existent JSON file", async () => {
    const data = await readLauncherJson(TEST_DIR, "non-existent.json");
    expect(data).toBeNull();
  });

  it("prunes launcher dir if empty", async () => {
    await ensureLauncherDir(TEST_DIR);
    const dir = getLauncherDir(TEST_DIR);
    expect(existsSync(dir)).toBe(true);

    const pruned = await pruneLauncherDirIfEmpty(TEST_DIR);
    expect(pruned).toBe(true);
    expect(existsSync(dir)).toBe(false);
  });
});

describe("Mods System: Manifest & Records", () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("returns empty default manifest if file does not exist", async () => {
    const manifest = await loadModsManifest(TEST_DIR);
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.mods).toEqual({});
  });

  it("records, persists and loads installed mod", async () => {
    const saved = await recordInstalledMod(
      TEST_DIR,
      "mod_bfm",
      "HASH123",
      ["Data/bfm.dll", "Data/bfm.cfg"],
      "Data/bfm.dll",
    );
    expect(saved).toBe(true);

    const manifest = await loadModsManifest(TEST_DIR);
    const mod = manifest.mods.mod_bfm;
    expect(mod).toBeDefined();
    expect(mod?.hash).toBe("hash123");
    expect(mod?.check_file).toBe("Data/bfm.dll");
    expect(mod?.files).toEqual(["Data/bfm.cfg", "Data/bfm.dll"]);
  });

  it("removes installed mod files safely and preserves non-mod files", async () => {
    const modFile = join(TEST_DIR, "Data", "mod.dll");
    const userFile = join(TEST_DIR, "Data", "Saved Games", "save1.sav");

    await mkdir(join(TEST_DIR, "Data", "Saved Games"), { recursive: true });
    await writeFile(modFile, "mod content", "utf-8");
    await writeFile(userFile, "user save", "utf-8");

    await recordInstalledMod(TEST_DIR, "mod_test", "hash", ["Data/mod.dll"], "Data/mod.dll");

    const result = await removeInstalledMod(TEST_DIR, "mod_test");
    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(1);

    expect(existsSync(modFile)).toBe(false);
    expect(existsSync(userFile)).toBe(true);

    const manifest = await loadModsManifest(TEST_DIR);
    expect(manifest.mods.mod_test).toBeUndefined();
  });
});

describe("Mods System: Sync & Status Detection", () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("returns not_installed if mod is not in configuration", async () => {
    const modPackage: ManifestPackage = {
      id: "mod_lang_br",
      name: "Brazilian Language Pack",
      mirrors: ["http://example.com/mod.zip"],
      hash: "abc12345",
      check_file: "Data/lang.dll",
    };

    const status = await getModStatus(TEST_DIR, modPackage);
    expect(status).toBe("not_installed");
  });

  it("returns installed if mod is in configuration with matching hash and file exists", async () => {
    const modFile = join(TEST_DIR, "Data", "mod.dll");
    await mkdir(join(TEST_DIR, "Data"), { recursive: true });
    await writeFile(modFile, "content", "utf-8");

    const hash = (await calculateFileSha256(modFile)) ?? "";

    await recordInstalledMod(TEST_DIR, "mod_test", hash, ["Data/mod.dll"], "Data/mod.dll");

    const modPackage: ManifestPackage = {
      id: "mod_test",
      name: "Test Mod",
      mirrors: ["http://example.com/mod.zip"],
      hash,
      check_file: "Data/mod.dll",
    };

    const status = await getModStatus(TEST_DIR, modPackage);
    expect(status).toBe("installed");

    const batchStatuses = await checkAllModsStatus(TEST_DIR, [modPackage]);
    expect(batchStatuses.mod_test).toBe("installed");
  });

  it("returns update_available if mod hash in config differs from API manifest", async () => {
    const modFile = join(TEST_DIR, "Data", "mod.dll");
    await mkdir(join(TEST_DIR, "Data"), { recursive: true });
    await writeFile(modFile, "old content", "utf-8");

    const oldHash = (await calculateFileSha256(modFile)) ?? "";

    await recordInstalledMod(TEST_DIR, "mod_test", oldHash, ["Data/mod.dll"], "Data/mod.dll");

    const modPackage: ManifestPackage = {
      id: "mod_test",
      name: "Test Mod",
      mirrors: ["http://example.com/mod.zip"],
      hash: "new_api_hash_12345",
      check_file: "Data/mod.dll",
    };

    const status = await getModStatus(TEST_DIR, modPackage);
    expect(status).toBe("update_available");
  });

  it("syncLocalModsWithDisk updates config hash when user edits file manually on disk", async () => {
    const modFile = join(TEST_DIR, "Data", "mod.dll");
    await mkdir(join(TEST_DIR, "Data"), { recursive: true });
    await writeFile(modFile, "initial content", "utf-8");

    const initialHash = (await calculateFileSha256(modFile)) ?? "";

    await recordInstalledMod(TEST_DIR, "mod_test", initialHash, ["Data/mod.dll"], "Data/mod.dll");

    // User modifies file on disk
    await writeFile(modFile, "user modified content", "utf-8");
    const modifiedHash = (await calculateFileSha256(modFile)) ?? "";
    expect(modifiedHash).not.toBe(initialHash);

    // Sync before manifest fetch
    const syncedManifest = await syncLocalModsWithDisk(TEST_DIR);
    expect(syncedManifest.mods.mod_test?.hash).toBe(modifiedHash);

    // Reload from disk to verify persistence
    const reloaded = await loadModsManifest(TEST_DIR);
    expect(reloaded.mods.mod_test?.hash).toBe(modifiedHash);
  });

  it("syncLocalModsWithDisk cleans up record if check file was deleted manually", async () => {
    const modFile = join(TEST_DIR, "Data", "mod.dll");
    await mkdir(join(TEST_DIR, "Data"), { recursive: true });
    await writeFile(modFile, "content", "utf-8");

    await recordInstalledMod(TEST_DIR, "mod_test", "somehash", ["Data/mod.dll"], "Data/mod.dll");

    // User deletes file
    await rm(modFile);

    const synced = await syncLocalModsWithDisk(TEST_DIR);
    expect(synced.mods.mod_test).toBeUndefined();
  });
});

describe("Mods System: Error Handling", () => {
  it("installMod fails cleanly on non-existent directory", async () => {
    const modPackage: ManifestPackage = {
      id: "mod_test",
      name: "Test Mod",
      mirrors: ["http://example.com/mod.zip"],
    };

    const res = await installMod("/path/does/not/exist/surely", modPackage);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TARGET_DIR_INVALID");
  });

  it("installMod fails cleanly when no mirrors provided", async () => {
    const modPackage: ManifestPackage = {
      id: "mod_test",
      name: "Test Mod",
      mirrors: [],
    };

    const res = await installMod(import.meta.dir, modPackage);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("MIRRORS_UNAVAILABLE");
  });

  it("installMod handles aborted signal gracefully", async () => {
    const controller = new AbortController();
    controller.abort();

    const modPackage: ManifestPackage = {
      id: "mod_test",
      name: "Test Mod",
      mirrors: ["http://example.com/mod.zip"],
    };

    const res = await installMod(import.meta.dir, modPackage, {
      signal: controller.signal,
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("INSTALL_CANCELLED");
  });

  it("uninstallMod fails cleanly on non-existent directory", async () => {
    const res = await uninstallMod("/path/does/not/exist/surely", "mod_123");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TARGET_DIR_INVALID");
  });
});
