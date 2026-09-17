import { executeSettingsCli, hasSettingsCli } from "./client";
import { logger } from "@/lib/logger";

export interface ImportSettingsResult {
  success: boolean;
  error?: string;
}

/**
 * Импортирует и валидирует настройки игры из указанного JSON-файла в реестр Windows
 */
export async function importGameSettings(
  jsonFilePath: string,
): Promise<ImportSettingsResult> {
  const cleanPath = jsonFilePath.trim();

  if (!cleanPath) {
    return {
      success: false,
      error: "Settings file path cannot be empty",
    };
  }

  if (!hasSettingsCli()) {
    return {
      success: false,
      error: "Settings CLI is not available or OS is not supported",
    };
  }

  try {
    const result = await executeSettingsCli(["import", cleanPath]);

    if (!result.success) {
      return {
        success: false,
        error: result.stderr || result.stdout || "Import failed",
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("settings-cli", "Import exception:", message);
    return {
      success: false,
      error: message,
    };
  }
}
