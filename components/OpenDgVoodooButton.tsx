import { join } from "node:path";
import type { StyleDesc } from "@gpuix/react";
import { SlidersHorizontal } from "@/icon";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { launchExe } from "@/lib/process/launch";
import { useGameStatus } from "@/lib/utils/game-status";
import { isWindows } from "@/lib/utils/os";
import { Button, Row, Tooltip, theme, useToast } from "@/ui";

interface OpenDgVoodooButtonProps {
  gameDir?: string;
  style?: StyleDesc;
  featureId?: string;
}

export function OpenDgVoodooButton({
  gameDir = "",
  style,
  featureId = "main.actions.dgvoodoo",
}: OpenDgVoodooButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isWin = isWindows();
  const { dgVoodooExists: fileExists, isValidating } = useGameStatus(gameDir);

  const cleanDir = gameDir.trim();
  const isDisabled = isValidating || !fileExists || !isWin;

  const handleOpen = async () => {
    if (!cleanDir) {
      toast({
        description: t("toasts.dgvPathRequiredDesc"),
        type: "warn",
      });
      return;
    }

    if (!fileExists) {
      toast({
        description: t("errors.DGV_EXE_NOT_FOUND.description"),
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        description: t("toasts.dgvOsUnsupportedDesc"),
        type: "error",
      });
      return;
    }

    try {
      const res = await launchExe(join(cleanDir, "dgVoodooCpl.exe"), {
        cwd: cleanDir,
      });
      if (!res.success) {
        toast(formatErrorToast(res.error, "PROCESS_SPAWN_FAILED"));
      }
    } catch (err) {
      toast(formatErrorToast(err, "PROCESS_SPAWN_FAILED"));
    }
  };

  const getDisabledReason = () => {
    if (isValidating) return t("install.processing");
    if (!cleanDir) return t("toasts.dgvPathRequiredDesc");
    if (!fileExists) return t("errors.DGV_EXE_NOT_FOUND.description");
    if (!isWin) return t("toasts.dgvOsUnsupportedDesc");
    return "";
  };

  return (
    <Tooltip
      content={getDisabledReason()}
      disabled={!isDisabled}
      side="top"
      style={style?.width !== undefined ? { width: style.width } : undefined}
    >
      <Button
        featureId={featureId}
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={handleOpen}
        style={style}
      >
        <Row gap={8} align="center" justify="center">
          <SlidersHorizontal
            size={14}
            color={isDisabled ? theme.colors.mutedFg : theme.colors.fg}
          />
          {t("buttons.openDgVoodoo")}
        </Row>
      </Button>
    </Tooltip>
  );
}
