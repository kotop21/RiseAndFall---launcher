import { useEffect, useRef } from "react";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { Download, Upload, Wrench } from "@/icon";
import { createLauncherError, formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { exportGameSettings, importGameSettings } from "@/lib/settings-cli";
import { useGameStatus } from "@/lib/utils/game-status";
import { isWindows } from "@/lib/utils/os";
import { Button, Column, Label, Row, Tooltip, theme, useFileDialog, useToast } from "@/ui";

interface SettingsActionsProps {
  gameDir?: string;
  onOpenNewInstall?: () => void;
  isNewInstallDisabled?: boolean;
}

export function SettingsActions({
  gameDir = "",
  onOpenNewInstall,
  isNewInstallDisabled = false,
}: SettingsActionsProps) {
  const { t } = useTranslation();
  const { pickFolder, pickFile } = useFileDialog();
  const { toast } = useToast();

  const { cliExists: isCliAvailable } = useGameStatus(gameDir);
  const cliDisabledReason = !isWindows()
    ? t("toasts.cliOsUnsupportedDesc")
    : t("errors.SETTINGS_CLI_NOT_FOUND.description");
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (hasWarnedRef.current) return;
    hasWarnedRef.current = true;

    if (!isWindows()) {
      toast({
        description: t("toasts.cliOsUnsupportedDesc"),
        type: "error",
      });
      return;
    }

    if (!isCliAvailable) {
      toast({
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
        logger.error("settings-cli", `export failed (${res.error || "unknown"})`);
        throw createLauncherError("SETTINGS_CLI_EXPORT_FAILED", res.error);
      }
      logger.info("settings-cli", "export ok");
      toast({
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
        logger.error("settings-cli", `import failed (${res.error || "unknown"})`);
        throw createLauncherError("SETTINGS_CLI_IMPORT_FAILED", res.error);
      }
      logger.info("settings-cli", "import ok");
      toast({
        description: t("toasts.settingsSavedDesc"),
        type: "info",
        duration: 3500,
      });
    } catch (err) {
      toast(formatErrorToast(err, "SETTINGS_CLI_IMPORT_FAILED"));
    }
  };

  return (
    <Column featureId="settings.actions" gap={10} style={{ width: "100%" }}>
      <Row gap={8} align="center">
        <Wrench size={14} color={theme.colors.mutedFg} />
        <Label featureId="settings.actions">{t("settings.actions")}</Label>
      </Row>

      <Row gap={10} align="center" style={{ width: "100%" }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <OpenDgVoodooButton
            featureId="settings.actions.dgvoodoo"
            gameDir={gameDir}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Button
            featureId="settings.actions.freshInstall"
            variant="default"
            size="sm"
            disabled={isNewInstallDisabled}
            onClick={onOpenNewInstall}
            style={{ width: "100%" }}
          >
            <Row gap={8} align="center" justify="center">
              <Download
                size={14}
                color={isNewInstallDisabled ? theme.colors.mutedFg : theme.colors.primaryFg}
              />
              {t("buttons.freshInstall")}
            </Row>
          </Button>
        </div>
      </Row>

      <Row gap={10} align="center" style={{ width: "100%" }}>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Tooltip
            content={cliDisabledReason}
            disabled={isCliAvailable}
            side="top"
            style={{ width: "100%" }}
          >
            <Button
              featureId="settings.actions.export"
              variant="secondary"
              size="sm"
              disabled={!isCliAvailable}
              onClick={handleExportRegistrySettings}
              style={{ width: "100%" }}
            >
              <Row gap={8} align="center">
                <Download
                  size={14}
                  color={!isCliAvailable ? theme.colors.mutedFg : theme.colors.fg}
                />
                {t("buttons.exportSettings")}
              </Row>
            </Button>
          </Tooltip>
        </div>

        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Tooltip
            content={cliDisabledReason}
            disabled={isCliAvailable}
            side="top"
            style={{ width: "100%" }}
          >
            <Button
              featureId="settings.actions.import"
              variant="secondary"
              size="sm"
              disabled={!isCliAvailable}
              onClick={handleImportRegistrySettings}
              style={{ width: "100%" }}
            >
              <Row gap={8} align="center">
                <Upload
                  size={14}
                  color={!isCliAvailable ? theme.colors.mutedFg : theme.colors.fg}
                />
                {t("buttons.importSettings")}
              </Row>
            </Button>
          </Tooltip>
        </div>
      </Row>
    </Column>
  );
}
