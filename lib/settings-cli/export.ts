import { executeSettingsCli, hasSettingsCli } from "./client";
import { logger } from "@/lib/logger";

export interface ExportSettingsResult {
  success: boolean;
  outputFilePath?: string;
  error?: string;
}

/**
 * Экспортирует настройки игры из реестра Windows в целевую папку
 */
export async function exportGameSettings(
  targetDir: string,
): Promise<ExportSettingsResult> {
  const cleanDir = targetDir.trim();

  if (!cleanDir) {
    return {
      success: false,
      error: "Target directory path cannot be empty",
    };
  }

  if (!hasSettingsCli()) {
    return {
      success: false,
      error: "Settings CLI is not available or OS is not supported",
    };
  }

  try {
    const result = await executeSettingsCli(["export", cleanDir]);

    if (!result.success) {
      return {
        success: false,
        error: result.stderr || result.stdout || "Export failed",
      };
    }

    // Парсим путь из строки вывода: "[OK] Exported X settings to: C:\..."
    const match = result.stdout.match(/to:\s*(.+)$/i);
    const outputFilePath = match ? match[1].trim() : undefined;

    return {
      success: true,
      outputFilePath,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("settings-cli", "Export exception:", message);
    return {
      success: false,
      error: message,
    };
  }
}
