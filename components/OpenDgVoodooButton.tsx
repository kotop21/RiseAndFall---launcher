import { join } from "node:path";
import type { StyleDesc } from "@gpuix/react";
import { SlidersHorizontal } from "@/icon";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { launchExe } from "@/lib/process/launch";
import { useGameStatus } from "@/lib/utils/game-status";
import { isWindows } from "@/lib/utils/os";
import { Button, Row, theme, useToast } from "@/ui";

interface OpenDgVoodooButtonProps {
  gameDir?: string;
  style?: StyleDesc;
}

export function OpenDgVoodooButton({ gameDir = "", style }: OpenDgVoodooButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isWin = isWindows();
  const { dgVoodooExists: fileExists, isValidating } = useGameStatus(gameDir);

  const isDisabled = isValidating || !fileExists || !isWin;

  const handleOpen = async () => {
    const cleanDir = gameDir.trim();

    if (!cleanDir) {
      toast({
        title: t("toasts.dgvPathRequiredTitle"),
        description: t("toasts.dgvPathRequiredDesc"),
        type: "warn",
      });
      return;
    }

    if (!fileExists) {
      toast({
        title: t("toasts.dgvMissingTitle"),
        description: t("toasts.dgvMissingDesc"),
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        title: t("toasts.dgvOsUnsupportedTitle"),
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

  const getButtonLabel = () => {
    if (isValidating) return t("header.checking");
    if (!fileExists) return t("main.dgVoodooMissing");
    if (!isWin) return t("header.windowsOnly");
    return t("buttons.openDgVoodoo");
  };

  return (
    <Button variant="outline" size="sm" disabled={isDisabled} onClick={handleOpen} style={style}>
      <Row gap={8} align="center" justify="center">
        <SlidersHorizontal size={14} color={isDisabled ? theme.colors.mutedFg : theme.colors.fg} />
        {getButtonLabel()}
      </Row>
    </Button>
  );
}
