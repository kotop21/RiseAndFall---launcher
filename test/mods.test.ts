import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ManifestPackage } from "@/lib/api";
import { createLauncherError } from "@/lib/errors";
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
  evaluateModsState,
  extractRequiredModIds,
  formatByteProgress,
  formatByteSize,
  getModStatus,
  getRequiredModsToSync,
  installMod,
  installRequiredModsQueue,
  type ModInstallStatus,
  type ModQueueProgress,
  sortModsForDisplay,
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

describe("Mods System: Required Mods & Display Sorting", () => {
  const sampleMods: ManifestPackage[] = [
    { id: "mod_z", name: "Zulu Pack", mirrors: [] },
    { id: "mod_req_b", name: "Beta Core", mirrors: [] },
    { id: "mod_req_a", name: "Азбука Ядра", mirrors: [] },
    { id: "mod_inst_ru", name: "Яркий свет", mirrors: [] },
    { id: "mod_inst_en", name: "Camera Tweaks", mirrors: [] },
    { id: "mod_inst_ua", name: "Історія битв", mirrors: [] },
    { id: "mod_opt_pt", name: "Tradução do português do Brasil", mirrors: [] },
    { id: "mod_upd_req", name: "Обязательный Фикс", mirrors: [] },
  ];

  it("orders groups: (0) required not installed -> (1) installed/updatable -> (2) optional not installed, sorted A-Z across languages", () => {
    const requiredIds = ["mod_req_b", "mod_req_a", "mod_upd_req"];
    const statuses: Record<string, ModInstallStatus> = {
      mod_req_a: "not_installed",
      mod_req_b: "not_installed",
      mod_inst_ru: "installed",
      mod_inst_en: "installed",
      mod_inst_ua: "installed",
      mod_upd_req: "update_available",
      mod_z: "not_installed",
      mod_opt_pt: "not_installed",
    };

    const sortedUa = sortModsForDisplay(sampleMods, statuses, requiredIds, "ua");
    expect(sortedUa.map((m) => m.id)).toEqual([
      // Tier 0: Required & not installed (uk/ru Cyrillic before Latin)
      "mod_req_a", // Азбука Ядра
      "mod_req_b", // Beta Core
      // Tier 1: Installed / updatable (uk/ru Cyrillic: І -> О -> Я, then Latin: C)
      "mod_inst_ua", // Історія битв
      "mod_upd_req", // Обязательный Фикс
      "mod_inst_ru", // Яркий свет
      "mod_inst_en", // Camera Tweaks
      // Tier 2: Optional & not installed (Latin T -> Z)
      "mod_opt_pt", // Tradução do português do Brasil
      "mod_z", // Zulu Pack
    ]);

    const sortedEn = sortModsForDisplay(sampleMods, statuses, requiredIds, "en");
    expect(sortedEn.map((m) => m.id)).toEqual([
      // Tier 0 (English locale: Latin B -> Cyrillic А)
      "mod_req_b",
      "mod_req_a",
      // Tier 1 (Latin C -> Cyrillic І -> О -> Я)
      "mod_inst_en",
      "mod_inst_ua",
      "mod_upd_req",
      "mod_inst_ru",
      // Tier 2
      "mod_opt_pt",
      "mod_z",
    ]);
  });

  it("moves mod between tiers dynamically once installation or uninstallation status changes", () => {
    const mods: ManifestPackage[] = [
      { id: "mod_req", name: "Core", mirrors: [] },
      { id: "mod_a", name: "Alpha", mirrors: [] },
      { id: "mod_b", name: "Beta", mirrors: [] },
    ];
    const requiredIds = ["mod_req"];

    // Initially: mod_req not installed (Tier 0), mod_a installed (Tier 1), mod_b not installed (Tier 2)
    let statuses: Record<string, ModInstallStatus> = {
      mod_req: "not_installed",
      mod_a: "installed",
      mod_b: "not_installed",
    };
    expect(sortModsForDisplay(mods, statuses, requiredIds, "en").map((m) => m.id)).toEqual([
      "mod_req",
      "mod_a",
      "mod_b",
    ]);

    // User finishes installing mod_b -> moves from Tier 2 into Tier 1 right after Alpha ("Beta" > "Alpha")
    statuses = { ...statuses, mod_b: "installed" };
    expect(sortModsForDisplay(mods, statuses, requiredIds, "en").map((m) => m.id)).toEqual([
      "mod_req",
      "mod_a",
      "mod_b",
    ]);

    // User finishes installing required mod_req ("Core") -> moves from Tier 0 into Tier 1 alphabetically after Beta!
    statuses = { ...statuses, mod_req: "installed" };
    expect(sortModsForDisplay(mods, statuses, requiredIds, "en").map((m) => m.id)).toEqual([
      "mod_a",
      "mod_b",
      "mod_req",
    ]);

    // User uninstalls mod_a ("Alpha") -> moves from Tier 1 to Tier 2
    statuses = { ...statuses, mod_a: "not_installed" };
    expect(sortModsForDisplay(mods, statuses, requiredIds, "en").map((m) => m.id)).toEqual([
      "mod_b",
      "mod_req",
      "mod_a",
    ]);
  });
});

