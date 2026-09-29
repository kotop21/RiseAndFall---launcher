import { useState, useRef, useEffect } from "react";
import {
  Column,
  Row,
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
  Folder,
  Globe,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "@/icon";
import { useInstallation } from "@/lib/manager/install";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { isWindows } from "@/lib/utils/os";

interface GameInstallerProps {
  defaultInstallPath?: string;
  isReinstall?: boolean;
  onInstalled?: (installedPath: string) => void;
  onCancel?: () => void;
}

const LANG_NAV_ITEMS = [
  { id: "en", label: "English" },
  { id: "ru", label: "Russian" },
];

export function GameInstaller({
  defaultInstallPath = "",
  isReinstall: isReinstallProp = false,
  onInstalled,
  onCancel,
}: GameInstallerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { pickFolder } = useFileDialog();
  const installation = useInstallation();

  const isInstalling = installation.isInstalling;
  const isReinstall = isInstalling ? installation.isReinstall : isReinstallProp;

  const getInitialPath = () => {
    if (installation.targetDir) return installation.targetDir;
    if (defaultInstallPath) return defaultInstallPath;
    if (!isReinstall) {
      return isWindows() ? "C:\\Games\\Rise and Fall" : "Rise and Fall";
    }
    return "";
  };

  const [localInstallPath, setLocalInstallPath] = useState(getInitialPath);
  const [localLang, setLocalLang] = useState<string>("en");
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const resetConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetAbortTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = installation.status;
  const installPath = isInstalling || (status === "completed" && installation.targetDir)
    ? installation.targetDir
    : localInstallPath;

  const selectedLang = isInstalling || (status === "completed" && installation.lang)
    ? installation.lang
    : localLang;

  const statusMessage = installation.progress?.message || (
    status === "downloading"
      ? (isReinstall ? t("install.statusPreparingReinstall") : t("install.statusStarting"))
      : ""
  );

  const setInstallPath = (path: string) => {
    if (!isInstalling) setLocalInstallPath(path);
  };

  const setSelectedLang = (val: string) => {
    if (!isInstalling) setLocalLang(val);
  };

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
      let parentDir =
        current.includes("/") || current.includes("\\")
          ? current.replace(/[\\/][^\\/]+[\\/]?$/, "")
          : undefined;
      if (parentDir && /^[a-zA-Z]:$/.test(parentDir)) {
        parentDir += "\\";
      }

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

    setConfirmAbort(false);

    const res = await installation.startInstall({
      targetDir: target,
      lang: selectedLang === "ru" ? "ru" : "en",
      isReinstall,
      onInstalled,
    });

    if (res.success) {
      onInstalled?.(target);
    } else if (res.error && res.error.code !== "INSTALL_CANCELLED") {
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
    installation.abort();
  };

  return (
    <Column gap={20} style={{ width: "100%" }}>
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
          <SegmentedNav items={LANG_NAV_ITEMS} itemWidth={100} itemHeight={32} />
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
  );
}
