import { logger } from "@/lib/logger";
import { getDevArgs } from "./cli";
import { IS_DEV_BUILD } from "./env";

const DEFAULT_DEV_API_URL = "http://localhost:3000";
const DEFAULT_PROD_API_URL = "https://raf-game.com";
const DEFAULT_PROBE_TIMEOUT_MS = 800;

let resolvedDevApiUrl: string | null = null;
let inFlightProbe: Promise<string | null> | null = null;

function trimTrailingSlashes(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isLocalApiUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("0.0.0.0");
}

export function getProdApiUrl(): string {
  const explicitProd = process.env.PROD_API_URL?.trim();
  if (explicitProd) {
    return trimTrailingSlashes(explicitProd);
  }

  const legacyApi = (process.env.API_URL || process.env.BUN_PUBLIC_API_URL || "").trim();
  if (legacyApi && !isLocalApiUrl(legacyApi)) {
    return trimTrailingSlashes(legacyApi);
  }

  return DEFAULT_PROD_API_URL;
}

export function getConfiguredDevApiUrl(): string {
  const explicitDev = process.env.DEV_API_URL?.trim();
  if (explicitDev) {
    return trimTrailingSlashes(explicitDev);
  }

  const legacyApi = (process.env.API_URL || process.env.BUN_PUBLIC_API_URL || "").trim();
  if (legacyApi) {
    return trimTrailingSlashes(legacyApi);
  }

  return DEFAULT_DEV_API_URL;
}

export function getResolvedDevApiUrl(): string | null {
  return resolvedDevApiUrl;
}

export function resetDevApiResolver(): void {
  resolvedDevApiUrl = null;
  inFlightProbe = null;
}

async function probeHealth(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves active API base URL once on startup in dev builds:
 * 1. CLI `--api <url>` override takes highest precedence.
 * 2. CLI `--prod` / `--prod-api` forces PROD API immediately.
 * 3. Otherwise probes `{DEV_API_URL}/health` (800ms timeout); falls back to PROD API if unreachable.
 */
export async function resolveDevApiUrl(
  probeTimeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
): Promise<string | null> {
  if (!IS_DEV_BUILD) {
    return null;
  }

  if (resolvedDevApiUrl !== null) {
    return resolvedDevApiUrl;
  }

  if (inFlightProbe) {
    return inFlightProbe;
  }

  inFlightProbe = (async () => {
    const devArgs = getDevArgs();
    const prodUrl = getProdApiUrl();

    if (devArgs.apiOverride) {
      resolvedDevApiUrl = devArgs.apiOverride;
      logger.info("dev:api", `Using CLI override API: ${resolvedDevApiUrl}`);
      return resolvedDevApiUrl;
    }

    if (devArgs.forceProdApi) {
      resolvedDevApiUrl = prodUrl;
      logger.info("dev:api", `Forced PROD API (--prod): ${resolvedDevApiUrl}`);
      return resolvedDevApiUrl;
    }

    const devUrl = getConfiguredDevApiUrl();
    if (!devUrl || devUrl === prodUrl) {
      resolvedDevApiUrl = prodUrl;
      logger.info("dev:api", `Active API URL: ${resolvedDevApiUrl}`);
      return resolvedDevApiUrl;
    }

    const isDevHealthy = await probeHealth(devUrl, probeTimeoutMs);
    if (isDevHealthy) {
      resolvedDevApiUrl = devUrl;
      logger.info("dev:api", `Connected to DEV API: ${devUrl}`);
    } else {
      resolvedDevApiUrl = prodUrl;
      logger.warn(
        "dev:api",
        `DEV API (${devUrl}) unreachable, falling back to PROD API: ${prodUrl}`,
      );
    }

    return resolvedDevApiUrl;
  })().finally(() => {
    inFlightProbe = null;
  });

  return inFlightProbe;
}

/**
 * Centralized dev runtime initialization executed once at app startup.
 * Future dev initialization hooks (dev overlays, dev mocks, etc.) should be wired here.
 */
export async function initDevRuntime(): Promise<void> {
  if (!IS_DEV_BUILD) {
    return;
  }
  await resolveDevApiUrl();
}
