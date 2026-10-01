import { useEffect, useRef } from "react";
import { DownloadGameButton } from "@/components/DownloadGameButton";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { Download, Upload } from "@/icon";
import { createLauncherError, formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { useInstallation } from "@/lib/manager/install";
import { exportGameSettings, importGameSettings } from "@/lib/settings-cli";
import { useGameStatus } from "@/lib/utils/game-status";
import { isWindows } from "@/lib/utils/os";
import { Button, Column, Label, Row, theme, useFileDialog, useToast } from "@/ui";

interface SettingsActionsProps {
  gameDir?: string;
  onOpenInstall?: () => void;
}

export function SettingsActions({ gameDir = "", onOpenInstall }: SettingsActionsProps) {
  const { t } = useTranslation();
  const { pickFolder, pickFile } = useFileDialog();
  const { toast } = useToast();
  const installation = useInstallation();

  const { cliExists: isCliAvailable } = useGameStatus(gameDir);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (hasWarnedRef.current) return;
    hasWarnedRef.current = true;

    if (!isWindows()) {
      toast({
        title: t("toasts.cliOsUnsupportedTitle"),
        description: t("toasts.cliOsUnsupportedDesc"),
        type: "warn",
      });
      return;
    }

    if (!isCliAvailable) {
      toast({
        title: t("toasts.cliMissingTitle"),
        description: t("toasts.cliMissingDesc"),
        type: "warn",
      });
    }
  }, [isCliAvailable, toast, t]);

  const handleExportRegistrySettings = async () => {
    try {
      const selectedFolder = await pickFolder({
        title: t("buttons.exportSettings"),
      });
      if (!selectedFolder) return;

      const targetDir = typeof selectedFolder === "object" ? selectedFolder.path : selectedFolder;
      if (!targetDir) return;

      const res = await exportGameSettings(targetDir);
      if (!res.success) {
        throw createLauncherError("SETTINGS_CLI_EXPORT_FAILED", res.error);
      }
      toast({
        title: t("toasts.settingsExportSuccessTitle"),
        description: t("toasts.settingsExportSuccessDesc").replace(
          "{path}",
          (res.outputFilePath || targetDir).split(/[\\/]/).pop() || "raf-settings.json",
        ),
        type: "info",
        duration: 4000,
      });
    } catch (err) {
      toast(formatErrorToast(err, "SETTINGS_CLI_EXPORT_FAILED"));
    }
  };

  const handleImportRegistrySettings = async () => {
    try {
      const selectedFilePath = await pickFile({
        title: t("buttons.importSettings"),
        extensions: ["json"],
      });
      if (!selectedFilePath) return;

      const res = await importGameSettings(selectedFilePath);
      if (!res.success) {
        throw createLauncherError("SETTINGS_CLI_IMPORT_FAILED", res.error);
      }
      toast({
        title: t("toasts.settingsImportSuccessTitle"),
        description: t("toasts.settingsImportSuccessDesc"),
        type: "info",
        duration: 3500,
      });
    } catch (err) {
      toast(formatErrorToast(err, "SETTINGS_CLI_IMPORT_FAILED"));
    }
  };

  return (
    <Column gap={10} style={{ width: "100%" }}>
      <Label>{t("settings.actions")}</Label>

      <Row gap={10} align="center" style={{ width: "100%" }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <OpenDgVoodooButton gameDir={gameDir} style={{ width: "100%" }} />
        </div>

        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <DownloadGameButton
            variant="reinstall"
            size="sm"
            isInstalling={installation.isInstalling}
            onClick={onOpenInstall}
            style={{ width: "100%" }}
          />
        </div>
      </Row>

      <Row gap={10} align="center" style={{ width: "100%" }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!isCliAvailable}
            onClick={handleExportRegistrySettings}
            style={{ width: "100%" }}
          >
            <Row gap={8} align="center">
              <Download size={14} color={theme.colors.fg} />
              {t("buttons.exportSettings")}
            </Row>
          </Button>
        </div>

        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!isCliAvailable}
            onClick={handleImportRegistrySettings}
            style={{ width: "100%" }}
          >
            <Row gap={8} align="center">
              <Upload size={14} color={theme.colors.fg} />
              {t("buttons.importSettings")}
            </Row>
          </Button>
        </div>
      </Row>
    </Column>
  );
}
