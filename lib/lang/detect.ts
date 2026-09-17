import { platform } from "node:os";
import { execSync } from "node:child_process";
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

  if (os === "darwin") {
    try {
      const appleLocale = execSync("defaults read -g AppleLocale", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (appleLocale) {
        detected = normalizeLang(appleLocale);
        source = `macOS AppleLocale (${appleLocale})`;
      }
    } catch {}

    if (!detected) {
      try {
        const appleLangs = execSync("defaults read -g AppleLanguages", {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        const match = appleLangs.match(/"([^"]+)"/);
        if (match && match[1]) {
          detected = normalizeLang(match[1]);
          source = `macOS AppleLanguages (${match[1]})`;
        }
      } catch {}
    }
  }

  if (!detected && os === "win32") {
    try {
      const out = execSync(
        'powershell -NoProfile -Command "[System.Globalization.CultureInfo]::InstalledUICulture.Name"',
        { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (out) {
        detected = normalizeLang(out);
        source = `Windows InstalledUICulture (${out})`;
      }
    } catch {}
  }

  if (!detected) {
    const envLocale =
      process.env.LC_ALL ||
      process.env.LC_MESSAGES ||
      process.env.LANG ||
      process.env.LANGUAGE ||
      "";
    if (envLocale) {
      detected = normalizeLang(envLocale);
      source = `Environment variable (${envLocale})`;
    }
  }

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
