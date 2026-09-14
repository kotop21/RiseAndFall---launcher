import { API_ROUTES, type AvailableFilesResponse } from "./client";

export async function fetchAvailableFiles(): Promise<Record<
  string,
  string
> | null> {
  console.log("Download: requesting available manifest list");
  try {
    const res = await fetch(API_ROUTES.download(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.log(
        `Download: failed to fetch manifest with status ${res.status}`,
      );
      return null;
    }
    const data = (await res.json()) as AvailableFilesResponse;
    return data.available || null;
  } catch (err) {
    console.log("Download: network error fetching available files");
    return null;
  }
}

export async function downloadSingleFileStream(
  key: string,
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  stream?: ReadableStream<Uint8Array>;
  error?: string;
}> {
  const url = API_ROUTES.download(key);
  console.log(`Download: requesting single file stream for key "${key}"`);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
    });

    if (!res.ok) {
      let message = `Server returned ${res.status}`;
      try {
        const errJson = (await res.json()) as {
          error?: string;
          missing?: string[];
        };
        if (errJson.error) {
          message = errJson.missing
            ? `${errJson.error}: ${errJson.missing.join(", ")}`
            : errJson.error;
        }
      } catch {}
      console.log(`Download: single stream failed - ${message}`);
      return { ok: false, error: message };
    }

    if (!res.body) {
      return { ok: false, error: "Response body is empty" };
    }

    console.log(`Download: stream established for "${key}"`);
    return { ok: true, stream: res.body };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort
      ? "Download aborted by user"
      : "Network connection failure";
    console.log(`Download: ${msg}`);
    return { ok: false, error: msg };
  }
}

export async function downloadFilesStream(
  keys: string[],
  signal?: AbortSignal,
): Promise<{
  ok: boolean;
  stream?: ReadableStream<Uint8Array>;
  error?: string;
}> {
  const url = API_ROUTES.download(keys);
  console.log(
    `Download: requesting files stream for keys [${keys.join(", ")}]`,
  );

  try {
    const res = await fetch(url, {
      method: "GET",
      signal,
    });

    if (!res.ok) {
      let message = `Server returned ${res.status}`;
      try {
        const errJson = (await res.json()) as {
          error?: string;
          missing?: string[];
        };
        if (errJson.error) {
          message = errJson.missing
            ? `${errJson.error}: ${errJson.missing.join(", ")}`
            : errJson.error;
        }
      } catch {}
      console.log(`Download: stream failed - ${message}`);
      return { ok: false, error: message };
    }

    if (!res.body) {
      return { ok: false, error: "Response body is empty" };
    }

    console.log("Download: stream connection established");
    return { ok: true, stream: res.body };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const msg = isAbort
      ? "Download aborted by user"
      : "Network connection failure";
    console.log(`Download: ${msg}`);
    return { ok: false, error: msg };
  }
}
