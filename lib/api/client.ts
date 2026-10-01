export function getBaseUrl(): string {
  return (process.env.API_URL || process.env.BUN_PUBLIC_API_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
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
  get manifest() {
    return `${getBaseUrl()}/api/manifest`;
  },
} as const;

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
}

export interface ManifestResponse {
  mode: string;
  version: string;
  packages: ManifestPackage[];
}
