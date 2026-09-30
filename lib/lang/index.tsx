import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import en from "../../lang/en.json";
import ru from "../../lang/ru.json";
import ua from "../../lang/ua.json";

export type SupportedLang = "en" | "ru" | "ua";

const DICTIONARIES: Record<SupportedLang, any> = {
  en,
  ru,
  ua,
};

const translationCache = new Map<string, string>();

let activeAppLang: SupportedLang = "en";

export function getCurrentLanguage(): SupportedLang {
  return activeAppLang;
}

export function setLanguage(lang: SupportedLang): void {
  activeAppLang = lang;
}

export function getTranslation(lang: SupportedLang, path: string): string {
  const cacheKey = `${lang}:${path}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  const keys = path.split(".");
  let val: any = dict;

  for (const k of keys) {
    if (!val || typeof val !== "object") {
      translationCache.set(cacheKey, path);
      return path;
    }
    val = val[k];
  }

  const result = typeof val === "string" ? val : path;
  translationCache.set(cacheKey, result);
  return result;
}

interface LanguageContextValue {
  lang: SupportedLang;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  t: (key) => key,
});

export function LanguageProvider({
  lang,
  children,
}: {
  lang: string;
  children: ReactNode;
}) {
  const safeLang: SupportedLang = lang === "ru" || lang === "ua" ? lang : "en";

  useEffect(() => {
    activeAppLang = safeLang;
  }, [safeLang]);

  activeAppLang = safeLang;

  const t = useMemo(() => {
    return (path: string): string => getTranslation(safeLang, path);
  }, [safeLang]);

  return (
    <LanguageContext.Provider value={{ lang: safeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
