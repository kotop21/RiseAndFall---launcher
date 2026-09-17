import { execSync } from "node:child_process";
import type { SupportedLang } from "./index";

function parseLocaleString(raw: string): SupportedLang {
  const norm = raw.toLowerCase().trim();
  if (norm.startsWith("uk") || norm.startsWith("ua") || norm.includes("ukrainian") || norm.includes("1058")) {
    return "ua";
  }
  if (norm.startsWith("ru") || norm.includes("russian") || norm.includes("1049")) {
    return "ru";
  }
  return "en";
}

export function detectSystemLanguage(): SupportedLang {
  let detected: SupportedLang = "en";
  let source = "fallback";

  if (process.platform === "darwin") {
    try {
      const out = execSync("defaults read -g AppleLanguages", {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      })
        .toString()
        .trim();

      const match = out.match(/"([^"]+)"/);
      if (match && match[1]) {
        detected = parseLocaleString(match[1]);
        source = `apple-languages (${match[1]})`;
      }
    } catch {}

    if (source === "fallback") {
      try {
        const out = execSync("defaults read -g AppleLocale", {
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 1500,
        })
          .toString()
          .trim();

        if (out) {
          detected = parseLocaleString(out);
          source = `apple-locale (${out})`;
        }
      } catch {}
    }
  } else if (process.platform === "win32") {
    try {
      const out = execSync(
        "powershell.exe -NoProfile -NonInteractive -Command (Get-Culture).Name",
        { stdio: ["ignore", "pipe", "ignore"], timeout: 1500 },
      )
        .toString()
        .trim();

      if (out) {
        detected = parseLocaleString(out);
        source = `powershell (${out})`;
      }
    } catch {}
  }

  if (source === "fallback") {
    const envLocale =
      process.env.LC_ALL ||
      process.env.LC_MESSAGES ||
      process.env.LANG ||
      process.env.LANGUAGE;

    if (envLocale) {
      detected = parseLocaleString(envLocale);
      source = `env (${envLocale})`;
    } else {
      try {
        const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        if (intlLocale) {
          detected = parseLocaleString(intlLocale);
          source = `intl (${intlLocale})`;
        }
      } catch {}
    }
  }

  console.log(`Lang: detected system language "${detected}" via ${source}`);
  return detected;
}
