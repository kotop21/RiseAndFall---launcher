import type { ReleaseItem } from "./types";
import { MOCK_RELEASES } from "./mock";

const RELEASES_API_URL = "";

interface GitHubReleaseRaw {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string;
}

export async function fetchReleases(): Promise<ReleaseItem[]> {
  if (!RELEASES_API_URL) {
    return MOCK_RELEASES.slice(0, 5);
  }

  try {
    const res = await fetch(`${RELEASES_API_URL}?per_page=5`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "BunGpuix-Launcher",
      },
    });

    if (!res.ok) {
      return MOCK_RELEASES.slice(0, 5);
    }

    const data = (await res.json()) as GitHubReleaseRaw[];

    const sorted = [...data].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    return sorted.slice(0, 5).map((item) => {
      const version = item.tag_name;
      const rawTitle = item.name ? item.name.trim() : null;
      const title = rawTitle && rawTitle !== version ? rawTitle : null;

      return {
        version,
        title,
        url: item.html_url,
      };
    });
  } catch {
    return MOCK_RELEASES.slice(0, 5);
  }
}
