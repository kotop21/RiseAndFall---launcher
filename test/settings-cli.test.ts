import { describe, expect, it } from "bun:test";
import { executeSettingsCli, getSettingsCliPath, hasSettingsCli } from "@/lib/settings-cli/client";
import { exportGameSettings } from "@/lib/settings-cli/export";
import { importGameSettings } from "@/lib/settings-cli/import";

describe("Settings CLI: Discovery & Execution", () => {
  it("resolves a non-empty settings cli binary path", () => {
    const path = getSettingsCliPath();
    expect(typeof path).toBe("string");
    expect(path.endsWith("raf-settings.exe")).toBe(true);
  });

  it("checks availability according to OS platform", () => {
    const available = hasSettingsCli();
    if (process.platform !== "win32") {
      expect(available).toBe(false);
    }
  });

  it("safely blocks execution on non-Windows systems", async () => {
    if (process.platform !== "win32") {
      const res = await executeSettingsCli(["status"]);
      expect(res.success).toBe(false);
      expect(res.stderr).toContain("Windows");

      const exportRes = await exportGameSettings("/tmp");
      expect(exportRes.success).toBe(false);

      const importRes = await importGameSettings("/tmp/raf-settings.json");
      expect(importRes.success).toBe(false);
    }
  });
});
