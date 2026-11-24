import type { DevCliArgs } from "./cli";

export type { DevCliArgs, SupportedDevLang, SupportedDevView } from "./cli";

export const IS_DEV_BUILD = false;

export const PROD_DEV_ARGS: DevCliArgs = {
  isDev: false,
  disableAutoDetectLanguage: false,
  lowSpec: false,
  logFile: true,
  mockRelease: false,
  showAllBadges: false,
  resetBadges: false,
  forceProdApi: false,
  devMenu: false,
  forceWelcome: false,
  allowSelfUpdate: true,
};

export function isDevMode(): boolean {
  return false;
}

export function isForceWelcome(): boolean {
  return false;
}

export function parseDevArgs(): DevCliArgs {
  return PROD_DEV_ARGS;
}

export function getDevArgs(): DevCliArgs {
  return PROD_DEV_ARGS;
}

export function resetDevArgs(): void {}

export function getProdApiUrl(): string {
  return (process.env.API_URL || process.env.PROD_API_URL || "https://raf-game.com").replace(
    /\/+$/,
    "",
  );
}

export function getConfiguredDevApiUrl(): string {
  return "";
}

export function getResolvedDevApiUrl(): string | null {
  return null;
}

export function resetDevApiResolver(): void {}

export async function resolveDevApiUrl(): Promise<string | null> {
  return null;
}

export async function initDevRuntime(): Promise<void> {}
