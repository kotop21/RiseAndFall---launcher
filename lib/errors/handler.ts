import { LauncherAppError, type LauncherErrorCode, type LauncherErrorDetails } from "./types";

const ERROR_REGISTRY: Record<LauncherErrorCode, { title: string; description: string }> = {
  GAME_EXE_NOT_FOUND: {
    title: "Game Missing",
    description: "RiseAndFall.exe not found in selected directory.",
  },
  DGV_EXE_NOT_FOUND: {
    title: "dgVoodoo Missing",
    description: "dgVoodooCpl.exe not found in game folder.",
  },
  TARGET_DIR_REQUIRED: {
    title: "Path Required",
    description: "Installation folder path is empty.",
  },
  TARGET_DIR_INVALID: {
    title: "Invalid Folder",
    description: "Folder does not exist or cannot be accessed.",
  },
  FS_ACCESS_DENIED: {
    title: "Access Denied",
    description: "Insufficient disk permissions for this path.",
  },
  CONFIG_READ_FAILED: {
    title: "Config Error",
    description: "Failed reading settings. Restored defaults.",
  },
  CONFIG_WRITE_FAILED: {
    title: "Save Failed",
    description: "Unable to write launcher settings to disk.",
  },
  NETWORK_OFFLINE: {
    title: "Network Error",
    description: "Unable to connect to launcher server.",
  },
  NETWORK_TIMEOUT: {
    title: "Connection Timeout",
    description: "Server took too long to reply. Try again.",
  },
  DOWNLOAD_FAILED: {
    title: "Download Error",
    description: "Failed fetching game assets package.",
  },
  CORRUPTED_ARCHIVE: {
    title: "Archive Error",
    description: "Package file is corrupted or unreadable.",
  },
  EXTRACTION_FAILED: {
    title: "Unpack Failed",
    description: "Failed unpacking archive files to disk.",
  },
  INSTALL_CANCELLED: {
    title: "Cancelled",
    description: "Installation stopped. Temp files removed.",
  },
  PROCESS_SPAWN_FAILED: {
    title: "Launch Failed",
    description: "Could not start game process.",
  },
  PROCESS_CRASHED: {
    title: "Game Crashed",
    description: "Game process terminated unexpectedly.",
  },
  PROCESS_FROZEN: {
    title: "Game Unresponsive",
    description: "Process was closed due to freezing.",
  },
  UNSUPPORTED_OS: {
    title: "OS Unsupported",
    description: "Direct launch requires Windows or Wine.",
  },
  EXPLORER_FAILED: {
    title: "Explorer Error",
    description: "Could not open folder in file manager.",
  },
  BROWSER_FAILED: {
    title: "Browser Error",
    description: "Could not open default web browser.",
  },
  GITHUB_API_FAILED: {
    title: "Sync Failed",
    description: "Could not load release changelogs.",
  },
  UNKNOWN_ERROR: {
    title: "Unknown Error",
    description: "An unexpected error occurred.",
  },
};

export function createLauncherError(
  code: LauncherErrorCode,
  customDescription?: string,
  cause?: unknown,
): LauncherAppError {
  const meta = ERROR_REGISTRY[code];
  return new LauncherAppError({
    code,
    title: meta.title,
    description: customDescription || meta.description,
    cause,
  });
}

export function normalizeError(err: unknown, fallbackCode: LauncherErrorCode = "UNKNOWN_ERROR"): LauncherErrorDetails {
  if (err instanceof LauncherAppError) {
    return {
      code: err.code,
      title: err.title,
      description: err.description,
      cause: err.cause,
    };
  }

  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message === "AbortError") {
      const meta = ERROR_REGISTRY.INSTALL_CANCELLED;
      return { code: "INSTALL_CANCELLED", title: meta.title, description: meta.description, cause: err };
    }

    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "EACCES" || nodeErr.code === "EPERM") {
      const meta = ERROR_REGISTRY.FS_ACCESS_DENIED;
      return { code: "FS_ACCESS_DENIED", title: meta.title, description: meta.description, cause: err };
    }
    if (nodeErr.code === "ENOENT") {
      const meta = ERROR_REGISTRY.TARGET_DIR_INVALID;
      return { code: "TARGET_DIR_INVALID", title: meta.title, description: meta.description, cause: err };
    }

    const meta = ERROR_REGISTRY[fallbackCode];
    return {
      code: fallbackCode,
      title: meta.title,
      description: meta.description,
      cause: err,
    };
  }

  const meta = ERROR_REGISTRY[fallbackCode];
  return {
    code: fallbackCode,
    title: meta.title,
    description: meta.description,
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
