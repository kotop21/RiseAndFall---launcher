const BASE_URL = (
  process.env.API_URL ||
  process.env.BUN_PUBLIC_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

export const API_ROUTES = {
  health: `${BASE_URL}/api/health`,
  online: `${BASE_URL}/api/online`,
  onlineCount: `${BASE_URL}/api/online/count`,
  download: (keys: string[] | string = "") => {
    const query = Array.isArray(keys)
      ? keys.filter(Boolean).join(",")
      : keys.trim();
    return query
      ? `${BASE_URL}/api/download/${query}`
      : `${BASE_URL}/api/download`;
  },
} as const;

export interface OnlineResponse {
  key: string;
  online: number;
}

export interface OnlineCountResponse {
  online: number;
}

export interface AvailableFilesResponse {
  available: Record<string, string>;
}
