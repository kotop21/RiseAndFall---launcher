import { useCallback, useEffect, useState } from "react";
import { fetchManifest, type ManifestResponse } from "@/lib/api";
import type { LauncherConfig } from "@/lib/config/types";
import { createLauncherError, type LauncherAppError, normalizeError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { invalidateGameStatusCache } from "@/lib/utils/game-status";
import { type InstallProgress, type InstallStatus, installGamePackage } from "./install";
import { ensureInstallDir } from "./install-path";

export interface InstallationState {
  status: InstallStatus;
  progress: InstallProgress | null;
  targetDir: string;
  lang: string;
  isReinstall: boolean;
  isInstalling: boolean;
  error: LauncherAppError | null;
}

export interface StartInstallParams {
  targetDir: string;
  lang: string;
  isReinstall?: boolean;
  onInstalled?: (installedPath: string) => void;
  manifest?: ManifestResponse;
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
  private cachedManifest: ManifestResponse | null = null;
  private manifestFetchPromise: Promise<ManifestResponse> | null = null;

  public getState(): InstallationState {
    return this.state;
  }

  public getCachedManifest(): ManifestResponse | null {
    return this.cachedManifest;
  }

  public setCachedManifest(manifest: ManifestResponse | null): void {
    this.cachedManifest = manifest;
  }

  public async getOrFetchManifest(signal?: AbortSignal): Promise<ManifestResponse> {
    if (this.cachedManifest && Array.isArray(this.cachedManifest.packages)) {
      logger.info("install", "Returning cached installation manifest");
      return this.cachedManifest;
    }

    if (this.manifestFetchPromise) {
      logger.info("install", "Joining active in-flight manifest fetch promise");
      return this.manifestFetchPromise;
    }

    logger.info("install", "Fetching installation manifest from API...");
    this.manifestFetchPromise = fetchManifest(signal)
      .then((manifest) => {
        this.cachedManifest = manifest;
        return manifest;
      })
      .finally(() => {
        this.manifestFetchPromise = null;
      });

    return this.manifestFetchPromise;
  }

  public clearCachedManifest(force = false): boolean {
    if (this.state.isInstalling && !force) {
      logger.info(
        "install",
        "Preserving cached manifest because installation is currently in progress",
      );
      return false;
    }
    logger.info("install", "Clearing cached installation manifest");
    this.cachedManifest = null;
    this.manifestFetchPromise = null;
    return true;
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

    const { lang, isReinstall = false, onInstalled } = params;
    const targetDir = ensureInstallDir(params.targetDir);
    const manifestToUse = params.manifest || this.cachedManifest || undefined;
    const controller = new AbortController();
    this.currentAbortController = controller;

    this.setState({
      status: "downloading",
      progress: {
        status: "downloading",
        message: "",
        percent: 0,
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
          manifest: manifestToUse,
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
          this.clearCachedManifest();
          return {
            success: false,
            error: createLauncherError("INSTALL_CANCELLED"),
          };
        }

        if (res.success) {
          this.setState({
            status: "completed",
            isInstalling: false,
            progress: {
              status: "completed",
              message: this.state.progress?.message || "",
              percent: 100,
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

          this.clearCachedManifest();
          return res;
        } else {
          this.setState({
            status: "error",
            isInstalling: false,
            error: res.error || null,
          });
          this.clearCachedManifest();
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
        this.clearCachedManifest();
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
    this.clearCachedManifest(true);
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
    this.clearCachedManifest(true);
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
    cachedManifest: installationManager.getCachedManifest(),
    getOrFetchManifest: useCallback(
      (signal?: AbortSignal) => installationManager.getOrFetchManifest(signal),
      [],
    ),
    clearCachedManifest: useCallback(
      (force?: boolean) => installationManager.clearCachedManifest(force),
      [],
    ),
    startInstall: useCallback(
      (params: StartInstallParams) => installationManager.startInstall(params),
      [],
    ),
    abort: useCallback(() => installationManager.abort(), []),
    reset: useCallback(() => installationManager.reset(), []),
  };
}

/**
 * Subscribes only to the boolean `isInstalling` state so callers avoid re-rendering on progress ticks.
 */
export function useIsInstalling(): boolean {
  const [isInstalling, setIsInstalling] = useState(
    () => installationManager.getState().isInstalling,
  );

  useEffect(() => {
    return installationManager.subscribe((next) => {
      setIsInstalling((prev) => (prev === next.isInstalling ? prev : next.isInstalling));
    });
  }, []);

  return isInstalling;
}

/**
 * Formats the current installation/reinstallation progress message for display above progress bars.
 */
export function formatInstallStatusMessage(
  state: Pick<InstallationState, "status" | "progress" | "isReinstall">,
  t: (key: string) => string,
): string {
  if (state.progress?.message) {
    return state.progress.message;
  }
  if (state.status === "downloading") {
    return state.isReinstall ? t("install.statusPreparingReinstall") : t("install.statusStarting");
  }
  return "";
}
