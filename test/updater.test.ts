import { describe, expect, it } from "bun:test";
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
import { isDevMode, resolveDownloadUrl } from "@/lib/updater/updater";

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

describe("Updater: GitHub Releases Integration", () => {
  it("fetches releases and extracts assets and downloadUrl", async () => {
    const releases = await fetchReleases();
    expect(releases).toBeDefined();
    expect(releases.length).toBeGreaterThan(0);

    const first = releases[0];
    expect(first.version).toBeDefined();
    expect(first.url).toBeDefined();
    expect(typeof first.downloadUrl).toBe("string");
  });
});

describe("Updater: i18n Translations Consistency", () => {
  it("has all required buttons and toasts in ru.json", () => {
    expect(ru.buttons.update).toBe("Обновить");
    expect(ru.buttons.updating).toBe("Обновление...");
    expect(ru.toasts.updateAvailableTitle).toBeDefined();
    expect(ru.toasts.updateAvailableDesc).toBeDefined();
    expect(ru.toasts.updateDownloadingTitle).toBeDefined();
    expect(ru.toasts.updateSuccessTitle).toBeDefined();
    expect(ru.toasts.updateDevSuccessTitle).toBeDefined();
    expect(ru.toasts.updateErrorTitle).toBeDefined();
  });

  it("has all required buttons and toasts in en.json", () => {
    expect(en.buttons.update).toBe("Update");
    expect(en.buttons.updating).toBe("Updating...");
    expect(en.toasts.updateAvailableTitle).toBeDefined();
    expect(en.toasts.updateAvailableDesc).toBeDefined();
    expect(en.toasts.updateDownloadingTitle).toBeDefined();
    expect(en.toasts.updateSuccessTitle).toBeDefined();
    expect(en.toasts.updateDevSuccessTitle).toBeDefined();
    expect(en.toasts.updateErrorTitle).toBeDefined();
  });

  it("has all required buttons and toasts in ua.json", () => {
    expect(ua.buttons.update).toBe("Оновити");
    expect(ua.buttons.updating).toBe("Оновлення...");
    expect(ua.toasts.updateAvailableTitle).toBeDefined();
    expect(ua.toasts.updateAvailableDesc).toBeDefined();
    expect(ua.toasts.updateDownloadingTitle).toBeDefined();
    expect(ua.toasts.updateSuccessTitle).toBeDefined();
    expect(ua.toasts.updateDevSuccessTitle).toBeDefined();
    expect(ua.toasts.updateErrorTitle).toBeDefined();
  });
});
