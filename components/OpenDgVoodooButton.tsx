import { useState, useEffect } from "react";
import { join } from "node:path";
import { Button, Row, useToast, theme } from "@/ui";
import { SlidersHorizontal } from "@/icon";
import { launchExe } from "@/lib/process/launch";
import { isWindows } from "@/lib/utils/os";
import { hasDgVoodooCplExe } from "@/lib/utils/game-files";
import { formatErrorToast } from "@/lib/errors";

interface OpenDgVoodooButtonProps {
  gameDir?: string;
  style?: Record<string, any>;
}

export function OpenDgVoodooButton({ gameDir = "", style }: OpenDgVoodooButtonProps) {
  const { toast } = useToast();
  const [fileExists, setFileExists] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const isWin = isWindows();

  useEffect(() => {
    let isMounted = true;
    setIsValidating(true);

    (async () => {
      try {
        const exists = await hasDgVoodooCplExe(gameDir);
        if (isMounted) {
          setFileExists(exists);
          setIsValidating(false);
        }
      } catch {
        if (isMounted) {
          setFileExists(false);
          setIsValidating(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [gameDir]);

  const isDisabled = isValidating || !fileExists || !isWin;

  const handleOpen = async () => {
    const cleanDir = gameDir.trim();

    if (!cleanDir) {
      toast({
        title: "Path Required",
        description: "Choose game folder first.",
        type: "warn",
      });
      return;
    }

    if (!fileExists) {
      toast({
        title: "dgVoodoo Missing",
        description: "dgVoodooCpl.exe not found in game folder.",
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        title: "OS Unsupported",
        description: "Control panel requires Windows.",
        type: "error",
      });
      return;
    }

    try {
      const res = await launchExe(join(cleanDir, "dgVoodooCpl.exe"), { cwd: cleanDir });
      if (!res.success) {
        toast(formatErrorToast(res.error, "PROCESS_SPAWN_FAILED"));
      }
    } catch (err) {
      toast(formatErrorToast(err, "PROCESS_SPAWN_FAILED"));
    }
  };

  const getButtonLabel = () => {
    if (isValidating) return "Checking...";
    if (!fileExists) return "dgVoodoo Missing";
    if (!isWin) return "Windows Only";
    return "Open dgVoodoo Config";
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
