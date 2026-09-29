import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getConfigPath } from "./config/dir";

let logFilePath: string | null = null;
let isSilenced = process.env.NODE_ENV === "test" || Boolean(process.env.BUN_TEST);

export function setLoggerSilenced(silent: boolean): void {
  isSilenced = silent;
}

function formatDigits(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function getTimeString(): string {
  const now = new Date();
  const h = formatDigits(now.getHours());
  const m = formatDigits(now.getMinutes());
  const s = formatDigits(now.getSeconds());
  return `[${h}:${m}:${s}]`;
}

let logBuffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function flushLogs(): void {
  if (!logFilePath || logBuffer.length === 0) return;
  const chunk = logBuffer.join("\n") + "\n";
  logBuffer = [];
  try {
    appendFileSync(logFilePath, chunk, "utf-8");
  } catch {}
}

export function initLogger(launcherVersion: string): void {
  if (isSilenced) return;

  try {
    const configDir = dirname(getConfigPath());
    const logsDir = join(configDir, "logs");
    mkdirSync(logsDir, { recursive: true });

    const now = new Date();
    const y = now.getFullYear();
    const mo = formatDigits(now.getMonth() + 1);
    const d = formatDigits(now.getDate());
    const h = formatDigits(now.getHours());
    const mi = formatDigits(now.getMinutes());
    const s = formatDigits(now.getSeconds());

    logFilePath = join(logsDir, `launcher_${y}-${mo}-${d}_${h}-${mi}-${s}.log`);

    flushTimer = setInterval(flushLogs, 5000);
    if (flushTimer.unref) flushTimer.unref();

    const onProcessExit = () => {
      flushLogs();
    };

    process.once("beforeExit", onProcessExit);
    process.once("exit", onProcessExit);
    process.once("SIGINT", onProcessExit);
    process.once("SIGTERM", onProcessExit);

    process.on("uncaughtException", (err) => {
      logger.error("system", "uncaughtException", err);
      flushLogs();
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("system", "unhandledRejection", reason);
    });

    logger.info("launcher", `version: ${launcherVersion}`);
  } catch (err) {
    console.error("logger: initialization failed", err);
  }
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

export type LogLevel = "info" | "warn" | "error";

function writeLine(prefix: string, args: unknown[], level: LogLevel | boolean = "info"): void {
  if (isSilenced) return;

  const time = getTimeString();
  const details = args.map(formatArg).join(" ");
  const message = details ? `${time} ${prefix}: ${details}` : `${time} ${prefix}`;

  const effectiveLevel: LogLevel =
    typeof level === "boolean" ? (level ? "error" : "info") : level;

  if (effectiveLevel === "error") {
    console.error(message);
  } else if (effectiveLevel === "warn") {
    console.warn(message);
  } else {
    console.log(message);
  }

  if (logFilePath) {
    logBuffer.push(message);
    // При критических ошибках или переполнении буфера — мгновенный сброс
    if (effectiveLevel === "error" || logBuffer.length >= 50) {
      flushLogs();
    }
  }
}

export const logger = {
  info: (prefix: string, ...args: unknown[]) => writeLine(prefix, args, "info"),
  warn: (prefix: string, ...args: unknown[]) => writeLine(prefix, args, "warn"),
  error: (prefix: string, ...args: unknown[]) => writeLine(prefix, args, "error"),
  flush: () => flushLogs(),
  silence: (silent = true) => setLoggerSilenced(silent),
};


