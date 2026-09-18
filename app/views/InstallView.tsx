import { useState, useRef, useEffect } from "react";
import {
  ScrollArea,
  Column,
  Row,
  H2,
  Label,
  Muted,
  Input,
  Button,
  Separator,
  P,
  useFileDialog,
  useToast,
  theme,
} from "@/ui";
import {
  NavigationRoot,
  SegmentedNav,
} from "@/components/ui/elements/navigation";
import {
  ArrowLeft,
  Folder,
  Globe,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "@/icon";
import { installGamePackage, type InstallStatus } from "@/lib/manager/install";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { isWindows } from "@/lib/utils/os";

interface InstallViewProps {
  defaultInstallPath?: string;
  isReinstall?: boolean;
  onInstalled?: (installedPath: string) => void;
  onCancel?: () => void;
}

export function InstallView({
  defaultInstallPath = "",
  isReinstall = false,
  onInstalled,
  onCancel,
}: InstallViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { pickFolder } = useFileDialog();

  const getInitialPath = () => {
    if (defaultInstallPath) return defaultInstallPath;
    if (!isReinstall) {
      return isWindows() ? "C:\\Games\\Rise and Fall" : "Rise and Fall";
    }
    return "";
  };

  const [installPath, setInstallPath] = useState(getInitialPath);
  const [selectedLang, setSelectedLang] = useState<string>("en");
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const resetConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetAbortTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInstalling = status === "downloading" || status === "extracting";

  useEffect(() => {
    return () => {
      if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
      if (resetAbortTimer.current) clearTimeout(resetAbortTimer.current);
    };
  }, []);

  const handleBrowseFolder = async () => {
    if (isPickingFolder || isInstalling) return;
    setIsPickingFolder(true);

    try {
      const current = installPath.trim();
      const parentDir =
        current.includes("/") || current.includes("\\")
          ? current.replace(/[\\/][^\\/]+[\\/]?$/, "")
          : undefined;

      const selected = await pickFolder({
        title: t("install.installDir"),
        defaultPath: parentDir,
      });

      if (!selected) return;

      const pickedPath =
        typeof selected === "object"
          ? (selected as { path: string }).path
          : selected;
      if (pickedPath) setInstallPath(pickedPath);
    } catch (err) {
      toast(formatErrorToast(err, "FS_ACCESS_DENIED"));
    } finally {
      setIsPickingFolder(false);
    }
  };

  const triggerInstallation = async () => {
    const target = installPath.trim();
    if (!target) {
      toast({
        title: t("toasts.installPathRequiredTitle"),
        description: t("toasts.installPathRequiredDesc"),
        type: "warn",
      });
      return;
    }

    abortControllerRef.current = new AbortController();
    setConfirmAbort(false);
    setStatus("downloading");
    setStatusMessage(
      isReinstall
        ? t("install.statusPreparingReinstall")
        : t("install.statusStarting"),
    );

    const res = await installGamePackage({
      targetDir: target,
      lang: selectedLang === "ru" ? "ru" : "en",
      cleanBeforeInstall: isReinstall,
      signal: abortControllerRef.current.signal,
      onProgress: (p) => {
        if (!abortControllerRef.current?.signal.aborted) {
          setStatus(p.status);
          setStatusMessage(p.message);
        }
      },
    });

    if (abortControllerRef.current?.signal.aborted) {
      setStatus("idle");
      setStatusMessage("");
      return;
    }

    if (res.success) {
      onInstalled?.(target);
    } else {
      setStatus("idle");
      setStatusMessage("");
      toast(formatErrorToast(res.error, "DOWNLOAD_FAILED"));
    }
  };

  const handleActionClick = () => {
    if (isReinstall) {
      if (!confirmReinstall) {
        setConfirmReinstall(true);
        if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
        resetConfirmTimer.current = setTimeout(
          () => setConfirmReinstall(false),
          4000,
        );
        return;
      }
      if (resetConfirmTimer.current) clearTimeout(resetConfirmTimer.current);
      setConfirmReinstall(false);
    }
    triggerInstallation();
  };

  const handleAbort = () => {
    if (!confirmAbort) {
      setConfirmAbort(true);
      if (resetAbortTimer.current) clearTimeout(resetAbortTimer.current);
      resetAbortTimer.current = setTimeout(() => setConfirmAbort(false), 4000);
      return;
    }

    if (resetAbortTimer.current) clearTimeout(resetAbortTimer.current);
    setConfirmAbort(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStatus("idle");
    setStatusMessage("");
  };

  const langNavItems = [
    { id: "en", label: "English" },
    { id: "ru", label: "Russian" },
  ];

  return (
    <ScrollArea
      direction="vertical"
      style={{ flexGrow: 1, width: "100%", height: "100%" }}
    >
      <Column gap={20} style={{ width: "100%", padding: 24 }}>
        <Row gap={12} align="center">
          <Button
            variant="ghost"
            size="sm"
            disabled={isInstalling}
            onClick={onCancel}
            style={{ width: 36, height: 36, paddingLeft: 0, paddingRight: 0 }}
          >
            <ArrowLeft size={18} color={theme.colors.fg} />
          </Button>
          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>
              {isReinstall
                ? t("install.titleReinstall")
                : t("install.titleInstall")}
            </H2>
            <Muted>
              {isReinstall
                ? t("install.subReinstall")
                : t("install.subInstall")}
            </Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        {isReinstall ? (
          <Column
            gap={8}
            style={{
              width: "100%",
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              padding: 14,
            }}
          >
            <Label>{t("install.targetDir")}</Label>
            <P style={{ color: theme.colors.mutedFg, fontSize: 13 }}>
              {installPath}
            </P>
            <Row gap={6} align="center">
              <AlertTriangle size={14} color={theme.colors.mutedFg} />
              <Muted>{t("install.targetWarning")}</Muted>
            </Row>
          </Column>
        ) : (
          <Column gap={8} style={{ width: "100%" }}>
            <Label>{t("install.installDir")}</Label>
            <Row gap={8} align="center" style={{ width: "100%" }}>
              <div style={{ flexGrow: 1 }}>
                <Input
                  value={installPath}
                  onChange={setInstallPath}
                  placeholder="C:\\Games\\Rise and Fall"
                  disabled={isInstalling}
                />
              </div>
              <Button
                variant="secondary"
                disabled={isInstalling || isPickingFolder}
                onClick={handleBrowseFolder}
              >
                <Row gap={8} align="center">
                  <Folder size={14} color={theme.colors.fg} />
                  {t("settings.browse")}
                </Row>
              </Button>
            </Row>
          </Column>
        )}

        <Column gap={8} style={{ width: "100%" }}>
          <Row gap={8} align="center">
            <Globe size={14} color={theme.colors.mutedFg} />
            <Label>{t("install.langPack")}</Label>
          </Row>
          <NavigationRoot
            value={selectedLang}
            onValueChange={(val) => {
              if (!isInstalling) setSelectedLang(val);
            }}
          >
            <SegmentedNav
              items={langNavItems}
              itemWidth={100}
              itemHeight={32}
            />
          </NavigationRoot>
        </Column>

        {status !== "idle" && (
          <Column
            gap={6}
            style={{
              width: "100%",
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radius.md,
              padding: 12,
            }}
          >
            <Row gap={8} align="center">
              {status === "completed" && (
                <CheckCircle size={16} color={theme.colors.success} />
              )}
              <P style={{ fontWeight: "bold" }}>
                {status === "completed"
                  ? t("install.ready")
                  : t("install.processing")}
              </P>
            </Row>
            <Muted>{statusMessage}</Muted>
          </Column>
        )}

        <Separator orientation="horizontal" />

        <Row
          gap={10}
          justify="between"
          align="center"
          style={{ width: "100%" }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={isInstalling}
            onClick={onCancel}
          >
            {t("install.cancel")}
          </Button>

          {isInstalling ? (
            <Button variant="destructive" size="sm" onClick={handleAbort}>
              {confirmAbort ? t("install.abortConfirm") : t("install.abort")}
            </Button>
          ) : (
            <Button
              variant={confirmReinstall ? "destructive" : "default"}
              size="sm"
              disabled={!installPath.trim()}
              onClick={handleActionClick}
            >
              <Row gap={8} align="center">
                {isReinstall ? (
                  <RefreshCw
                    size={14}
                    color={
                      confirmReinstall
                        ? theme.colors.destructiveFg
                        : theme.colors.primaryFg
                    }
                  />
                ) : (
                  <Download size={14} color={theme.colors.primaryFg} />
                )}
                <P
                  style={{
                    color: confirmReinstall
                      ? theme.colors.destructiveFg
                      : theme.colors.primaryFg,
                    fontWeight: "bold",
                  }}
                >
                  {isReinstall
                    ? confirmReinstall
                      ? t("install.btnReinstallConfirm")
                      : t("install.btnReinstall")
                    : status === "completed"
                      ? t("install.btnReinstall")
                      : t("install.btnInstall")}
                </P>
              </Row>
            </Button>
          )}
        </Row>
      </Column>
    </ScrollArea>
  );
}
