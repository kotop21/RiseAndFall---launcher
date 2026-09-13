import { useState, useEffect } from "react";
import { join } from "node:path";
import { Button, Row, useToast, theme } from "@/ui";
import { SlidersHorizontal } from "@/icon";
import { launchExe } from "@/lib/process/launch";
import { isWindows } from "@/lib/utils/os";
import { hasDgVoodooCplExe } from "@/lib/utils/game-files";

interface OpenDgVoodooButtonProps {
  gameDir?: string;
  style?: Record<string, any>;
}

export function OpenDgVoodooButton({
  gameDir = "",
  style,
}: OpenDgVoodooButtonProps) {
  const { toast } = useToast();
  const [fileExists, setFileExists] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const isWin = isWindows();

  useEffect(() => {
    let isMounted = true;
    setIsValidating(true);

    (async () => {
      const exists = await hasDgVoodooCplExe(gameDir);
      if (isMounted) {
        setFileExists(exists);
        setIsValidating(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [gameDir]);

  const isDisabled = isValidating || !fileExists || !isWin;

  const handleOpen = async () => {
    const cleanDir = gameDir.trim();

    if (!fileExists) {
      toast({
        title: "File Missing",
        description: "dgVoodooCpl.exe does not exist in the game directory.",
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        title: "Platform Unsupported",
        description: "dgVoodoo control panel requires Windows.",
        type: "error",
      });
      return;
    }

    const dgVoodooPath = join(cleanDir, "dgVoodooCpl.exe");

    const res = await launchExe(dgVoodooPath, {
      cwd: cleanDir,
    });

    if (!res.success) {
      if (res.error === "unsupported_os") {
        toast({
          title: "Platform Notice",
          description:
            "dgVoodoo control panel requires Windows or Wine environment.",
          type: "error",
        });
      } else if (res.error === "file_not_found") {
        toast({
          title: "File Missing",
          description: "dgVoodooCpl.exe does not exist in the game directory.",
          type: "error",
        });
      } else {
        toast({
          title: "Launch Error",
          description: "Failed to start dgVoodoo control panel.",
          type: "error",
        });
      }
      return;
    }

    toast({
      title: "dgVoodoo Opened",
      description: "Control panel is running.",
      type: "info",
    });
  };

  const getButtonLabel = () => {
    if (isValidating) return "Checking...";
    if (!fileExists) return "dgVoodoo Missing";
    if (!isWin) return "Windows Only";
    return "Open dgVoodoo Config";
  };

  return (
    <Button
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
        {getButtonLabel()}
      </Row>
    </Button>
  );
}
