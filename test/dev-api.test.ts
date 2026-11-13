import { afterEach, describe, expect, it } from "bun:test";
import { getBaseUrl } from "@/lib/api/client";
import {
  getResolvedDevApiUrl,
  resetDevApiResolver,
  resetDevArgs,
  resolveDevApiUrl,
} from "@/lib/dev";
import * as ProdStub from "@/lib/dev/prod-stub";

describe("Dev API: Dual URL Resolution & Fallback", () => {
  const origArgv = [...process.argv];
  const origDevUrl = process.env.DEV_API_URL;
  const origProdUrl = process.env.PROD_API_URL;
  const origApiUrl = process.env.API_URL;

  afterEach(() => {
    process.argv = [...origArgv];
    if (origDevUrl !== undefined) process.env.DEV_API_URL = origDevUrl;
    else delete process.env.DEV_API_URL;
    if (origProdUrl !== undefined) process.env.PROD_API_URL = origProdUrl;
    else delete process.env.PROD_API_URL;
    if (origApiUrl !== undefined) process.env.API_URL = origApiUrl;
    else delete process.env.API_URL;
    resetDevArgs();
    resetDevApiResolver();
  });

  it("selects DEV_API_URL when /health responds 200 OK", async () => {
    const devServer = Bun.serve({
      port: 0,
      fetch(req) {
        if (new URL(req.url).pathname === "/health") {
          return Response.json({ status: "ok" });
        }
        return new Response("Not found", { status: 404 });
      },
    });

    try {
      process.argv = ["bun", "index.tsx"];
      process.env.DEV_API_URL = `http://localhost:${devServer.port}`;
      process.env.PROD_API_URL = "https://prod.example.com";
      resetDevArgs();

      const resolved = await resolveDevApiUrl(500);
      expect(resolved).toBe(`http://localhost:${devServer.port}`);
      expect(getResolvedDevApiUrl()).toBe(`http://localhost:${devServer.port}`);
      expect(getBaseUrl()).toBe(`http://localhost:${devServer.port}`);
    } finally {
      devServer.stop(true);
    }
  });

  it("falls back to PROD_API_URL when DEV_API_URL /health returns 500", async () => {
    const devServer = Bun.serve({
      port: 0,
      fetch() {
        return new Response("Unhealthy", { status: 500 });
      },
    });

    try {
      process.argv = ["bun", "index.tsx"];
      process.env.DEV_API_URL = `http://localhost:${devServer.port}`;
      process.env.PROD_API_URL = "https://prod.example.com";
      resetDevArgs();

      const resolved = await resolveDevApiUrl(500);
      expect(resolved).toBe("https://prod.example.com");
      expect(getBaseUrl()).toBe("https://prod.example.com");
    } finally {
      devServer.stop(true);
    }
  });

  it("falls back to PROD_API_URL when DEV_API_URL is unreachable", async () => {
    // Bind and immediately stop to obtain an unused closed port
    const tempServer = Bun.serve({ port: 0, fetch: () => new Response("ok") });
    const closedPort = tempServer.port;
    tempServer.stop(true);

    process.argv = ["bun", "index.tsx"];
    process.env.DEV_API_URL = `http://127.0.0.1:${closedPort}`;
    process.env.PROD_API_URL = "https://prod.example.com";
    resetDevArgs();

    const resolved = await resolveDevApiUrl(300);
    expect(resolved).toBe("https://prod.example.com");
    expect(getBaseUrl()).toBe("https://prod.example.com");
  });

  it("uses CLI --api override immediately without health probing", async () => {
    process.argv = ["bun", "index.tsx", "--api", "http://192.168.1.99:4000/"];
    process.env.DEV_API_URL = "http://localhost:3000";
    process.env.PROD_API_URL = "https://prod.example.com";
    resetDevArgs();

    const resolved = await resolveDevApiUrl(200);
    expect(resolved).toBe("http://192.168.1.99:4000");
    expect(getBaseUrl()).toBe("http://192.168.1.99:4000");
  });

  it("forces PROD_API_URL immediately when --prod is passed even if dev server is healthy", async () => {
    let devHit = false;
    const devServer = Bun.serve({
      port: 0,
      fetch() {
        devHit = true;
        return Response.json({ status: "ok" });
      },
    });

    try {
      process.argv = ["bun", "index.tsx", "--prod"];
      process.env.DEV_API_URL = `http://localhost:${devServer.port}`;
      process.env.PROD_API_URL = "https://prod.example.com";
      resetDevArgs();

      const resolved = await resolveDevApiUrl(500);
      expect(resolved).toBe("https://prod.example.com");
      expect(devHit).toBe(false);
    } finally {
      devServer.stop(true);
    }
  });
});

describe("Dev Stub: Production Isolation Guarantees", () => {
  it("prod-stub strictly disables dev mode, flags, and dev URLs", async () => {
    expect(ProdStub.IS_DEV_BUILD).toBe(false);
    expect(ProdStub.isDevMode()).toBe(false);
    expect(ProdStub.isForceWelcome()).toBe(false);
    expect(ProdStub.getDevArgs().isDev).toBe(false);
    expect(ProdStub.getDevArgs().logFile).toBe(true);
    expect(ProdStub.getDevArgs().allowSelfUpdate).toBe(true);
    expect(ProdStub.getConfiguredDevApiUrl()).toBe("");
    expect(ProdStub.getResolvedDevApiUrl()).toBeNull();
    expect(await ProdStub.resolveDevApiUrl()).toBeNull();
  });
});
