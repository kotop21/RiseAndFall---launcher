export function getBaseUrl(): string {
  return (
    process.env.API_URL ||
    process.env.BUN_PUBLIC_API_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export const API_ROUTES = {
  get health() {
    return `${getBaseUrl()}/api/health`;
  },
  get online() {
    return `${getBaseUrl()}/api/online`;
  },
  get onlineCount() {
    return `${getBaseUrl()}/api/online/count`;
  },
  download: (keys: string[] | string = "") => {
    const query = Array.isArray(keys)
      ? keys.filter(Boolean).join(",")
      : keys.trim();
    return query
      ? `${getBaseUrl()}/api/download/${query}`
      : `${getBaseUrl()}/api/download`;
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
