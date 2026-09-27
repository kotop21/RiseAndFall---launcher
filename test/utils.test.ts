import { describe, expect, it } from "bun:test";
import { hasRiseAndFallExe, hasDgVoodooCplExe } from "@/lib/utils/game-files";
import { getLauncherVersion } from "@/lib/utils/version";
import { isWindows, isMac, isLinux } from "@/lib/utils/os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";

describe("Utils: Game Files Validation", () => {
  it("detects RiseAndFall.exe when present in target directory", async () => {
    const testDir = join(tmpdir(), `raf-game-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    expect(await hasRiseAndFallExe(testDir)).toBe(false);

    const exePath = join(testDir, "RiseAndFall.exe");
    await writeFile(exePath, "DUMMY_EXE");

    expect(await hasRiseAndFallExe(testDir)).toBe(true);
    await rm(testDir, { recursive: true, force: true });
  });

  it("handles null, empty, or whitespace paths gracefully", async () => {
    expect(await hasRiseAndFallExe(null)).toBe(false);
    expect(await hasRiseAndFallExe("")).toBe(false);
    expect(await hasRiseAndFallExe("   ")).toBe(false);
    expect(await hasRiseAndFallExe(undefined)).toBe(false);
  });

  it("detects dgVoodooCpl.exe when present in target directory", async () => {
    const testDir = join(tmpdir(), `dgv-game-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    expect(await hasDgVoodooCplExe(testDir)).toBe(false);

    const exePath = join(testDir, "dgVoodooCpl.exe");
    await writeFile(exePath, "DUMMY_DGV");

    expect(await hasDgVoodooCplExe(testDir)).toBe(true);
    await rm(testDir, { recursive: true, force: true });
  });

  it("handles missing directory for dgVoodoo check", async () => {
    expect(await hasDgVoodooCplExe("/path/that/does/not/exist/999")).toBe(false);
  });
});

describe("Utils: Launcher Version & OS Info", () => {
  it("returns non-empty version string", () => {
    const ver = getLauncherVersion();
    expect(typeof ver).toBe("string");
    expect(ver.length).toBeGreaterThan(0);
    expect(/^\d+\.\d+\.\d+/.test(ver)).toBe(true);
  });

  it("detects OS platform correctly", () => {
    const win = isWindows();
    const mac = isMac();
    const linux = isLinux();

    expect(typeof win).toBe("boolean");
    expect(typeof mac).toBe("boolean");
    expect(typeof linux).toBe("boolean");

    if (process.platform === "win32") {
      expect(win).toBe(true);
      expect(mac).toBe(false);
    } else if (process.platform === "darwin") {
      expect(mac).toBe(true);
      expect(win).toBe(false);
    } else if (process.platform === "linux") {
      expect(linux).toBe(true);
      expect(win).toBe(false);
    }
  });
});
