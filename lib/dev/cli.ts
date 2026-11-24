import { IS_DEV_BUILD } from "./env";

export type SupportedDevView = "welcome" | "main" | "settings" | "install";
export type SupportedDevLang = "en" | "ua" | "ru";

export interface DevCliArgs {
  isDev: boolean;
  lang?: SupportedDevLang;
  disableAutoDetectLanguage: boolean;
  view?: SupportedDevView;
  lowSpec: boolean;
  logFile: boolean;
  mockRelease: boolean;
  showAllBadges: boolean;
  resetBadges: boolean;
  unreadBadges?: string[];
  apiOverride?: string;
  forceProdApi: boolean;
  devMenu: boolean;
  forceWelcome: boolean;
  allowSelfUpdate: boolean;
}

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
  return IS_DEV_BUILD;
}

function extractArgValue(argv: string[], names: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    for (const name of names) {
      if (arg === name) {
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          return next;
        }
      }
      if (arg.startsWith(`${name}=`)) {
        return arg.slice(name.length + 1);
      }
    }
  }
  return undefined;
}

function hasArgFlag(argv: string[], names: string[]): boolean {
  for (const arg of argv) {
    for (const name of names) {
      if (arg === name) {
        return true;
      }
      if (arg.startsWith(`${name}=`)) {
        const val = arg.slice(name.length + 1).toLowerCase();
        return val === "1" || val === "true" || val === "yes";
      }
    }
  }
  return false;
}

function normalizeDevLang(raw: string | undefined): SupportedDevLang | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().trim();
  if (lower === "ua" || lower === "uk" || lower.startsWith("uk-") || lower.startsWith("uk_")) {
    return "ua";
  }
  if (lower === "ru" || lower.startsWith("ru-") || lower.startsWith("ru_")) {
    return "ru";
  }
  if (lower === "en" || lower.startsWith("en-") || lower.startsWith("en_")) {
    return "en";
  }
  return undefined;
}

function normalizeDevView(raw: string | undefined): SupportedDevView | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().trim();
  if (lower === "welcome" || lower === "main" || lower === "settings" || lower === "install") {
    return lower;
  }
  return undefined;
}

function isForceWelcomeEnvSet(): boolean {
  const flag = (process.env.FORCE_WELCOME || process.env.TEST_MODE || process.env.WELCOME || "")
    .toLowerCase()
    .trim();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function isForceWelcome(): boolean {
  if (!isDevMode()) {
    return false;
  }
  return getDevArgs().forceWelcome || isForceWelcomeEnvSet();
}

export function parseDevArgs(
  argv: string[] = process.argv.slice(2),
  isDev = isDevMode(),
): DevCliArgs {
  if (!isDev) {
    return { ...PROD_DEV_ARGS };
  }

  const lang = normalizeDevLang(extractArgValue(argv, ["--lang", "--language", "-l"]));
  const view = normalizeDevView(extractArgValue(argv, ["--view", "-v"]));
  const lowSpec = hasArgFlag(argv, ["--low-spec", "--low-performance"]);
  const logFile = hasArgFlag(argv, ["--log-file", "--file-logs", "--enable-log-file"]);
  const showAllBadges = hasArgFlag(argv, ["--show-all-badges", "--all-badges"]);
  const resetBadges = hasArgFlag(argv, ["--reset-badges", "--clear-badges"]);
  const unreadRaw = extractArgValue(argv, ["--unread-badges", "--badges"]);
  const unreadBadges = unreadRaw
    ? unreadRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const mockRelease = hasArgFlag(argv, [
    "--mock-release",
    "--release",
    "-release",
    "-r",
    "--mock-windows",
    "--windows",
    "-windows",
    "-w",
  ]);

  const rawApiOverride = extractArgValue(argv, ["--api", "--api-url"])?.trim();
  const apiOverride = rawApiOverride ? rawApiOverride.replace(/\/+$/, "") : undefined;
  const forceProdApi = hasArgFlag(argv, ["--prod", "--prod-api"]);
  const devMenu = hasArgFlag(argv, ["--dev-menu"]);
  const forceWelcome = hasArgFlag(argv, ["--force-welcome"]);
  const allowSelfUpdate = hasArgFlag(argv, ["--allow-self-update"]);

  return {
    isDev: true,
    lang,
    disableAutoDetectLanguage: Boolean(lang),
    view,
    lowSpec,
    logFile,
    mockRelease,
    showAllBadges,
    resetBadges,
    unreadBadges,
    apiOverride,
    forceProdApi,
    devMenu,
    forceWelcome,
    allowSelfUpdate,
  };
}

let cachedArgs: DevCliArgs | null = null;

export function getDevArgs(): DevCliArgs {
  if (!cachedArgs) {
    cachedArgs = parseDevArgs();
  }
  return cachedArgs;
}

export function resetDevArgs(): void {
  cachedArgs = null;
}
