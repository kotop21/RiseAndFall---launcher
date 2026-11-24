import { getResolvedDevApiUrl, IS_DEV_BUILD } from "@/lib/dev";
import { createLauncherError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export function getBaseUrl(): string {
  if (IS_DEV_BUILD) {
    const resolved = getResolvedDevApiUrl();
    if (resolved) {
      return resolved;
    }
  }
  return (
    process.env.API_URL ||
    process.env.PROD_API_URL ||
    process.env.BUN_PUBLIC_API_URL ||
    "https://raf-game.com"
  ).replace(/\/+$/, "");
}

export const API_ROUTES = {
  get health() {
    return `${getBaseUrl()}/health`;
  },
  get online() {
    return `${getBaseUrl()}/online`;
  },
  get onlineCount() {
    return `${getBaseUrl()}/online/count`;
  },
  get manifest() {
    return `${getBaseUrl()}/manifest?v=2`;
  },
  get launcherInfo() {
    return `${getBaseUrl()}/launcher/info`;
  },
  get launcherDownload() {
    return `${getBaseUrl()}/launcher/download`;
  },
} as const;

export function getLauncherInfoUrl(type: "portable" | "setup" = "portable"): string {
  return `${API_ROUTES.launcherInfo}?type=${type}`;
}

export function getLauncherDownloadUrl(type: "portable" | "setup" = "portable"): string {
  return `${API_ROUTES.launcherDownload}?type=${type}`;
}

export interface OnlineResponse {
  key: string;
  online: number;
}

export interface OnlineCountResponse {
  online: number;
}

export interface ManifestPackage {
  id: string;
  name: string;
  mirrors: string[];
  check_file?: string;
  hash?: string;
  description?: string;
  size?: number | string;
  author?: string;
  category?: "graphics" | "qol" | "audio" | "gameplay" | string;
}

export interface ManifestResponse {
  version: string;
  mode?: string;
  required_mods?: string[];
  packages: ManifestPackage[];
  [key: `install_${string}`]: string[] | unknown;
}

export function getInstallLanguages(manifest: ManifestResponse): string[] {
  const result: string[] = [];
  const rec = manifest as unknown as Record<string, unknown>;
  for (const key of Object.keys(manifest)) {
    if (key.startsWith("install_") && Array.isArray(rec[key])) {
      result.push(key.replace(/^install_/, ""));
    }
  }
  return result;
}

export function getInstallPackageQueue(manifest: ManifestResponse, lang: string): string[] {
  const customKey = `install_${lang}`;
  const list = (manifest as unknown as Record<string, unknown>)[customKey];
  if (Array.isArray(list) && list.length > 0) {
    return list.map(String);
  }
  throw createLauncherError(
    "MANIFEST_FAILED",
    `Manifest v2 does not specify package queue for language: ${customKey}`,
  );
}

export interface LauncherReleaseInfo {
  url: string;
  name: string;
  tag: string;
  type: "portable" | "setup" | string;
}

export async function fetchLauncherInfo(
  type: "portable" | "setup" = "portable",
  signal?: AbortSignal,
): Promise<LauncherReleaseInfo> {
  const url = getLauncherInfoUrl(type);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      const desc = `Server returned HTTP ${res.status}`;
      logger.error("updater", `Failed to fetch launcher info: ${desc}`);
      throw createLauncherError("GITHUB_API_FAILED", desc);
    }

    const data = (await res.json()) as Partial<LauncherReleaseInfo>;
    if (!data || typeof data.url !== "string" || typeof data.tag !== "string") {
      const desc = "Invalid launcher info payload: missing url or tag";
      logger.error("updater", desc, data);
      throw createLauncherError("GITHUB_API_FAILED", desc);
    }

    return {
      url: data.url.trim(),
      name: data.name ? data.name.trim() : `RiseAndFall-Launcher-${data.tag.trim()}-${type}.zip`,
      tag: data.tag.trim(),
      type: (data.type ? data.type.trim() : type) as "portable" | "setup" | string,
    };
  } catch (err: unknown) {
    if (signal?.aborted) {
      throw createLauncherError("INSTALL_CANCELLED", "Launcher info fetch aborted");
    }
    logger.error("updater", "Network error in fetchLauncherInfo:", err);
    throw createLauncherError(
      "GITHUB_API_FAILED",
      "Failed establishing network connection for launcher info",
      err,
    );
  }
}
