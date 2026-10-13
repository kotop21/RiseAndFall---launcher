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
}

export function isDevMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.platform !== "win32") {
    return true;
  }
  const exec = process.execPath.toLowerCase();
  if (exec.includes("bun") || exec.includes("node")) {
    return true;
  }
  if (!exec.endsWith(".exe")) {
    return true;
  }
  const mainArg = process.argv[1] || "";
  if (mainArg.endsWith(".tsx") || mainArg.endsWith(".ts")) {
    return true;
  }
  return false;
}

function extractArgValue(argv: string[], names: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
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

export function parseDevArgs(
  argv: string[] = process.argv.slice(2),
  isDev = isDevMode(),
): DevCliArgs {
  if (!isDev) {
    return {
      isDev: false,
      disableAutoDetectLanguage: false,
      lowSpec: false,
      logFile: true,
      mockRelease: false,
    };
  }

  const lang = normalizeDevLang(extractArgValue(argv, ["--lang", "--language", "-l"]));
  const view = normalizeDevView(extractArgValue(argv, ["--view", "-v"]));
  const lowSpec = hasArgFlag(argv, ["--low-spec", "--low-performance"]);
  const logFile = hasArgFlag(argv, ["--log-file", "--file-logs", "--enable-log-file"]);
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

  return {
    isDev: true,
    lang,
    disableAutoDetectLanguage: Boolean(lang),
    view,
    lowSpec,
    logFile,
    mockRelease,
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
