import { describe, expect, it } from "bun:test";
import { chmod, mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import en from "@/lang/en.json";
import ru from "@/lang/ru.json";
import ua from "@/lang/ua.json";
import { fetchReleases } from "@/lib/github/releases";
import {
  cleanVersion,
  compareVersions,
  isDifferentVersion,
  isNewerVersion,
} from "@/lib/updater/compare";
import {
  buildPowerShellElevationScript,
  canWriteToDirectory,
  isDevMode,
  resolveDownloadUrl,
} from "@/lib/updater/updater";

describe("Updater: Version Comparison", () => {
  it("cleans versions properly", () => {
    expect(cleanVersion("v1.2.3")).toBe("1.2.3");
    expect(cleanVersion("V2.0.0-beta")).toBe("2.0.0");
    expect(cleanVersion("  v0.1.11  ")).toBe("0.1.11");
    expect(cleanVersion(null)).toBe("0.0.0");
  });

  it("compares versions correctly", () => {
    expect(compareVersions("0.1.11", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.0.1", "2.0.0")).toBeGreaterThan(0);
    expect(compareVersions("v2.0.0", "2.0.0")).toBe(0);
    expect(compareVersions("2.1.0", "2.0.9")).toBeGreaterThan(0);
  });

  it("checks difference and newer status", () => {
    expect(isDifferentVersion("v0.1.11", "2.0.0")).toBe(true);
    expect(isDifferentVersion("v2.0.0", "2.0.0")).toBe(false);
    expect(isNewerVersion("v2.0.1", "2.0.0")).toBe(true);
    expect(isNewerVersion("v0.1.11", "2.0.0")).toBe(false);
  });
});

describe("Updater: Download URL Resolution", () => {
  it("resolves from release.downloadUrl", () => {
    const url = resolveDownloadUrl({
      version: "v2.0.0",
      title: "Test",
      url: "https://github.com",
      downloadUrl: "https://custom.com/download.zip",
    });
    expect(url).toBe("https://custom.com/download.zip");
  });

  it("resolves from release assets picking zip first", () => {
    const url = resolveDownloadUrl({
      version: "v2.0.0",
      title: "Test",
      url: "https://github.com",
      assets: [
        {
          id: 1,
          name: "source.txt",
          size: 10,
          contentType: "text/plain",
          downloadUrl: "https://custom.com/source.txt",
        },
        {
          id: 2,
          name: "RiseAndFall-Launcher.zip",
          size: 100,
          contentType: "application/zip",
          downloadUrl: "https://custom.com/RiseAndFall-Launcher.zip",
        },
      ],
    });
    expect(url).toBe("https://custom.com/RiseAndFall-Launcher.zip");
  });

  it("detects dev mode correctly in Bun test environment", () => {
    expect(isDevMode()).toBe(true);
  });
});

describe("Updater: Write Access & Elevation Helpers", () => {
  it("returns true for a writable directory and removes probe file", async () => {
    const dir = join(tmpdir(), `raf-write-ok-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    try {
      expect(await canWriteToDirectory(dir)).toBe(true);
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns false for a non-existent or read-only directory", async () => {
    const missingDir = join(tmpdir(), `raf-write-missing-${Date.now()}`, "nested");
    expect(await canWriteToDirectory(missingDir)).toBe(false);

    if (process.platform !== "win32") {
      const roDir = join(tmpdir(), `raf-write-ro-${Date.now()}`);
      await mkdir(roDir, { recursive: true });
      await chmod(roDir, 0o555);
      try {
        expect(await canWriteToDirectory(roDir)).toBe(false);
      } finally {
        await chmod(roDir, 0o755);
        await rm(roDir, { recursive: true, force: true });
      }
    }
  });

  it("builds PowerShell RunAs command escaping single quotes", () => {
    const cmd = buildPowerShellElevationScript("C:\\Users\\O'Neil\\Temp\\elevate_update.bat");
    expect(cmd).toBe(
      "Start-Process -FilePath 'C:\\Users\\O''Neil\\Temp\\elevate_update.bat' -Verb RunAs -WindowStyle Hidden",
    );
  });
});

describe("Updater: GitHub Releases Integration", () => {
  it("fetches releases and extracts assets and downloadUrl", async () => {
    const releases = await fetchReleases();
    expect(releases).toBeDefined();
    expect(releases.length).toBeGreaterThan(0);

    const first = releases[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.version).toBeDefined();
      expect(first.url).toBeDefined();
      expect(typeof first.downloadUrl).toBe("string");
    }
  });
});

describe("Updater: i18n Translations Consistency", () => {
  it("has all required buttons and toasts in ru.json", () => {
    expect(ru.buttons.update).toBe("Обновить");
    expect(ru.buttons.updating).toBe("Обновление...");
    expect(ru.buttons.alreadyInstalled).toBe("Уже установлено");
    expect(ru.main.noUpdatesData).toBeDefined();
    expect(ru.toasts.updateAvailableDesc).toBeDefined();
    expect(ru.toasts.updateDownloadingDesc).toBeDefined();
    expect(ru.toasts.updateSuccessDesc).toBeDefined();
    expect(ru.toasts.updateDevSuccessDesc).toBeDefined();
    expect(ru.toasts.updateErrorDesc).toBeDefined();
  });

  it("has all required buttons and toasts in en.json", () => {
    expect(en.buttons.update).toBe("Update");
    expect(en.buttons.updating).toBe("Updating...");
    expect(en.buttons.alreadyInstalled).toBe("Already installed");
    expect(en.main.noUpdatesData).toBeDefined();
    expect(en.toasts.updateAvailableDesc).toBeDefined();
    expect(en.toasts.updateDownloadingDesc).toBeDefined();
    expect(en.toasts.updateSuccessDesc).toBeDefined();
    expect(en.toasts.updateDevSuccessDesc).toBeDefined();
    expect(en.toasts.updateErrorDesc).toBeDefined();
  });

  it("has all required buttons and toasts in ua.json", () => {
    expect(ua.buttons.update).toBe("Оновити");
    expect(ua.buttons.updating).toBe("Оновлення...");
    expect(ua.buttons.alreadyInstalled).toBe("Вже встановлено");
    expect(ua.main.noUpdatesData).toBeDefined();
    expect(ua.toasts.updateAvailableDesc).toBeDefined();
    expect(ua.toasts.updateDownloadingDesc).toBeDefined();
    expect(ua.toasts.updateSuccessDesc).toBeDefined();
    expect(ua.toasts.updateDevSuccessDesc).toBeDefined();
    expect(ua.toasts.updateErrorDesc).toBeDefined();
  });
});
