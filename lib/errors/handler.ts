import { LauncherAppError, type LauncherErrorCode, type LauncherErrorDetails } from "./types";
import { getCurrentLanguage, getTranslation } from "@/lib/lang";

export function createLauncherError(
  code: LauncherErrorCode,
  customDescription?: string,
  cause?: unknown,
): LauncherAppError {
  const currentLang = getCurrentLanguage();
  const title = getTranslation(currentLang, `errors.${code}.title`);
  const description = customDescription || getTranslation(currentLang, `errors.${code}.description`);

  return new LauncherAppError({
    code,
    title,
    description,
    cause,
  });
}

export function normalizeError(err: unknown, fallbackCode: LauncherErrorCode = "UNKNOWN_ERROR"): LauncherErrorDetails {
  const currentLang = getCurrentLanguage();

  if (err instanceof LauncherAppError) {
    return {
      code: err.code,
      title: getTranslation(currentLang, `errors.${err.code}.title`),
      description: err.description,
      cause: err.cause,
    };
  }

  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message === "AbortError") {
      return {
        code: "INSTALL_CANCELLED",
        title: getTranslation(currentLang, "errors.INSTALL_CANCELLED.title"),
        description: getTranslation(currentLang, "errors.INSTALL_CANCELLED.description"),
        cause: err,
      };
    }

    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "EACCES" || nodeErr.code === "EPERM") {
      return {
        code: "FS_ACCESS_DENIED",
        title: getTranslation(currentLang, "errors.FS_ACCESS_DENIED.title"),
        description: getTranslation(currentLang, "errors.FS_ACCESS_DENIED.description"),
        cause: err,
      };
    }

    if (nodeErr.code === "ENOENT") {
      return {
        code: "TARGET_DIR_INVALID",
        title: getTranslation(currentLang, "errors.TARGET_DIR_INVALID.title"),
        description: getTranslation(currentLang, "errors.TARGET_DIR_INVALID.description"),
        cause: err,
      };
    }

    return {
      code: fallbackCode,
      title: getTranslation(currentLang, `errors.${fallbackCode}.title`),
      description: getTranslation(currentLang, `errors.${fallbackCode}.description`),
      cause: err,
    };
  }

  return {
    code: fallbackCode,
    title: getTranslation(currentLang, `errors.${fallbackCode}.title`),
    description: getTranslation(currentLang, `errors.${fallbackCode}.description`),
    cause: err,
  };
}

export function formatErrorToast(err: unknown, fallbackCode?: LauncherErrorCode) {
  const normalized = normalizeError(err, fallbackCode);
  return {
    title: normalized.title,
    description: normalized.description,
    type: "error" as const,
  };
}
