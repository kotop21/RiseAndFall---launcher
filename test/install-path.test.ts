import { describe, expect, it } from "bun:test";
import { ensureInstallDir } from "@/lib/manager/install";

describe("Install Path: ensureInstallDir", () => {
  it("returns empty string for empty or nullish inputs", () => {
    expect(ensureInstallDir("")).toBe("");
    expect(ensureInstallDir("   ")).toBe("");
    expect(ensureInstallDir(null)).toBe("");
    expect(ensureInstallDir(undefined)).toBe("");
  });

  it("appends RiseAndFall-launcher to Windows drive root", () => {
    expect(ensureInstallDir("D:")).toBe("D:\\RiseAndFall-launcher");
    expect(ensureInstallDir("D:\\")).toBe("D:\\RiseAndFall-launcher");
    expect(ensureInstallDir("D:/")).toBe("D:\\RiseAndFall-launcher");
    expect(ensureInstallDir("C:")).toBe("C:\\RiseAndFall-launcher");
    expect(ensureInstallDir("C:\\")).toBe("C:\\RiseAndFall-launcher");
  });

  it("appends RiseAndFall-launcher to subdirectories on Windows", () => {
    expect(ensureInstallDir("D:\\Games")).toBe("D:\\Games\\RiseAndFall-launcher");
    expect(ensureInstallDir("D:\\Games\\")).toBe("D:\\Games\\RiseAndFall-launcher");
  });

  it("preserves path if it already ends in RiseAndFall-launcher", () => {
    expect(ensureInstallDir("D:\\Games\\RiseAndFall-launcher")).toBe(
      "D:\\Games\\RiseAndFall-launcher",
    );
    expect(ensureInstallDir("D:\\Games\\RiseAndFall-launcher\\")).toBe(
      "D:\\Games\\RiseAndFall-launcher",
    );
    expect(ensureInstallDir("D:\\RiseAndFall-launcher")).toBe("D:\\RiseAndFall-launcher");
    expect(ensureInstallDir("/home/user/RiseAndFall-launcher")).toBe(
      "/home/user/RiseAndFall-launcher",
    );
    expect(ensureInstallDir("/home/user/RiseAndFall-launcher/")).toBe(
      "/home/user/RiseAndFall-launcher",
    );
  });

  it("handles case-insensitivity without duplicating the directory", () => {
    expect(ensureInstallDir("D:\\Games\\riseandfall-launcher")).toBe(
      "D:\\Games\\riseandfall-launcher",
    );
    expect(ensureInstallDir("/home/user/riseandfall-launcher")).toBe(
      "/home/user/riseandfall-launcher",
    );
  });

  it("appends RiseAndFall-launcher to Unix paths", () => {
    expect(ensureInstallDir("/Users/test/Games")).toBe("/Users/test/Games/RiseAndFall-launcher");
    expect(ensureInstallDir("/Users/test/Games/")).toBe("/Users/test/Games/RiseAndFall-launcher");
    expect(ensureInstallDir("/")).toBe("/RiseAndFall-launcher");
  });

  it("handles standalone directory name", () => {
    expect(ensureInstallDir("RiseAndFall-launcher")).toBe("RiseAndFall-launcher");
    expect(ensureInstallDir("my-folder")).toContain("RiseAndFall-launcher");
  });
});
