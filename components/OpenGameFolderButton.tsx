import { dirname } from "node:path";
import { Button, Row, useToast, theme } from "@/ui";
import { FolderOpen } from "@/icon";
import { openExplorer } from "@/lib/explorer/open";
import { formatErrorToast } from "@/lib/errors";

interface OpenGameFolderButtonProps {
  gameDir?: string;
  label?: string;
  style?: Record<string, any>;
}

export function OpenGameFolderButton({
  gameDir = "",
  label = "Open Game Folder",
  style,
}: OpenGameFolderButtonProps) {
  const { toast } = useToast();

  const handleOpen = async () => {
    let targetDir = gameDir.trim();

    if (!targetDir) {
      toast({
        title: "Directory Not Set",
        description: "Please specify the game installation path first.",
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
          title: "Explorer Error",
          description: "Target directory does not exist or system explorer cannot access it.",
          type: "error",
        });
      }
    } catch (err) {
      toast(formatErrorToast(err, "EXPLORER_FAILED"));
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleOpen} style={style}>
      <Row gap={8} align="center" justify="center">
        <FolderOpen size={14} color={theme.colors.fg} />
        {label}
      </Row>
    </Button>
  );
}
