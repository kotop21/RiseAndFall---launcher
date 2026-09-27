export function cleanVersion(v: string | null | undefined): string {
  if (!v) return "0.0.0";
  return v.trim().replace(/^v/i, "").split("-")[0].trim();
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = cleanVersion(v1).split(".").map((n) => parseInt(n, 10) || 0);
  const parts2 = cleanVersion(v2).split(".").map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function isDifferentVersion(remote: string, current: string): boolean {
  return cleanVersion(remote) !== cleanVersion(current);
}

export function isNewerVersion(remote: string, current: string): boolean {
  return compareVersions(remote, current) > 0;
}
