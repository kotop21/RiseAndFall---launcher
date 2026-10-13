import { describe, expect, it } from "bun:test";
import { getDevArgs, isDevMode, parseDevArgs, resetDevArgs } from "@/lib/dev/cli";
import { hasSettingsCli } from "@/lib/settings-cli";
import { isWindows } from "@/lib/utils/os";

describe("Dev CLI: Argument Parsing", () => {
  it("detects dev mode in current environment", () => {
    expect(isDevMode()).toBe(true);
  });

  it("emulates Windows platform and CLI availability when mockRelease is active", () => {
    const origArgv = [...process.argv];
    try {
      process.argv = ["bun", "index.tsx", "-r"];
      resetDevArgs();
      expect(isWindows()).toBe(true);
      expect(hasSettingsCli()).toBe(true);
    } finally {
      process.argv = origArgv;
      resetDevArgs();
    }
  });

  it("parses --lang flag and enables disableAutoDetectLanguage", () => {
    const res1 = parseDevArgs(["--lang", "ua"], true);
    expect(res1.lang).toBe("ua");
    expect(res1.disableAutoDetectLanguage).toBe(true);

    const res2 = parseDevArgs(["--language=ru"], true);
    expect(res2.lang).toBe("ru");
    expect(res2.disableAutoDetectLanguage).toBe(true);

    const res3 = parseDevArgs(["-l", "en"], true);
    expect(res3.lang).toBe("en");
    expect(res3.disableAutoDetectLanguage).toBe(true);
  });

  it("normalizes locale variations like uk or uk_UA to ua", () => {
    const res = parseDevArgs(["--lang", "uk"], true);
    expect(res.lang).toBe("ua");
    expect(res.disableAutoDetectLanguage).toBe(true);
  });

  it("ignores unknown languages and does not disable auto-detection", () => {
    const res = parseDevArgs(["--lang", "unknown_lang"], true);
    expect(res.lang).toBeUndefined();
    expect(res.disableAutoDetectLanguage).toBe(false);
  });

  it("parses --view and -v flags", () => {
    expect(parseDevArgs(["--view", "settings"], true).view).toBe("settings");
    expect(parseDevArgs(["--view=install"], true).view).toBe("install");
    expect(parseDevArgs(["-v", "welcome"], true).view).toBe("welcome");
    expect(parseDevArgs(["-v=main"], true).view).toBe("main");
  });

  it("ignores invalid views", () => {
    expect(parseDevArgs(["--view", "dashboard"], true).view).toBeUndefined();
  });

  it("parses low-spec flags", () => {
    expect(parseDevArgs(["--low-spec"], true).lowSpec).toBe(true);
    expect(parseDevArgs(["--low-performance"], true).lowSpec).toBe(true);
    expect(parseDevArgs([], true).lowSpec).toBe(false);
  });

  it("disables file logging by default in dev mode unless requested", () => {
    const defaultDev = parseDevArgs([], true);
    expect(defaultDev.logFile).toBe(false);

    expect(parseDevArgs(["--log-file"], true).logFile).toBe(true);
    expect(parseDevArgs(["--file-logs"], true).logFile).toBe(true);
    expect(parseDevArgs(["--enable-log-file"], true).logFile).toBe(true);
    expect(parseDevArgs(["--log-file=true"], true).logFile).toBe(true);
    expect(parseDevArgs(["--log-file=false"], true).logFile).toBe(false);
  });

  it("parses mock release and windows flags", () => {
    expect(parseDevArgs(["-r"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["-w"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["--release"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["--windows"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["-release"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["-windows"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["--mock-release"], true).mockRelease).toBe(true);
    expect(parseDevArgs(["--mock-windows"], true).mockRelease).toBe(true);
    expect(parseDevArgs([], true).mockRelease).toBe(false);
  });

  it("strictly disables all dev overrides when not in dev mode (production release)", () => {
    const prod = parseDevArgs(
      ["--lang", "ua", "--view", "settings", "--low-spec", "--log-file=false", "-r"],
      false,
    );
    expect(prod.isDev).toBe(false);
    expect(prod.lang).toBeUndefined();
    expect(prod.disableAutoDetectLanguage).toBe(false);
    expect(prod.view).toBeUndefined();
    expect(prod.lowSpec).toBe(false);
    expect(prod.logFile).toBe(true); // In production, file logging is active by default
    expect(prod.mockRelease).toBe(false);
  });

  it("caches singleton getDevArgs and allows resetting", () => {
    resetDevArgs();
    const args1 = getDevArgs();
    const args2 = getDevArgs();
    expect(args1).toBe(args2);
  });
});
