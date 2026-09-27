import { describe, expect, it } from "bun:test";
import { installGamePackage } from "@/lib/manager/install";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir, writeFile, rm, exists, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

describe("Installer: Validation & Error Handling", () => {
  it("fails immediately when target directory is empty", async () => {
    const res = await installGamePackage({
      targetDir: "",
      lang: "en",
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("TARGET_DIR_REQUIRED");
  });

  it("handles user abort signal during installation", async () => {
    const targetDir = join(tmpdir(), `raf-install-abort-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    const controller = new AbortController();
    controller.abort();

    const res = await installGamePackage({
      targetDir,
      lang: "en",
      signal: controller.signal,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("INSTALL_CANCELLED");

    await rm(targetDir, { recursive: true, force: true });
  });
});

describe("Installer: Complete End-to-End Mock Installation", () => {
  it("installs packages into target directory and preserves saved games on reinstall", async () => {
    // 1. Create a mock zip package
    const tempDir = join(tmpdir(), `raf-pkg-build-${Date.now()}`);
    const stagingDir = join(tempDir, "pkg_content");
    await mkdir(stagingDir, { recursive: true });

    await writeFile(join(stagingDir, "RiseAndFall.exe"), "GAME_BINARY");
    await writeFile(join(stagingDir, "version.txt"), "2.0.0");

    const zipPath = join(tempDir, "package.zip");
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("zip", ["-r", "-j", zipPath, stagingDir]);
      proc.on("close", (code) => (code === 0 ? resolve() : reject()));
      proc.on("error", reject);
    });

    // 2. Start mock download API server
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        return new Response(Bun.file(zipPath));
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    const targetDir = join(tmpdir(), `raf-game-installed-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    // 3. Create a saved game to verify reinstall preservation
    const savedGamesDir = join(targetDir, "Data", "Saved Games");
    await mkdir(savedGamesDir, { recursive: true });
    const saveFilePath = join(savedGamesDir, "save1.sav");
    await writeFile(saveFilePath, "MY_CAMPAIGN_SAVE");

    let progressCalls = 0;
    const res = await installGamePackage({
      targetDir,
      lang: "en",
      cleanBeforeInstall: true,
      onProgress: () => {
        progressCalls++;
      },
    });

    server.stop(true);
    if (prevApi) process.env.API_URL = prevApi;

    expect(res.success).toBe(true);
    expect(await exists(join(targetDir, "RiseAndFall.exe"))).toBe(true);
    expect(await exists(join(targetDir, "version.txt"))).toBe(true);

    // Verify saved game file was preserved!
    expect(await exists(saveFilePath)).toBe(true);
    expect(await readFile(saveFilePath, "utf-8")).toBe("MY_CAMPAIGN_SAVE");
    expect(progressCalls).toBeGreaterThan(0);

    await rm(tempDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });
});
