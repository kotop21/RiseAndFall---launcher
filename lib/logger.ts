import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { getConfigPath } from "./config/dir";

let logFilePath: string | null = null;

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

export function initLogger(launcherVersion: string): void {
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

    process.on("uncaughtException", (err) => {
      logger.error("system", "uncaughtException", err);
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

function writeLine(prefix: string, args: unknown[], isError = false): void {
  const time = getTimeString();
  const details = args.map(formatArg).join(" ");
  const message = details ? `${time} ${prefix}: ${details}` : `${time} ${prefix}`;

  if (isError) {
    console.error(message);
  } else {
    console.log(message);
  }

  if (logFilePath) {
    try {
      appendFileSync(logFilePath, `${message}\n`, "utf-8");
    } catch {}
  }
}

export const logger = {
  info: (prefix: string, ...args: unknown[]) => writeLine(prefix, args, false),
  error: (prefix: string, ...args: unknown[]) => writeLine(prefix, args, true),
};
