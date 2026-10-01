import { describe, expect, it } from "bun:test";
import { exists, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { API_ROUTES } from "@/lib/api/client";
import {
  downloadFromMirrors,
  fetchManifest,
  formatSpeed,
  type ManifestResponse,
} from "@/lib/api/download";
import type { LauncherAppError } from "@/lib/errors";

describe("API: Routes Builder", () => {
  it("builds correct manifest route", () => {
    expect(API_ROUTES.manifest).toContain("/api/manifest");
  });

  it("builds correct online & health routes", () => {
    expect(API_ROUTES.health).toContain("/api/health");
    expect(API_ROUTES.online).toContain("/api/online");
    expect(API_ROUTES.onlineCount).toContain("/api/online/count");
  });
});

describe("API: Manifest Fetching", () => {
  it("fetches valid manifest from mock server", async () => {
    const mockManifest: ManifestResponse = {
      mode: "auto",
      version: "1.0.0",
      packages: [
        {
          id: "game",
          name: "Rise and Fall: Civilizations at War (Base Game)",
          mirrors: ["https://example.com/RiseAndFall.zip"],
        },
        {
          id: "lang_ru",
          name: "Russian Language Pack",
          mirrors: ["https://example.com/ru-lang.zip"],
        },
      ],
    };

    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/manifest") {
          return Response.json(mockManifest);
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    try {
      const manifest = await fetchManifest();
      expect(manifest.version).toBe("1.0.0");
      expect(manifest.packages.length).toBe(2);
      expect(manifest.packages[0].id).toBe("game");
      expect(manifest.packages[0].name).toBe("Rise and Fall: Civilizations at War (Base Game)");
      expect(manifest.packages[0].mirrors).toEqual(["https://example.com/RiseAndFall.zip"]);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
    }
  });

  it("handles server 500 error gracefully", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    try {
      let threw = false;
      try {
        await fetchManifest();
      } catch (err) {
        threw = true;
        expect((err as LauncherAppError).code).toBe("MANIFEST_FAILED");
      }
      expect(threw).toBe(true);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
    }
  });

  it("handles invalid payload missing packages array", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({ mode: "auto", version: "1.0.0" });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    try {
      let threw = false;
      try {
        await fetchManifest();
      } catch (err) {
        threw = true;
        expect((err as LauncherAppError).code).toBe("MANIFEST_FAILED");
      }
      expect(threw).toBe(true);
    } finally {
      server.stop(true);
      if (prevApi) process.env.API_URL = prevApi;
      else delete process.env.API_URL;
    }
  });

  it("handles user abort signal during manifest fetch", async () => {
    const controller = new AbortController();
    controller.abort();

    let threw = false;
    try {
      await fetchManifest(controller.signal);
    } catch (err) {
      threw = true;
      expect((err as LauncherAppError).code).toBe("INSTALL_CANCELLED");
    }
    expect(threw).toBe(true);
  });
});

