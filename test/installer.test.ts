import { describe, expect, it } from "bun:test";
import { spawn } from "node:child_process";
import { exists, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  InstallationManager,
  installationManager,
  installGamePackage,
} from "@/lib/manager/install";

async function createZip(stagingDir: string, zipPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("zip", ["-r", "-j", zipPath, stagingDir]);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`zip exited with ${code}`)),
    );
    proc.on("error", reject);
  });
}

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
  it("installs packages into target directory, overwrites by priority, preserves saves, and shows dynamic names", async () => {
    const tempDir = join(tmpdir(), `raf-pkg-build-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // 1. Base Game Package (RiseAndFall.exe, version.txt, lang.txt with 'base')
    const gameStaging = join(tempDir, "game_staging");
    await mkdir(gameStaging, { recursive: true });
    await writeFile(join(gameStaging, "RiseAndFall.exe"), "GAME_BINARY");
    await writeFile(join(gameStaging, "version.txt"), "2.0.0");
    await writeFile(join(gameStaging, "lang.txt"), "base_content");
    const gameZip = join(tempDir, "game.zip");
    await createZip(gameStaging, gameZip);

    // 2. Lang Package (overwrites lang.txt with 'en_content')
    const langStaging = join(tempDir, "lang_staging");
    await mkdir(langStaging, { recursive: true });
    await writeFile(join(langStaging, "lang.txt"), "en_content");
    const langZip = join(tempDir, "lang_en.zip");
    await createZip(langStaging, langZip);

    // 3. Mod Package (mod.txt)
    const modStaging = join(tempDir, "mod_staging");
    await mkdir(modStaging, { recursive: true });
    await writeFile(join(modStaging, "mod.txt"), "bfm_content");
    const modZip = join(tempDir, "mod_bfm.zip");
    await createZip(modStaging, modZip);

    // 4. Start mock API server
    const server = Bun.serve({
      port: 0,
      fetch(req): Response | Promise<Response> {
        const url = new URL(req.url);
        if (url.pathname === "/api/manifest") {
          return Response.json({
            mode: "auto",
            version: "1.0.0",
            packages: [
              {
                id: "game",
                name: "Rise and Fall: Civilizations at War (Base Game)",
                mirrors: [`${url.origin}/game.zip`],
              },
              {
                id: "lang_en",
                name: "English Language Pack",
                mirrors: [`${url.origin}/lang_en.zip`],
              },
              {
                id: "mod_bfm",
                name: "BFM",
                mirrors: [`${url.origin}/mod_bfm.zip`],
              },
            ],
          });
        }
        if (url.pathname === "/game.zip") {
          return new Response(Bun.file(gameZip));
        }
        if (url.pathname === "/lang_en.zip") {
          return new Response(Bun.file(langZip));
        }
        if (url.pathname === "/mod_bfm.zip") {
          return new Response(Bun.file(modZip));
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    const targetDir = join(tmpdir(), `raf-game-installed-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    // Create a saved game to verify reinstall preservation
    const savedGamesDir = join(targetDir, "Data", "Saved Games");
    await mkdir(savedGamesDir, { recursive: true });
    const saveFilePath = join(savedGamesDir, "save1.sav");
    await writeFile(saveFilePath, "MY_CAMPAIGN_SAVE");

    const progressMessages: string[] = [];

    try {
      const res = await installGamePackage({
        targetDir,
        lang: "en",
        cleanBeforeInstall: true,
        onProgress: (p) => {
          progressMessages.push(p.message);
        },
      });

      expect(res.success).toBe(true);
      expect(await exists(join(targetDir, "RiseAndFall.exe"))).toBe(true);
      expect(await exists(join(targetDir, "version.txt"))).toBe(true);

      // Verify lang overwrite priority
      expect(await exists(join(targetDir, "lang.txt"))).toBe(true);
      expect(await readFile(join(targetDir, "lang.txt"), "utf-8")).toBe("en_content");

      // Verify mod unpacked
      expect(await exists(join(targetDir, "mod.txt"))).toBe(true);
      expect(await readFile(join(targetDir, "mod.txt"), "utf-8")).toBe("bfm_content");

      // Verify saved game file was preserved!
      expect(await exists(saveFilePath)).toBe(true);
      expect(await readFile(saveFilePath, "utf-8")).toBe("MY_CAMPAIGN_SAVE");

      // Verify dynamic names in progress messages
      const fullLog = progressMessages.join(" ");
      expect(fullLog).toContain("Rise and Fall: Civilizations at War (Base Game)");
      expect(fullLog).toContain("English Language Pack");
      expect(fullLog).toContain("BFM");

      // Verify download speed format in parentheses: e.g. "[1/3] ...: ... MB (.../s)"
      const downloadMsg = progressMessages.find(
        (m) => m.includes("Rise and Fall: Civilizations at War (Base Game)") && m.includes("MB"),
      );
      expect(downloadMsg).toBeDefined();
      expect(downloadMsg).toMatch(/\(\d+(\.\d+)? (MB\/s|KB\/s|B\/s|GB\/s)\)/);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;

      await rm(tempDir, { recursive: true, force: true });
      await rm(targetDir, { recursive: true, force: true });
    }
  });

  it("succeeds when a package falls back to a working mirror", async () => {
    const tempDir = join(tmpdir(), `raf-fallback-build-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    const gameStaging = join(tempDir, "game_staging");
    await mkdir(gameStaging, { recursive: true });
    await writeFile(join(gameStaging, "RiseAndFall.exe"), "GAME_FALLBACK_OK");
    const gameZip = join(tempDir, "game.zip");
    await createZip(gameStaging, gameZip);

    let failedMirrorCalls = 0;
    let workingMirrorCalls = 0;

    const server = Bun.serve({
      port: 0,
      fetch(req): Response | Promise<Response> {
        const url = new URL(req.url);
        if (url.pathname === "/api/manifest") {
          return Response.json({
            mode: "auto",
            version: "1.0.0",
            packages: [
              {
                id: "game",
                name: "Rise and Fall: Civilizations at War (Base Game)",
                mirrors: [`${url.origin}/dead-mirror.zip`, `${url.origin}/game-working.zip`],
              },
            ],
          });
        }
        if (url.pathname === "/dead-mirror.zip") {
          failedMirrorCalls++;
          return new Response("Internal error", { status: 500 });
        }
        if (url.pathname === "/game-working.zip") {
          workingMirrorCalls++;
          return new Response(Bun.file(gameZip));
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    const targetDir = join(tmpdir(), `raf-fallback-target-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    try {
      const res = await installGamePackage({
        targetDir,
        lang: "en",
      });

      expect(res.success).toBe(true);
      expect(failedMirrorCalls).toBe(1);
      expect(workingMirrorCalls).toBe(1);
      expect(await exists(join(targetDir, "RiseAndFall.exe"))).toBe(true);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;

      await rm(tempDir, { recursive: true, force: true });
      await rm(targetDir, { recursive: true, force: true });
    }
  });

  it("fails gracefully when all mirrors for a package are unavailable", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req): Response | Promise<Response> {
        const url = new URL(req.url);
        if (url.pathname === "/api/manifest") {
          return Response.json({
            mode: "auto",
            version: "1.0.0",
            packages: [
              {
                id: "game",
                name: "Rise and Fall: Civilizations at War (Base Game)",
                mirrors: [`${url.origin}/dead1.zip`, `${url.origin}/dead2.zip`],
              },
            ],
          });
        }
        return new Response("Dead mirror", { status: 503 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    const targetDir = join(tmpdir(), `raf-dead-target-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    try {
      const res = await installGamePackage({
        targetDir,
        lang: "en",
      });

      expect(res.success).toBe(false);
      expect(["MIRRORS_UNAVAILABLE", "DOWNLOAD_FAILED"]).toContain(res.error?.code as string);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;

      await rm(targetDir, { recursive: true, force: true });
    }
  });
});

describe("Installation Manager: Background Singleton & State Management", () => {
  it("initializes singleton and custom instance with idle state and resets properly", () => {
    expect(installationManager.getState().status).toBeDefined();
    const manager = new InstallationManager();
    expect(manager.getState().status).toBe("idle");
    expect(manager.getState().isInstalling).toBe(false);
    expect(manager.getState().progress).toBeNull();
    expect(manager.getState().targetDir).toBe("");

    manager.reset();
    expect(manager.getState().status).toBe("idle");
  });

  it("notifies subscribers when state changes and supports unsubscription", () => {
    const manager = new InstallationManager();
    const states: string[] = [];
    const unsubscribe = manager.subscribe((state) => {
      states.push(state.status);
    });

    manager.abort();
    expect(states).toContain("idle");

    unsubscribe();
    manager.abort();
    expect(states.length).toBe(1);
  });

  it("prevents parallel installations and returns the active promise", async () => {
    const manager = new InstallationManager();
    const targetDir = join(tmpdir(), `raf-manager-dup-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    const server = Bun.serve({
      port: 0,
      async fetch() {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return Response.json({ mode: "auto", version: "1.0.0", packages: [] });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    try {
      const p1 = manager.startInstall({ targetDir, lang: "en" });
      expect(manager.getState().isInstalling).toBe(true);

      const p2 = manager.startInstall({ targetDir, lang: "en" });
      expect(p2).toBe(p1);

      await p1;
      expect(manager.getState().isInstalling).toBe(false);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
      await rm(targetDir, { recursive: true, force: true });
    }
  });

  it("aborts active installation cleanly and updates state", async () => {
    const manager = new InstallationManager();
    const targetDir = join(tmpdir(), `raf-manager-abort-${Date.now()}`);
    await mkdir(targetDir, { recursive: true });

    const server = Bun.serve({
      port: 0,
      async fetch() {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return Response.json({ mode: "auto", version: "1.0.0", packages: [] });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    try {
      const promise = manager.startInstall({ targetDir, lang: "en" });
      expect(manager.getState().isInstalling).toBe(true);

      manager.abort();
      expect(manager.getState().isInstalling).toBe(false);
      expect(manager.getState().status).toBe("idle");

      const res = await promise;
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("INSTALL_CANCELLED");
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
      await rm(targetDir, { recursive: true, force: true });
    }
  });

  it("invokes onInstalled callbacks upon successful installation", async () => {
    const manager = new InstallationManager();
    const tempDir = join(tmpdir(), `raf-manager-success-temp-${Date.now()}`);
    const targetDir = join(tmpdir(), `raf-manager-success-target-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });

    const gameStaging = join(tempDir, "game_staging");
    await mkdir(gameStaging, { recursive: true });
    await writeFile(join(gameStaging, "RiseAndFall.exe"), "GAME_EXE");
    const gameZip = join(tempDir, "game.zip");
    await createZip(gameStaging, gameZip);

    const server = Bun.serve({
      port: 0,
      fetch(req): Response {
        const url = new URL(req.url);
        if (url.pathname === "/api/manifest") {
          return Response.json({
            mode: "auto",
            version: "1.0.0",
            packages: [
              {
                id: "game",
                name: "Base Game",
                mirrors: [`${url.origin}/game.zip`],
              },
            ],
          });
        }
        if (url.pathname === "/game.zip") {
          return new Response(Bun.file(gameZip));
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    let callbackTarget = "";
    const unsub = manager.onInstalled((installedPath) => {
      callbackTarget = installedPath;
    });

    try {
      const res = await manager.startInstall({ targetDir, lang: "en" });
      expect(res.success).toBe(true);
      expect(manager.getState().status).toBe("completed");
      expect(manager.getState().isInstalling).toBe(false);
      expect(callbackTarget).toBe(targetDir);
    } finally {
      unsub();
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
      await rm(tempDir, { recursive: true, force: true });
      await rm(targetDir, { recursive: true, force: true });
    }
  });
});
