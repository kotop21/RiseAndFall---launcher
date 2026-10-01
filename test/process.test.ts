import { describe, expect, it } from "bun:test";
import { launchExe, parseArgs, sanitizeGameArgs } from "@/lib/process/launch";
import { launcherTracker } from "@/lib/process/launcher-tracker";

describe("Process: Args Formatting & Parsing", () => {
  it("sanitizes game args escaping unescaped quotes", () => {
    expect(sanitizeGameArgs("")).toBe("");
    expect(sanitizeGameArgs(' -datapath "Data" ')).toBe(' -datapath \\"Data\\" ');
  });

  it("parses raw arguments string respecting double quotes", () => {
    expect(parseArgs("")).toEqual([]);
    expect(parseArgs("  -windowed  -res 1920 1080  ")).toEqual([
      "-windowed",
      "-res",
      "1920",
      "1080",
    ]);

    expect(parseArgs('-datapath "C:\\My Games\\Data" -fullscreen')).toEqual([
      "-datapath",
      "C:\\My Games\\Data",
      "-fullscreen",
    ]);
  });
});

describe("Process: Launch Validation", () => {
  it("returns error for empty or non-existent executable path", async () => {
    const emptyRes = await launchExe("");
    expect(emptyRes.success).toBe(false);
    if (!emptyRes.success) {
      expect(emptyRes.error.code).toBe("GAME_EXE_NOT_FOUND");
    }

    const missingRes = await launchExe("/invalid/path/RiseAndFall.exe");
    expect(missingRes.success).toBe(false);
    if (!missingRes.success) {
      expect(missingRes.error.code).toBe("GAME_EXE_NOT_FOUND");
    }
  });
});

describe("Process: Launcher Time Tracker", () => {
  it("initializes and reports playtime minutes", () => {
    launcherTracker.init(55);
    expect(launcherTracker.getTotalMinutes()).toBe(55);
    launcherTracker.destroy();
  });
});