describe("API: Mirror Downloads & Fallback", () => {
  it("downloads file successfully from the first mirror", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/file.bin") {
          return new Response("MIRROR_1_CONTENT", {
            headers: { "Content-Type": "application/octet-stream" },
          });
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const targetFile = join(tmpdir(), `mirror-test-${Date.now()}.bin`);

    try {
      let progressUpdates = 0;
      const res = await downloadFromMirrors(
        [`http://localhost:${server.port}/file.bin`],
        targetFile,
        {
          onProgress: () => {
            progressUpdates++;
          },
        },
      );

      expect(res.success).toBe(true);
      expect(await exists(targetFile)).toBe(true);
      expect(await readFile(targetFile, "utf-8")).toBe("MIRROR_1_CONTENT");
      expect(progressUpdates).toBeGreaterThan(0);
    } finally {
      server.stop(true);
      await rm(targetFile, { force: true });
    }
  });

  it("falls back to the second mirror when the first mirror returns HTTP 500", async () => {
    let mirror1Attempts = 0;
    let mirror2Attempts = 0;

    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/mirror1.bin") {
          mirror1Attempts++;
          return new Response("Server error", { status: 500 });
        }
        if (url.pathname === "/mirror2.bin") {
          mirror2Attempts++;
          return new Response("MIRROR_2_CONTENT", {
            headers: { "Content-Type": "application/octet-stream" },
          });
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const targetFile = join(tmpdir(), `mirror-fallback-${Date.now()}.bin`);

    try {
      const res = await downloadFromMirrors(
        [
          `http://localhost:${server.port}/mirror1.bin`,
          `http://localhost:${server.port}/mirror2.bin`,
        ],
        targetFile,
      );

      expect(res.success).toBe(true);
      expect(mirror1Attempts).toBe(1);
      expect(mirror2Attempts).toBe(1);
      expect(await exists(targetFile)).toBe(true);
      expect(await readFile(targetFile, "utf-8")).toBe("MIRROR_2_CONTENT");
    } finally {
      server.stop(true);
      await rm(targetFile, { force: true });
    }
  });

  it("throws MIRRORS_UNAVAILABLE when all mirrors fail and cleans up file", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("Error", { status: 502 });
      },
    });

    const targetFile = join(tmpdir(), `mirror-fail-${Date.now()}.bin`);

    try {
      let threw = false;
      try {
        await downloadFromMirrors(
          [`http://localhost:${server.port}/bad1.bin`, `http://localhost:${server.port}/bad2.bin`],
          targetFile,
        );
      } catch (err) {
        threw = true;
        expect((err as LauncherAppError).code).toBe("MIRRORS_UNAVAILABLE");
      }
      expect(threw).toBe(true);
      expect(await exists(targetFile)).toBe(false);
    } finally {
      server.stop(true);
      await rm(targetFile, { force: true });
    }
  });

  it("throws MIRRORS_UNAVAILABLE when mirrors array is empty", async () => {
    const targetFile = join(tmpdir(), `mirror-empty-${Date.now()}.bin`);
    let threw = false;
    try {
      await downloadFromMirrors([], targetFile);
    } catch (err) {
      threw = true;
      expect((err as LauncherAppError).code).toBe("MIRRORS_UNAVAILABLE");
    }
    expect(threw).toBe(true);
  });

  it("handles user abort signal during download and removes temp file", async () => {
    const controller = new AbortController();
    controller.abort();

    const targetFile = join(tmpdir(), `mirror-abort-${Date.now()}.bin`);

    let threw = false;
    try {
      await downloadFromMirrors(["https://example.com/dummy.zip"], targetFile, controller.signal);
    } catch (err) {
      threw = true;
      expect((err as LauncherAppError).code).toBe("INSTALL_CANCELLED");
    }
    expect(threw).toBe(true);
    expect(await exists(targetFile)).toBe(false);
  });
});

describe("API: Download Speed & Formatting", () => {
  it("formats speed values into human readable units correctly", () => {
    expect(formatSpeed(0)).toBe("0 B/s");
    expect(formatSpeed(500)).toBe("500 B/s");
    expect(formatSpeed(1024)).toBe("1 KB/s");
    expect(formatSpeed(850 * 1024)).toBe("850 KB/s");
    expect(formatSpeed(1.2 * 1024 * 1024)).toBe("1.2 MB/s");
    expect(formatSpeed(4.2 * 1024 * 1024)).toBe("4.2 MB/s");
    expect(formatSpeed(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB/s");
  });

  it("reports bytesPerSecond in onProgress during mirror download", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("SPEED_TEST_PAYLOAD_CHUNK_DATA");
      },
    });

    const targetFile = join(tmpdir(), `speed-test-${Date.now()}.bin`);
    let reportedSpeed: number | undefined;

    try {
      await downloadFromMirrors([`http://localhost:${server.port}/speed.bin`], targetFile, {
        onProgress: (p) => {
          reportedSpeed = p.bytesPerSecond;
        },
      });

      expect(reportedSpeed).toBeDefined();
      expect(typeof reportedSpeed).toBe("number");
    } finally {
      server.stop(true);
      await rm(targetFile, { force: true });
    }
  });
});
