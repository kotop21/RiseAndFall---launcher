export type LauncherErrorCode =
  | "GAME_EXE_NOT_FOUND"
  | "DGV_EXE_NOT_FOUND"
  | "TARGET_DIR_REQUIRED"
  | "TARGET_DIR_INVALID"
  | "FS_ACCESS_DENIED"
  | "CONFIG_READ_FAILED"
  | "CONFIG_WRITE_FAILED"
  | "NETWORK_OFFLINE"
  | "NETWORK_TIMEOUT"
  | "DOWNLOAD_FAILED"
  | "CORRUPTED_ARCHIVE"
  | "EXTRACTION_FAILED"
  | "INSTALL_CANCELLED"
  | "PROCESS_SPAWN_FAILED"
  | "PROCESS_CRASHED"
  | "PROCESS_FROZEN"
  | "UNSUPPORTED_OS"
  | "EXPLORER_FAILED"
  | "BROWSER_FAILED"
  | "GITHUB_API_FAILED"
  | "SETTINGS_CLI_NOT_FOUND"
  | "SETTINGS_CLI_EXPORT_FAILED"
  | "SETTINGS_CLI_IMPORT_FAILED"
  | "SETTINGS_CLI_INVALID_FILE"
  | "UNKNOWN_ERROR";

export interface LauncherErrorDetails {
  code: LauncherErrorCode;
  title: string;
  description: string;
  cause?: unknown;
}

export class LauncherAppError extends Error {
  readonly code: LauncherErrorCode;
  readonly title: string;
  readonly description: string;
  readonly cause?: unknown;

  constructor(details: LauncherErrorDetails) {
    super(details.description);
    this.name = "LauncherAppError";
    this.code = details.code;
    this.title = details.title;
    this.description = details.description;
    this.cause = details.cause;
  }
}
