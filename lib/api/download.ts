import { API_ROUTES, type AvailableFilesResponse } from "./client";
import { createLauncherError, type LauncherAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface DownloadStreamResult {
  ok: boolean;
  stream?: ReadableStream<Uint8Array>;
  totalBytes?: number;
  error?: LauncherAppError;
}

export async function fetchAvailableFiles(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(API_ROUTES.download(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      logger.error("api", `Failed to fetch available files: HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as AvailableFilesResponse;
    return data.available || null;
  } catch (err) {
    logger.error("api", "Network error in fetchAvailableFiles:", err);
    return null;
  }
}

export async function downloadSingleFileStream(
  key: string,
  signal?: AbortSignal,
): Promise<DownloadStreamResult> {
  const url = API_ROUTES.download(key);

  try {
    const res = await fetch(url, { method: "GET", signal });
    if (!res.ok) {
      let desc = `Server returned HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as { error?: string; missing?: string[] };
        if (errJson.error) {
          desc = errJson.missing?.length ? `${errJson.error}: ${errJson.missing.join(", ")}` : errJson.error;
        }
      } catch {}
      logger.error("download", `Download single file error: ${desc}`);
      return { ok: false, error: createLauncherError("DOWNLOAD_FAILED", desc) };
    }

    if (!res.body) {
      logger.error("download", "Response payload stream is empty");
      return { ok: false, error: createLauncherError("DOWNLOAD_FAILED", "Empty response payload stream") };
    }

    const lenHeader = res.headers.get("content-length");
    return {
      ok: true,
      stream: res.body,
      totalBytes: lenHeader ? parseInt(lenHeader, 10) : undefined,
    };
  } catch (err: unknown) {
    const isAbort =
      (err instanceof Error && (err.name === "AbortError" || err.message === "AbortError")) ||
      signal?.aborted;

    if (!isAbort) {
      logger.error("download", "Network error in downloadSingleFileStream:", err);
    }

    return {
      ok: false,
      error: createLauncherError(
        isAbort ? "INSTALL_CANCELLED" : "NETWORK_OFFLINE",
        isAbort ? "Download aborted by user" : "Failed establishing network stream connection",
        err,
      ),
    };
  }
}

export async function downloadFilesStream(
  keys: string[],
  signal?: AbortSignal,
): Promise<DownloadStreamResult> {
  const url = API_ROUTES.download(keys);

  try {
    const res = await fetch(url, { method: "GET", signal });
    if (!res.ok) {
      let desc = `Server returned HTTP ${res.status}`;
      try {
        const errJson = (await res.json()) as { error?: string; missing?: string[] };
        if (errJson.error) {
          desc = errJson.missing?.length ? `${errJson.error}: ${errJson.missing.join(", ")}` : errJson.error;
        }
      } catch {}
      logger.error("download", `Download files error: ${desc}`);
      return { ok: false, error: createLauncherError("DOWNLOAD_FAILED", desc) };
    }

    if (!res.body) {
      logger.error("download", "Response payload stream is empty");
      return { ok: false, error: createLauncherError("DOWNLOAD_FAILED", "Empty response payload stream") };
    }

    const lenHeader = res.headers.get("content-length");
    return {
      ok: true,
      stream: res.body,
      totalBytes: lenHeader ? parseInt(lenHeader, 10) : undefined,
    };
  } catch (err: unknown) {
    const isAbort =
      (err instanceof Error && (err.name === "AbortError" || err.message === "AbortError")) ||
      signal?.aborted;

    if (!isAbort) {
      logger.error("download", "Network error in downloadFilesStream:", err);
    }

    return {
      ok: false,
      error: createLauncherError(
        isAbort ? "INSTALL_CANCELLED" : "NETWORK_OFFLINE",
        isAbort ? "Download aborted by user" : "Failed establishing network stream connection",
        err,
      ),
    };
  }
}
