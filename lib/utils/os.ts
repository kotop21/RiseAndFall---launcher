import { getDevArgs } from "@/lib/dev/cli";

export function isWindows(): boolean {
  const devArgs = getDevArgs();
  if (devArgs.isDev && devArgs.mockRelease) {
    return true;
  }
  return process.platform === "win32";
}

export function isMac(): boolean {
  const devArgs = getDevArgs();
  if (devArgs.isDev && devArgs.mockRelease) {
    return false;
  }
  return process.platform === "darwin";
}

export function isLinux(): boolean {
  const devArgs = getDevArgs();
  if (devArgs.isDev && devArgs.mockRelease) {
    return false;
  }
  return process.platform === "linux";
}