describe("Mods System: Required Mods Sync & Progress Formatting", () => {
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

  it("formats byte sizes and download progress cleanly", () => {
    expect(formatByteSize(undefined)).toBe("—");
    expect(formatByteSize(512 * 1024)).toBe("512 KB");
    expect(formatByteSize(12.5 * 1024 * 1024)).toBe("12.5 MB");
    expect(formatByteSize("15 MB")).toBe("15 MB");

    expect(formatByteProgress(5 * 1024 * 1024, 10 * 1024 * 1024)).toBe("5.0 / 10.0 MB");
    expect(formatByteProgress(256 * 1024, 512 * 1024)).toBe("256 / 512 KB");
    expect(formatByteProgress(2 * 1024 * 1024, undefined)).toBe("2.0 MB");
  });

  it("extracts deduplicated required mod IDs and finds missing or outdated required mods", async () => {
    const fileA = join(TEST_DIR, "a.big");
    await writeFile(fileA, "mod-a-content", "utf-8");
    const hashA = await calculateFileSha256(fileA);
    expect(hashA).toBeTruthy();

    const fileB = join(TEST_DIR, "b.big");
    await writeFile(fileB, "mod-b-old-content", "utf-8");
    const hashB = await calculateFileSha256(fileB);
    expect(hashB).toBeTruthy();

    await recordInstalledMod(TEST_DIR, "mod_a", hashA || "", ["a.big"], "a.big");
    await recordInstalledMod(TEST_DIR, "mod_b", hashB || "", ["b.big"], "b.big");

    const manifest = {
      version: "1.0.0",
      required_mods: ["mod_a", "mod_b", "mod_b", "mod_c", "mod_missing_in_packages"],
      packages: [
        { id: "game", name: "Base", mirrors: [] },
        {
          id: "mod_a",
          name: "Mod A",
          mirrors: ["https://a"],
          check_file: "a.big",
          hash: hashA || "",
        },
        {
          id: "mod_b",
          name: "Mod B",
          mirrors: ["https://b"],
          check_file: "b.big",
          hash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
        { id: "mod_c", name: "Mod C", mirrors: ["https://c"], check_file: "c.big", hash: "1234" },
        {
          id: "mod_opt",
          name: "Optional",
          mirrors: ["https://opt"],
          check_file: "opt.big",
          hash: "abcd",
        },
      ],
    };

    expect(extractRequiredModIds(manifest)).toEqual([
      "mod_a",
      "mod_b",
      "mod_c",
      "mod_missing_in_packages",
    ]);

    const snapshot = await evaluateModsState(TEST_DIR, manifest);
    expect(snapshot.statuses.mod_a).toBe("installed");
    expect(snapshot.statuses.mod_b).toBe("update_available");
    expect(snapshot.statuses.mod_c).toBe("not_installed");

    const pending = await getRequiredModsToSync(TEST_DIR, manifest);
    expect(pending.map((m) => m.id)).toEqual(["mod_b", "mod_c"]);
  });

  it("installs required mods sequentially, stops on error, and skips completed mods on retry", async () => {
    const mod1: ManifestPackage = {
      id: "mod_first",
      name: "First Mod",
      mirrors: ["https://mirror/1.zip"],
      check_file: "first.big",
      hash: "h1",
    };
    const mod2: ManifestPackage = {
      id: "mod_second",
      name: "Second Mod",
      mirrors: ["https://mirror/2.zip"],
      check_file: "second.big",
      hash: "h2",
    };
    const manifest = {
      version: "1.0.0",
      required_mods: ["mod_first", "mod_second"],
      packages: [mod1, mod2],
    };

    const events: ModQueueProgress[] = [];
    let secondModShouldFail = true;

    const fakeInstallFn: typeof installMod = async (dir, mod, opts) => {
      if (mod.id === "mod_first") {
        opts?.onProgress?.({
          phase: "downloading",
          message: "dl",
          percent: 50,
          bytesDownloaded: 512 * 1024,
          totalBytes: 1024 * 1024,
        });
        opts?.onProgress?.({
          phase: "extracting",
          message: "extract",
          percent: 100,
        });
        const f = join(dir, "first.big");
        await writeFile(f, "first-v1", "utf-8");
        const h = await calculateFileSha256(f);
        mod1.hash = h || "h1";
        await recordInstalledMod(dir, "mod_first", mod1.hash, ["first.big"], "first.big");
        return { success: true };
      }

      if (secondModShouldFail) {
        return {
          success: false,
          error: createLauncherError("DOWNLOAD_FAILED", "Network dropped"),
        };
      }

      const f = join(dir, "second.big");
      await writeFile(f, "second-v1", "utf-8");
      const h = await calculateFileSha256(f);
      mod2.hash = h || "h2";
      await recordInstalledMod(dir, "mod_second", mod2.hash, ["second.big"], "second.big");
      return { success: true };
    };

    const firstAttempt = await installRequiredModsQueue(TEST_DIR, [mod1, mod2], {
      installFn: fakeInstallFn,
      onProgress: (p) => events.push(p),
    });

    expect(firstAttempt.success).toBe(false);
    expect(firstAttempt.completedIds).toEqual(["mod_first"]);
    expect(firstAttempt.failedMod?.id).toBe("mod_second");
    expect(
      events.some((e) => e.currentIndex === 1 && e.totalCount === 2 && e.phase === "extracting"),
    ).toBe(true);

    // Retry phase: re-evaluate remaining mods from disk + manifest
    const remaining = await getRequiredModsToSync(TEST_DIR, manifest);
    expect(remaining.map((m) => m.id)).toEqual(["mod_second"]);

    secondModShouldFail = false;
    const retryEvents: ModQueueProgress[] = [];
    const retryAttempt = await installRequiredModsQueue(TEST_DIR, remaining, {
      installFn: fakeInstallFn,
      onProgress: (p) => retryEvents.push(p),
    });

    expect(retryAttempt.success).toBe(true);
    expect(retryAttempt.completedIds).toEqual(["mod_second"]);
    expect(retryEvents[0]?.currentIndex).toBe(1);
    expect(retryEvents[0]?.totalCount).toBe(1);
    expect(await getRequiredModsToSync(TEST_DIR, manifest)).toEqual([]);
  });
});
