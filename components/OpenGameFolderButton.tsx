import { dirname } from "node:path";
import { Button, Row, useToast, theme } from "@/ui";
import { FolderOpen } from "@/icon";
import { openExplorer } from "@/lib/explorer/open";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";

interface OpenGameFolderButtonProps {
  gameDir?: string;
  label?: string;
  style?: Record<string, any>;
}

export function OpenGameFolderButton({
  gameDir = "",
  label,
  style,
}: OpenGameFolderButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const buttonLabel = label || t("buttons.openFolder");

  const handleOpen = async () => {
    let targetDir = gameDir.trim();

    if (!targetDir) {
      toast({
        title: t("toasts.explorerNotSetTitle"),
        description: t("toasts.explorerNotSetDesc"),
        type: "warn",
      });
      return;
    }

    if (targetDir.toLowerCase().endsWith(".exe")) {
      targetDir = dirname(targetDir);
    }

    try {
      if (!(await openExplorer(targetDir))) {
        toast({
          title: t("toasts.explorerErrorTitle"),
          description: t("toasts.explorerErrorDesc"),
          type: "error",
        });
      }
    } catch (err) {
      toast(formatErrorToast(err, "EXPLORER_FAILED"));
    }
  };

  const isPathEmpty = !gameDir.trim();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPathEmpty}
      onClick={handleOpen}
      style={style}
    >
      <Row gap={8} align="center" justify="center">
        <FolderOpen
          size={14}
          color={isPathEmpty ? theme.colors.mutedFg : theme.colors.fg}
        />
        {buttonLabel}
      </Row>
    </Button>
  );
}
