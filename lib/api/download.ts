import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  API_ROUTES,
  type ManifestPackage,
  type ManifestResponse,
} from "./client";
import { createLauncherError, LauncherAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type { ManifestPackage, ManifestResponse };

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes?: number;
  bytesPerSecond?: number;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
  }
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  }
  return `${Math.max(0, Math.round(bytesPerSecond))} B/s`;
}

export interface DownloadFromMirrorsOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
}

export async function fetchManifest(
  signal?: AbortSignal,
): Promise<ManifestResponse> {
  const url = API_ROUTES.manifest;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      const desc = `Server returned HTTP ${res.status}`;
      logger.error("manifest", `Failed to fetch manifest: ${desc}`);
      throw createLauncherError("MANIFEST_FAILED", desc);
    }

    const data = (await res.json()) as ManifestResponse;
    if (!data || !Array.isArray(data.packages)) {
      const desc = "Invalid manifest payload: missing packages array";
      logger.error("manifest", desc);
      throw createLauncherError("MANIFEST_FAILED", desc);
    }

    return data;
  } catch (err: unknown) {
    const isAbort =
      signal?.aborted ||
      (err instanceof Error &&
        (err.name === "AbortError" || err.message === "AbortError"));

    if (isAbort) {
      throw createLauncherError(
        "INSTALL_CANCELLED",
        "Manifest fetch aborted by user",
      );
    }

    if (err instanceof LauncherAppError) {
      throw err;
    }

    logger.error("manifest", "Network error in fetchManifest:", err);
    throw createLauncherError(
      "MANIFEST_FAILED",
      "Failed establishing network connection for manifest",
      err,
    );
  }
}

export async function downloadFromMirrors(
  mirrors: string[],
  targetFilePath: string,
  options?: DownloadFromMirrorsOptions,
): Promise<{ success: boolean; bytesDownloaded: number; totalBytes?: number }>;
export async function downloadFromMirrors(
  mirrors: string[],
  targetFilePath: string,
  signal?: AbortSignal,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<{ success: boolean; bytesDownloaded: number; totalBytes?: number }>;
export async function downloadFromMirrors(
  mirrors: string[],
  targetFilePath: string,
  signalOrOptions?: AbortSignal | DownloadFromMirrorsOptions,
  legacyOnProgress?: (progress: DownloadProgress) => void,
): Promise<{ success: boolean; bytesDownloaded: number; totalBytes?: number }> {
  let signal: AbortSignal | undefined;
  let onProgress: ((progress: DownloadProgress) => void) | undefined;

  if (signalOrOptions instanceof AbortSignal) {
    signal = signalOrOptions;
    onProgress = legacyOnProgress;
  } else if (signalOrOptions && typeof signalOrOptions === "object") {
    signal = signalOrOptions.signal;
    onProgress = signalOrOptions.onProgress;
  }

  if (signal?.aborted) {
    throw createLauncherError("INSTALL_CANCELLED", "Download aborted by user");
  }

  if (!mirrors || mirrors.length === 0) {
    logger.error("download", "No mirrors provided for download");
    throw createLauncherError(
      "MIRRORS_UNAVAILABLE",
      "No download mirrors provided",
    );
  }

  await mkdir(dirname(targetFilePath), { recursive: true });

  let lastError: unknown = null;

  for (let i = 0; i < mirrors.length; i++) {
    const url = mirrors[i];

    if (signal?.aborted) {
      try {
        await unlink(targetFilePath);
      } catch {}
      throw createLauncherError(
        "INSTALL_CANCELLED",
        "Download aborted by user",
      );
    }

    try {
      const res = await fetch(url, {
        method: "GET",
        signal,
        headers: {
          "User-Agent": "BunGpuix-Launcher",
          Accept: "application/octet-stream, */*",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Response body is empty");
      }

      const lenHeader = res.headers.get("content-length");
      const totalBytes = lenHeader ? parseInt(lenHeader, 10) : undefined;

      let bytesDownloaded = 0;
      let lastProgressUpdate = 0;
      let lastSpeedBytes = 0;
      let lastSpeedTime = Date.now();
      let currentSpeed = 0;

      const progressTransform = new Transform({
        highWaterMark: 2 * 1024 * 1024,
        transform(chunk: Buffer | Uint8Array, _encoding, callback) {
          bytesDownloaded += chunk.length;
          const now = Date.now();

          if (now - lastProgressUpdate > 120) {
            const timeDiff = (now - lastSpeedTime) / 1000;
            if (timeDiff >= 0.25) {
              const bytesDiff = bytesDownloaded - lastSpeedBytes;
              currentSpeed = Math.round(bytesDiff / timeDiff);
              lastSpeedBytes = bytesDownloaded;
              lastSpeedTime = now;
            }

            lastProgressUpdate = now;
            onProgress?.({
              bytesDownloaded,
              totalBytes,
              bytesPerSecond: currentSpeed,
            });
          }

          callback(null, chunk);
        },
      });

      const nodeReadable = Readable.fromWeb(res.body as any);
      const fileWriteStream = createWriteStream(targetFilePath, {
        highWaterMark: 2 * 1024 * 1024,
      });

      await pipeline(nodeReadable, progressTransform, fileWriteStream, {
        signal,
      });

      const finalNow = Date.now();
      const finalTimeDiff = (finalNow - lastSpeedTime) / 1000;
      if (finalTimeDiff > 0.05) {
        currentSpeed = Math.round(
          (bytesDownloaded - lastSpeedBytes) / finalTimeDiff,
        );
      }

      onProgress?.({
        bytesDownloaded,
        totalBytes,
        bytesPerSecond: currentSpeed,
      });

      return {
        success: true,
        bytesDownloaded,
        totalBytes,
      };
    } catch (err: unknown) {
      try {
        await unlink(targetFilePath);
      } catch {}

      const isAbort =
        signal?.aborted ||
        (err instanceof Error &&
          (err.name === "AbortError" || err.message === "AbortError"));

      if (isAbort) {
        throw createLauncherError(
          "INSTALL_CANCELLED",
          "Download aborted by user",
        );
      }

      lastError = err;
      logger.warn(
        "download",
        `Mirror failed: ${url}, trying next mirror...`,
        err,
      );
    }
  }

  logger.error("download", `All mirrors failed (${mirrors.length} tried)`, {
    mirrors,
    lastError,
  });

  throw createLauncherError(
    "MIRRORS_UNAVAILABLE",
    `Failed to download from all available mirrors: ${mirrors.join(", ")}`,
    lastError,
  );
}
