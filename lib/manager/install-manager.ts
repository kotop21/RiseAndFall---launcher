import { useState, useEffect } from "react";
import {
  installGamePackage,
  type InstallStatus,
  type InstallProgress,
  type InstallGameOptions,
} from "./install";
import { createLauncherError, normalizeError, type LauncherAppError } from "@/lib/errors";
import { invalidateGameStatusCache } from "@/lib/utils/game-status";
import { logger } from "@/lib/logger";
import type { LauncherConfig } from "@/lib/config/types";

export interface InstallationState {
  status: InstallStatus;
  progress: InstallProgress | null;
  targetDir: string;
  lang: "en" | "ru";
  isReinstall: boolean;
  isInstalling: boolean;
  error: LauncherAppError | null;
}

export interface StartInstallParams {
  targetDir: string;
  lang: "en" | "ru";
  isReinstall?: boolean;
  onInstalled?: (installedPath: string) => void;
}

export type InstallationSuccessCallback = (installedPath: string, config?: LauncherConfig) => void;

const INITIAL_STATE: InstallationState = {
  status: "idle",
  progress: null,
  targetDir: "",
  lang: "en",
  isReinstall: false,
  isInstalling: false,
  error: null,
};

export class InstallationManager {
  private state: InstallationState = { ...INITIAL_STATE };
  private listeners = new Set<(state: InstallationState) => void>();
  private successCallbacks = new Set<InstallationSuccessCallback>();
  private currentAbortController: AbortController | null = null;
  private currentPromise: Promise<{
    success: boolean;
    config?: LauncherConfig;
    error?: LauncherAppError;
  }> | null = null;

  public getState(): InstallationState {
    return this.state;
  }

  public subscribe(listener: (state: InstallationState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onInstalled(callback: InstallationSuccessCallback): () => void {
    this.successCallbacks.add(callback);
    return () => {
      this.successCallbacks.delete(callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        logger.error("install", "Error in installation listener:", err);
      }
    }
  }

  private setState(partial: Partial<InstallationState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public startInstall(params: StartInstallParams): Promise<{
    success: boolean;
    config?: LauncherConfig;
    error?: LauncherAppError;
  }> {
    if (this.state.isInstalling) {
      logger.warn("install", "Installation is already in progress, returning active promise");
      if (this.currentPromise) {
        return this.currentPromise;
      }
      return Promise.resolve({
        success: false,
        error: createLauncherError("UNKNOWN_ERROR", "Installation is already in progress"),
      });
    }

    const { targetDir, lang, isReinstall = false, onInstalled } = params;
    const controller = new AbortController();
    this.currentAbortController = controller;

    this.setState({
      status: "downloading",
      progress: {
        status: "downloading",
        message: "",
      },
      targetDir,
      lang,
      isReinstall,
      isInstalling: true,
      error: null,
    });

    const installPromise = (async () => {
      try {
        const res = await installGamePackage({
          targetDir,
          lang,
          cleanBeforeInstall: isReinstall,
          signal: controller.signal,
          onProgress: (p) => {
            if (!controller.signal.aborted) {
              this.setState({
                status: p.status,
                progress: p,
              });
            }
          },
        });

        if (controller.signal.aborted) {
          this.setState({
            status: "idle",
            isInstalling: false,
            progress: null,
            error: null,
          });
          return { success: false, error: createLauncherError("INSTALL_CANCELLED") };
        }

        if (res.success) {
          this.setState({
            status: "completed",
            isInstalling: false,
            progress: {
              status: "completed",
              message: this.state.progress?.message || "",
            },
            error: null,
          });

          invalidateGameStatusCache(targetDir);
          onInstalled?.(targetDir);

          for (const cb of this.successCallbacks) {
            try {
              cb(targetDir, res.config);
            } catch (cbErr) {
              logger.error("install", "Error in success callback:", cbErr);
            }
          }

          return res;
        } else {
          this.setState({
            status: "error",
            isInstalling: false,
            error: res.error || null,
          });
          return res;
        }
      } catch (err: unknown) {
        const normalized = normalizeError(err, "DOWNLOAD_FAILED");
        const launchErr = createLauncherError(normalized.code, normalized.description, err);
        this.setState({
          status: "error",
          isInstalling: false,
          error: launchErr,
        });
        return { success: false, error: launchErr };
      } finally {
        this.currentAbortController = null;
        this.currentPromise = null;
      }
    })();

    this.currentPromise = installPromise;
    return installPromise;
  }

  public abort(): void {
    if (this.currentAbortController) {
      logger.info("install", "Aborting active installation via installationManager.abort()");
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.currentPromise = null;
    this.setState({
      status: "idle",
      isInstalling: false,
      progress: null,
      error: null,
    });
  }

  public reset(): void {
    if (this.state.isInstalling) {
      this.abort();
    }
    this.setState({ ...INITIAL_STATE });
  }
}

export const installationManager = new InstallationManager();

export function useInstallation() {
  const [state, setState] = useState<InstallationState>(() => installationManager.getState());

  useEffect(() => {
    return installationManager.subscribe((next) => {
      setState(next);
    });
  }, []);

  return {
    ...state,
    startInstall: (params: StartInstallParams) => installationManager.startInstall(params),
    abort: () => installationManager.abort(),
    reset: () => installationManager.reset(),
  };
}
