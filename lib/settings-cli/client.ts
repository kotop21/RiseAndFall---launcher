import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { isWindows } from "@/lib/utils/os";
import { logger } from "@/lib/logger";

const BINARY_NAME = "raf-settings.exe";

/**
 * Определяет путь к raf-settings.exe:
 * 1. process.env.RAF_SETTINGS_CLI_PATH (если передан в dev / тестах)
 * 2. Рядом с текущим исполняемым файлом/процессом
 * 3. В текущей рабочей директории (cwd)
 */
export function getSettingsCliPath(): string {
  const envOverride = process.env.RAF_SETTINGS_CLI_PATH?.trim();
  if (envOverride) {
    return resolve(envOverride);
  }

  const execDir = dirname(process.execPath);
  const nextToExec = join(execDir, BINARY_NAME);
  if (existsSync(nextToExec)) {
    return nextToExec;
  }

  const inBin = join(execDir, "bin", BINARY_NAME);
  if (existsSync(inBin)) {
    return inBin;
  }

  const inCwd = resolve(process.cwd(), BINARY_NAME);
  if (existsSync(inCwd)) {
    return inCwd;
  }

  // Фолбэк для разработки внутри монорепозитория
  const inPackages = resolve(process.cwd(), "packages", "raf-settings", BINARY_NAME);
  if (existsSync(inPackages)) {
    return inPackages;
  }

  return nextToExec;
}

/**
 * Проверяет, доступна ли утилита в системе.
 * Если возвращает false, лаунчер может просто скрывать/отключать кнопки импорта/экспорта.
 */
export function hasSettingsCli(): boolean {
  if (!isWindows()) {
    return false;
  }

  const cliPath = getSettingsCliPath();
  return existsSync(cliPath);
}

export interface CliExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Запуск утилиты raf-settings с передачей аргументов
 */
export async function executeSettingsCli(
  args: string[],
): Promise<CliExecutionResult> {
  const cliPath = getSettingsCliPath();

  if (!isWindows()) {
    logger.error("settings-cli", `Execution blocked: unsupported OS`);
    return {
      success: false,
      stdout: "",
      stderr: "Registry operations are only supported on Windows",
      exitCode: 1,
    };
  }

  if (!existsSync(cliPath)) {
    logger.error("settings-cli", `Binary not found at: ${cliPath}`);
    return {
      success: false,
      stdout: "",
      stderr: `Executable not found: ${cliPath}`,
      exitCode: 1,
    };
  }

  return new Promise((res) => {
    logger.info("settings-cli", `Spawning: ${cliPath} ${args.join(" ")}`);

    const child = spawn(cliPath, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      logger.error("settings-cli", "Failed to spawn process:", err);
      res({
        success: false,
        stdout,
        stderr: err.message,
        exitCode: 1,
      });
    });

    child.on("close", (code) => {
      const exitCode = code ?? 0;
      const success = exitCode === 0;

      if (!success) {
        logger.error("settings-cli", `Exited with code ${exitCode}. Stderr: ${stderr.trim()}`);
      } else {
        logger.info("settings-cli", `Command succeeded. Stdout: ${stdout.trim()}`);
      }

      res({
        success,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      });
    });
  });
}
