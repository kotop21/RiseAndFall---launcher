import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "@/icon";
import { fetchManifest, type ManifestPackage, type ManifestResponse } from "@/lib/api";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import {
  formatByteProgress,
  getRequiredModsToSync,
  installationManager,
  installRequiredModsQueue,
  type ModQueueProgress,
  useIsInstalling,
} from "@/lib/manager/install";
import { checkGameFiles } from "@/lib/utils/game-status";
import {
  Badge,
  Button,
  Column,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  P,
  Progress,
  Row,
  theme,
  useToast,
} from "@/ui";

const AUTO_CLOSE_DELAY_MS = 1200;

type SyncStatus = "idle" | "syncing" | "completed" | "retry_available" | "failed";

export interface RequiredModsWatcherProps {
  gameDir?: string;
  activeView: "welcome" | "main" | "settings" | "install";
}

export function RequiredModsWatcher({ gameDir = "", activeView }: RequiredModsWatcherProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isInstalling = useIsInstalling();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [progress, setProgress] = useState<ModQueueProgress | null>(null);
  const [retryErrorText, setRetryErrorText] = useState<string>("");

  const mountedRef = useRef(true);
  const checkedDirsRef = useRef<Set<string>>(new Set());
  const isSyncActiveRef = useRef(false);
  const activeGameDirRef = useRef("");
  const latestManifestRef = useRef<ManifestResponse | null>(null);
  const checkAbortRef = useRef<AbortController | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleAnimatedClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (!mountedRef.current) return;
      isSyncActiveRef.current = false;
      setOpen(false);
    }, AUTO_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const runModsSyncQueue = useCallback(
    async (targetDir: string, modsToInstall: ManifestPackage[], attempt: number) => {
      syncAbortRef.current?.abort();
      const controller = new AbortController();
      syncAbortRef.current = controller;

      const firstMod = modsToInstall[0];
      if (!firstMod) {
        setStatus("completed");
        scheduleAnimatedClose();
        return;
      }

      setStatus("syncing");
      setRetryErrorText("");
      setProgress({
        currentIndex: 1,
        totalCount: modsToInstall.length,
        mod: firstMod,
        phase: "connecting",
        percent: 0,
      });

      const res = await installRequiredModsQueue(targetDir, modsToInstall, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setProgress(nextProgress);
        },
      });

      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (res.success) {
        logger.info("mods", `Required mods sync completed (${res.completedIds.length} updated)`);
        setStatus("completed");
        scheduleAnimatedClose();
        return;
      }

      if (attempt === 0) {
        const errorToast = formatErrorToast(res.error, "DOWNLOAD_FAILED");
        logger.warn("mods", "Required mods sync failed on first attempt:", errorToast.description);
        toast(errorToast);
        setRetryErrorText(errorToast.description);
        setStatus("retry_available");
        return;
      }

      logger.error("mods", "Required mods sync failed after retry:", res.error);
      setStatus("failed");
      toast({
        description: t("toasts.updateErrorDesc"),
        type: "error",
      });
      scheduleAnimatedClose();
    },
    [scheduleAnimatedClose, t, toast],
  );

  const handleRetry = useCallback(async () => {
    if (status !== "retry_available") return;
    const targetDir = activeGameDirRef.current;
    if (!targetDir) {
      setStatus("failed");
      toast({ description: t("toasts.updateErrorDesc"), type: "error" });
      scheduleAnimatedClose();
      return;
    }

    setStatus("syncing");
    setRetryErrorText("");

    try {
      let manifest = latestManifestRef.current;
      if (!manifest) {
        manifest = await fetchManifest();
        installationManager.setCachedManifest(manifest);
        latestManifestRef.current = manifest;
      }

      const remainingMods = await getRequiredModsToSync(targetDir, manifest);
      if (!mountedRef.current) return;

      if (remainingMods.length === 0) {
        setStatus("completed");
        scheduleAnimatedClose();
        return;
      }

      await runModsSyncQueue(targetDir, remainingMods, 1);
    } catch (err) {
      if (!mountedRef.current) return;
      logger.error("mods", "Required mods retry failed before queue start:", err);
      setStatus("failed");
      toast({
        description: t("toasts.updateErrorDesc"),
        type: "error",
      });
      scheduleAnimatedClose();
    }
  }, [runModsSyncQueue, scheduleAnimatedClose, status, t, toast]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      checkAbortRef.current?.abort();
      syncAbortRef.current?.abort();
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  useEffect(() => {
    const cleanDir = gameDir.trim();
    if (
      !cleanDir ||
      activeView === "welcome" ||
      activeView === "install" ||
      isInstalling ||
      isSyncActiveRef.current
    ) {
      return;
    }

    if (checkedDirsRef.current.has(cleanDir)) {
      return;
    }

    let cancelled = false;
    checkAbortRef.current?.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;

    const checkRequiredModsSilently = async () => {
      const fileStatus = await checkGameFiles(cleanDir);
      if (cancelled || controller.signal.aborted || !mountedRef.current || !fileStatus.gameExists) {
        return;
      }

      checkedDirsRef.current.add(cleanDir);

      let manifest: ManifestResponse;
      try {
        manifest = await fetchManifest(controller.signal);
        installationManager.setCachedManifest(manifest);
        latestManifestRef.current = manifest;
      } catch (err) {
        if (!controller.signal.aborted) {
          logger.warn("mods", "Silent required-mods manifest check failed:", err);
        }
        return;
      }

      if (cancelled || controller.signal.aborted || !mountedRef.current) {
        return;
      }

      const pendingMods = await getRequiredModsToSync(cleanDir, manifest);
      if (
        cancelled ||
        controller.signal.aborted ||
        !mountedRef.current ||
        pendingMods.length === 0
      ) {
        return;
      }

      logger.info("mods", `Required mods need sync (${pendingMods.map((m) => m.id).join(", ")})`);
      clearCloseTimer();
      isSyncActiveRef.current = true;
      activeGameDirRef.current = cleanDir;
      setOpen(true);
      await runModsSyncQueue(cleanDir, pendingMods, 0);
    };

    checkRequiredModsSilently();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeView, clearCloseTimer, gameDir, isInstalling, runModsSyncQueue]);

  const badgeVariant =
    status === "completed"
      ? "success"
      : status === "retry_available" || status === "failed"
        ? "destructive"
        : "default";

  const badgeLabel =
    status === "completed"
      ? t("mods.installed")
      : status === "retry_available" || status === "failed"
        ? t("mods.error")
        : t("mods.installing");

  const getStepMessage = (): string => {
    if (status === "completed") {
      return t("install.completed");
    }
    if (status === "failed") {
      return t("toasts.updateErrorDesc");
    }
    if (status === "retry_available") {
      return retryErrorText || t("toasts.updateErrorDesc");
    }
    if (!progress) {
      return t("install.statusStarting");
    }

    const stepLabel = `[${progress.currentIndex}/${progress.totalCount}] ${progress.mod.name}`;
    if (progress.phase === "extracting") {
      return t("install.extracting").replace("{step}", stepLabel);
    }
    if (progress.phase === "connecting") {
      return t("install.connecting").replace("{step}", stepLabel);
    }
    return stepLabel;
  };

  const showByteCounter =
    status === "syncing" &&
    progress !== null &&
    progress.phase === "downloading" &&
    progress.bytesDownloaded !== undefined;

  const byteCounterText = showByteCounter
    ? formatByteProgress(progress.bytesDownloaded ?? 0, progress.totalBytes ?? progress.mod.size)
    : "";

  const progressValue = status === "completed" ? 100 : (progress?.percent ?? 0);

  return (
    <Dialog open={open} closeOnOutsideClick={false} width={480} minWidth={360} maxWidth={560}>
      <DialogHeader>
        <Row
          gap={8}
          align="center"
          style={{ flexGrow: 1, minWidth: 0, justifyContent: "space-between" }}
        >
          <DialogTitle>{t("mods.requiredTitle")}</DialogTitle>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </Row>
      </DialogHeader>

      <DialogBody>
        <Column
          gap={10}
          style={{
            width: "100%",
            backgroundColor: theme.colors.muted,
            borderRadius: theme.radius.md,
            padding: 12,
          }}
        >
          <Row gap={12} justify="between" align="center" style={{ width: "100%" }}>
            <P
              style={{
                fontWeight: "bold",
                color: theme.colors.fg,
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              {getStepMessage()}
            </P>

            {showByteCounter && (
              <P
                style={{
                  color: theme.colors.mutedFg,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {byteCounterText}
              </P>
            )}
          </Row>

          <Progress value={progressValue} />
        </Column>
      </DialogBody>

      {status === "retry_available" && (
        <DialogFooter>
          <Button variant="default" size="sm" onClick={handleRetry}>
            <Row gap={8} align="center">
              <RefreshCw size={14} color={theme.colors.primaryFg} />
              {t("buttons.retry")}
            </Row>
          </Button>
        </DialogFooter>
      )}
    </Dialog>
  );
}
