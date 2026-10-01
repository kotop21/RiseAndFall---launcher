import { describe, expect, it } from "bun:test";
import {
  createLauncherError,
  formatErrorToast,
  LauncherAppError,
  normalizeError,
} from "@/lib/errors";

describe("Errors: Factory & Class", () => {
  it("creates LauncherAppError with expected properties", () => {
    const err = createLauncherError("GAME_EXE_NOT_FOUND");
    expect(err).toBeInstanceOf(LauncherAppError);
    expect(err.code).toBe("GAME_EXE_NOT_FOUND");
    expect(err.title).toBeDefined();
    expect(err.description).toBeDefined();
  });

  it("allows custom description override and cause preservation", () => {
    const cause = new Error("Root OS reason");
    const err = createLauncherError("FS_ACCESS_DENIED", "Custom denied message", cause);
    expect(err.code).toBe("FS_ACCESS_DENIED");
    expect(err.description).toBe("Custom denied message");
    expect(err.cause).toBe(cause);
  });
});

describe("Errors: Normalization & Edge Cases", () => {
  it("normalizes LauncherAppError as-is", () => {
    const original = createLauncherError("CONFIG_READ_FAILED");
    const normalized = normalizeError(original);
    expect(normalized.code).toBe("CONFIG_READ_FAILED");
    expect(normalized.title).toBe(original.title);
  });

  it("normalizes AbortError to INSTALL_CANCELLED", () => {
    const abortErr = new Error("AbortError");
    abortErr.name = "AbortError";
    const normalized = normalizeError(abortErr);
    expect(normalized.code).toBe("INSTALL_CANCELLED");
  });

  it("normalizes node EACCES to FS_ACCESS_DENIED", () => {
    const nodeErr = new Error("Permission denied") as NodeJS.ErrnoException;
    nodeErr.code = "EACCES";
    const normalized = normalizeError(nodeErr);
    expect(normalized.code).toBe("FS_ACCESS_DENIED");
  });

  it("normalizes node ENOENT to TARGET_DIR_INVALID", () => {
    const nodeErr = new Error("No such file or directory") as NodeJS.ErrnoException;
    nodeErr.code = "ENOENT";
    const normalized = normalizeError(nodeErr);
    expect(normalized.code).toBe("TARGET_DIR_INVALID");
  });

  it("normalizes unexpected generic error to fallbackCode", () => {
    const custom = new Error("Random database timeout");
    const normalized = normalizeError(custom, "NETWORK_TIMEOUT");
    expect(normalized.code).toBe("NETWORK_TIMEOUT");
    expect(normalized.cause).toBe(custom);
  });

  it("normalizes non-error objects (e.g. strings or numbers)", () => {
    const normalized = normalizeError("string error", "UNKNOWN_ERROR");
    expect(normalized.code).toBe("UNKNOWN_ERROR");
    expect(normalized.title).toBeDefined();
    expect(normalized.description).toBeDefined();
  });
});

describe("Errors: Toast Formatter", () => {
  it("formats error toast for UI notifications", () => {
    const toast = formatErrorToast(new Error("Disk full"), "FS_ACCESS_DENIED");
    expect(toast.type).toBe("error");
    expect(toast.title).toBeDefined();
    expect(toast.description).toBeDefined();
  });
});
