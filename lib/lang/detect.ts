import { execSync } from "node:child_process";
import { platform } from "node:os";
import { logger } from "@/lib/logger";

export type SupportedLang = "en" | "ru" | "ua";

function normalizeLang(rawLocale: string): SupportedLang {
  const lower = rawLocale.toLowerCase().trim();

  if (
    lower.startsWith("uk") ||
    lower.startsWith("ua") ||
    lower.includes("ukrainian") ||
    lower.includes("uk_") ||
    lower.includes("uk-")
  ) {
    return "ua";
  }

  if (
    lower.startsWith("ru") ||
    lower.includes("russian") ||
    lower.includes("ru_") ||
    lower.includes("ru-")
  ) {
    return "ru";
  }

  return "en";
}

export function detectSystemLanguage(): SupportedLang {
  const os = platform();
  let detected: SupportedLang | null = null;
  let source = "";

  // 1. Быстрый и неблокирующий стандартный Intl API (работает на Windows, macOS и Linux без подпроцессов)
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intlLocale) {
      const parsed = normalizeLang(intlLocale);
      if (parsed !== "en") {
        detected = parsed;
        source = `Intl.DateTimeFormat (${intlLocale})`;
      }
    }
  } catch {}

  // 2. Переменные окружения системы
  if (!detected) {
    const envLocale =
      process.env.LC_ALL ||
      process.env.LC_MESSAGES ||
      process.env.LANG ||
      process.env.LANGUAGE ||
      "";
    if (envLocale) {
      const parsed = normalizeLang(envLocale);
      if (parsed !== "en") {
        detected = parsed;
        source = `Environment variable (${envLocale})`;
      }
    }
  }

  // 3. Fallback для macOS
  if (!detected && os === "darwin") {
    try {
      const appleLocale = execSync("defaults read -g AppleLocale", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1000,
      }).trim();
      if (appleLocale) {
        const parsed = normalizeLang(appleLocale);
        if (parsed !== "en") {
          detected = parsed;
          source = `macOS AppleLocale (${appleLocale})`;
        }
      }
    } catch {}
  }

  // 4. Если ничего не определилось выше, проверяем дефолтный Intl или отдаем fallback
  if (!detected) {
    try {
      const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (intlLocale) {
        detected = normalizeLang(intlLocale);
        source = `Intl.DateTimeFormat (${intlLocale})`;
      }
    } catch {}
  }

  if (!detected) {
    detected = "en";
    source = "Fallback default";
  }

  logger.info("lang", `detected system language "${detected}" via ${source}`);
  return detected;
}
