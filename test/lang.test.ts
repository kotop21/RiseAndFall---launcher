import { describe, expect, it } from "bun:test";
import { getTranslation, getCurrentLanguage, setLanguage } from "@/lib/lang";
import { detectSystemLanguage } from "@/lib/lang/detect";
import ru from "@/lang/ru.json";
import en from "@/lang/en.json";
import ua from "@/lang/ua.json";

function getAllKeyPaths(obj: Record<string, any>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...getAllKeyPaths(v, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

describe("Lang: Detection & Translation Function", () => {
  it("detects system language and returns valid supported language", () => {
    const detected = detectSystemLanguage();
    expect(["en", "ru", "ua"]).toContain(detected);
  });

  it("translates nested keys correctly in current language", () => {
    setLanguage("ru");
    expect(getCurrentLanguage()).toBe("ru");
    expect(getTranslation("ru", "main.title")).toBe(
      "Rise And Fall: Civilization at War",
    );
    expect(getTranslation("ru", "buttons.download")).toBe("Скачать игру");

    setLanguage("en");
    expect(getCurrentLanguage()).toBe("en");
    expect(getTranslation("en", "buttons.download")).toBe("Download Game");

    setLanguage("ua");
    expect(getCurrentLanguage()).toBe("ua");
    expect(getTranslation("ua", "buttons.download")).toBe("Завантажити гру");
  });

  it("returns key as fallback when translation does not exist", () => {
    const missing = getTranslation("en", "non.existent.deeply.nested.key" as any);
    expect(missing).toBe("non.existent.deeply.nested.key");
  });
});

describe("Lang: Full Parity Across Language Packs", () => {
  const ruPaths = getAllKeyPaths(ru);
  const enPaths = getAllKeyPaths(en);
  const uaPaths = getAllKeyPaths(ua);

  it("matches total key counts across ru, en, and ua", () => {
    expect(ruPaths.length).toBe(enPaths.length);
    expect(ruPaths.length).toBe(uaPaths.length);
  });

  it("ensures every key in ru.json exists in en.json and ua.json", () => {
    const enSet = new Set(enPaths);
    const uaSet = new Set(uaPaths);

    for (const key of ruPaths) {
      expect(enSet.has(key)).toBe(true);
      expect(uaSet.has(key)).toBe(true);
    }
  });

  it("ensures every key in en.json exists in ru.json and ua.json", () => {
    const ruSet = new Set(ruPaths);
    const uaSet = new Set(uaPaths);

    for (const key of enPaths) {
      expect(ruSet.has(key)).toBe(true);
      expect(uaSet.has(key)).toBe(true);
    }
  });
});
