import type { ReleaseItem } from "./types";
import { MOCK_RELEASES } from "./mock";
import { logger } from "@/lib/logger";

const RELEASES_API_URL = "https://api.github.com/repos/kotop21/RiseAndFall---launcher/releases";

interface GitHubReleaseRaw {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
}

let cachedReleases: ReleaseItem[] | null = null;
let inFlightRequest: Promise<ReleaseItem[]> | null = null;

function formatReleaseTitle(rawTitle: string | null | undefined, body: string | null | undefined, version: string): string | null {
  const cleanTitle = rawTitle?.trim();
  if (cleanTitle && cleanTitle !== version) {
    return cleanTitle;
  }

  if (!body) return null;

  const inlineText = body
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s*\-•#\d.]+/g, "").trim())
    .filter(Boolean)
    .join(" • ");

  if (!inlineText) return null;

  const limit = 48;
  return inlineText.length > limit
    ? `${inlineText.slice(0, limit).trimEnd()}... [more]`
    : inlineText;
}

export async function fetchReleases(forceRefresh = false): Promise<ReleaseItem[]> {
  if (!forceRefresh && cachedReleases) return cachedReleases;
  if (!forceRefresh && inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    try {
      const res = await fetch(`${RELEASES_API_URL}?per_page=5`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "BunGpuix-Launcher",
        },
      });

      if (!res.ok) {
        logger.error("github", `Releases fetch returned HTTP ${res.status}`);
        cachedReleases = MOCK_RELEASES.slice(0, 5);
        return cachedReleases;
      }

      const data = (await res.json()) as GitHubReleaseRaw[];
      if (!Array.isArray(data)) {
        logger.error("github", "Releases response is not an array");
        cachedReleases = MOCK_RELEASES.slice(0, 5);
        return cachedReleases;
      }

      const sorted = [...data].sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      );

      cachedReleases = sorted.slice(0, 5).map((item) => ({
        version: item.tag_name,
        title: formatReleaseTitle(item.name, item.body, item.tag_name),
        url: item.html_url,
      }));

      return cachedReleases;
    } catch (err) {
      logger.error("github", "Network or parsing error fetching releases:", err);
      cachedReleases = MOCK_RELEASES.slice(0, 5);
      return cachedReleases;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

export function getCachedReleases(): ReleaseItem[] | null {
  return cachedReleases;
}
