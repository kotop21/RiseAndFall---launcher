import type { ReleaseItem } from "./types";
import { MOCK_RELEASES } from "./mock";

const RELEASES_API_URL =
  "https://api.github.com/repos/kotop21/RiseAndFall---launcher/releases";

interface GitHubReleaseRaw {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
}

let cachedReleases: ReleaseItem[] | null = null;
let inFlightRequest: Promise<ReleaseItem[]> | null = null;

export async function fetchReleases(
  forceRefresh = false,
): Promise<ReleaseItem[]> {
  if (!forceRefresh && cachedReleases) {
    return cachedReleases;
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const res = await fetch(`${RELEASES_API_URL}?per_page=5`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "BunGpuix-Launcher",
        },
      });

      if (!res.ok) {
        cachedReleases = MOCK_RELEASES.slice(0, 5);
        return cachedReleases;
      }

      const data = (await res.json()) as GitHubReleaseRaw[];

      if (!Array.isArray(data)) {
        cachedReleases = MOCK_RELEASES.slice(0, 5);
        return cachedReleases;
      }

      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime(),
      );

      cachedReleases = sorted.slice(0, 5).map((item) => {
        const version = item.tag_name;
        const rawTitle = item.name ? item.name.trim() : null;

        let title: string | null = null;

        if (rawTitle && rawTitle !== version) {
          title = rawTitle;
        } else if (item.body) {
          const cleanText = item.body
            .replace(/^[*\-•#\s]+/gm, "")
            .replace(/\r?\n+/g, " ")
            .trim();

          if (cleanText.length > 0) {
            title =
              cleanText.length > 20
                ? `${cleanText.slice(0, 20)}...`
                : cleanText;
          }
        }

        return {
          version,
          title,
          url: item.html_url,
        };
      });

      return cachedReleases;
    } catch {
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
