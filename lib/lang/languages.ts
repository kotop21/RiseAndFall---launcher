/**
 * Comprehensive dictionary of game language codes and their human-readable display names.
 * Supports ISO 639-1, ISO 639-2/3, region codes, and common aliases.
 * Used for dynamic language tab labels in GameInstaller navbar.
 */
export const KNOWN_GAME_LANGUAGES: Record<string, string> = {
  // Russian
  ru: "Русский",
  rus: "Русский",
  russian: "Русский",

  // English
  en: "English",
  eng: "English",
  english: "English",

  // Ukrainian
  ua: "Українська",
  uk: "Українська",
  ukr: "Українська",
  ukrainian: "Українська",

  // Portuguese / Brazil
  br: "Português (BR)",
  brazil: "Português (BR)",
  pt_br: "Português (BR)",
  "pt-br": "Português (BR)",
  pt: "Português",
  por: "Português",
  portuguese: "Português",

  // Spanish
  es: "Español",
  spa: "Español",
  spanish: "Español",
  espanol: "Español",

  // German
  de: "Deutsch",
  deu: "Deutsch",
  ger: "Deutsch",
  german: "Deutsch",
  deutsch: "Deutsch",

  // French
  fr: "Français",
  fra: "Français",
  fre: "Français",
  french: "Français",
  francais: "Français",

  // Italian
  it: "Italiano",
  ita: "Italiano",
  italian: "Italiano",
  italiano: "Italiano",

  // Polish
  pl: "Polski",
  pol: "Polski",
  polish: "Polski",
  polski: "Polski",

  // Czech
  cs: "Čeština",
  cze: "Čeština",
  ces: "Čeština",
  czech: "Čeština",

  // Turkish
  tr: "Türkçe",
  tur: "Türkçe",
  turkish: "Türkçe",

  // Chinese
  zh: "中文",
  chi: "中文",
  zho: "中文",
  chinese: "中文",
  zh_cn: "简体中文",
  "zh-cn": "简体中文",
  zh_tw: "繁體中文",
  "zh-tw": "繁體中文",

  // Japanese
  ja: "日本語",
  jp: "日本語",
  jpn: "日本語",
  japanese: "日本語",

  // Korean
  ko: "한국어",
  kor: "한국어",
  korean: "한국어",

  // Dutch
  nl: "Nederlands",
  nld: "Nederlands",
  dut: "Nederlands",
  dutch: "Nederlands",

  // Swedish
  sv: "Svenska",
  swe: "Svenska",
  swedish: "Svenska",

  // Norwegian
  no: "Norsk",
  nor: "Norsk",
  norwegian: "Norsk",

  // Danish
  da: "Dansk",
  dan: "Dansk",
  danish: "Dansk",

  // Finnish
  fi: "Suomi",
  fin: "Suomi",
  finnish: "Suomi",

  // Hungarian
  hu: "Magyar",
  hun: "Magyar",
  hungarian: "Magyar",

  // Romanian
  ro: "Română",
  ron: "Română",
  rum: "Română",
  romanian: "Română",

  // Bulgarian
  bg: "Български",
  bul: "Български",
  bulgarian: "Български",

  // Serbian
  sr: "Српски",
  srp: "Српски",
  serbian: "Српски",

  // Croatian
  hr: "Hrvatski",
  hrv: "Hrvatski",
  croatian: "Hrvatski",

  // Slovak
  sk: "Slovenčina",
  slk: "Slovenčina",
  slovak: "Slovenčina",

  // Greek
  el: "Ελληνικά",
  ell: "Ελληνικά",
  gre: "Ελληνικά",
  greek: "Ελληνικά",

  // Arabic
  ar: "العربية",
  ara: "العربية",
  arabic: "العربية",

  // Hebrew
  he: "עברית",
  heb: "עברית",
  hebrew: "עברית",

  // Vietnamese
  vi: "Tiếng Việt",
  vie: "Tiếng Việt",
  vietnamese: "Tiếng Việt",

  // Thai
  th: "ไทย",
  tha: "ไทย",
  thai: "ไทย",

  // Indonesian
  id: "Bahasa Indonesia",
  ind: "Bahasa Indonesia",
  indonesian: "Bahasa Indonesia",
};

/**
 * Returns a readable display label for a language code (e.g. 'ru' -> 'Русский', 'br' -> 'Português (BR)').
 * If unknown, falls back to formatted uppercase/capitalized code.
 */
export function getLanguageDisplayLabel(langCode: string): string {
  if (!langCode || typeof langCode !== "string") return "";
  const clean = langCode.trim().toLowerCase();
  if (KNOWN_GAME_LANGUAGES[clean]) {
    return KNOWN_GAME_LANGUAGES[clean];
  }

  // Fallback: clean underscores/dashes and format
  const normalized = clean.replace(/[_-]+/g, " ");
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 0) {
    return words
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ");
  }

  return langCode.toUpperCase();
}
