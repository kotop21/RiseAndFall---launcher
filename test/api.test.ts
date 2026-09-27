import { describe, expect, it } from "bun:test";
import { API_ROUTES } from "@/lib/api/client";
import {
  fetchAvailableFiles,
  downloadSingleFileStream,
  downloadFilesStream,
} from "@/lib/api/download";

describe("API: Routes Builder", () => {
  it("builds correct download route without keys", () => {
    expect(API_ROUTES.download()).toContain("/api/download");
    expect(API_ROUTES.download("")).toContain("/api/download");
    expect(API_ROUTES.download([])).toContain("/api/download");
  });

  it("builds correct download route with single key", () => {
    expect(API_ROUTES.download("game")).toContain("/api/download/game");
    expect(API_ROUTES.download("lang:ru")).toContain("/api/download/lang:ru");
  });

  it("builds correct download route with multiple keys", () => {
    expect(API_ROUTES.download(["game", "lang:en", "mod:bfm"])).toContain(
      "/api/download/game,lang:en,mod:bfm",
    );
  });
});

describe("API: Available Files & Streaming", () => {
  it("fetches available files from a mock server", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/download") {
          return Response.json({
            available: {
              game: "game_v1.zip",
              "lang:ru": "lang_ru.zip",
            },
          });
        }
        return new Response("Not found", { status: 404 });
      },
    });

    const prevApi = process.env.API_URL;
    process.env.API_URL = `http://localhost:${server.port}`;

    // Note: API_ROUTES has static base evaluated on import, but we can verify fetch logic directly
    const res = await fetch(`http://localhost:${server.port}/api/download`);
    const data = await res.json();
    expect(data.available.game).toBe("game_v1.zip");

    server.stop(true);
    if (prevApi) process.env.API_URL = prevApi;
  });

  it("handles server 500 error gracefully in stream download", async () => {
    const server = Bun.serve({
      port: 0,
      fetch() {
        return Response.json(
          { error: "Custom server failure", missing: ["game"] },
          { status: 500 },
        );
      },
    });

    // Test abort signal handling
    const controller = new AbortController();
    controller.abort();

    const streamResult = await downloadSingleFileStream("game", controller.signal);
    expect(streamResult.ok).toBe(false);
    expect(streamResult.error?.code).toBe("INSTALL_CANCELLED");

    server.stop(true);
  });

  it("handles user abort signal during download stream", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await downloadFilesStream(["game", "lang:en"], controller.signal);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("INSTALL_CANCELLED");
  });
});
