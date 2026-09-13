import { useState, useEffect } from "react";
import { join } from "node:path";
import {
  Header as UiHeader,
  Row,
  Column,
  Button,
  P,
  Muted,
  useToast,
  theme,
} from "@/ui";
import { Play, Users, Clock, Settings } from "@/icon";
import { launchExe, parseArgs } from "@/lib/process/launch";
import { recordGameSession } from "@/lib/config/session";
import { isWindows } from "@/lib/utils/os";
import { hasRiseAndFallExe } from "@/lib/utils/game-files";
import type { LauncherConfig } from "@/lib/config/types";

interface HeaderProps {
  config: LauncherConfig;
  onConfigChange?: (updatedConfig: LauncherConfig) => void;
  onOpenSettings?: () => void;
}

export function Header({
  config,
  onConfigChange,
  onOpenSettings,
}: HeaderProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [gameExists, setGameExists] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const isWin = isWindows();

  useEffect(() => {
    let isMounted = true;
    setIsValidating(true);

    (async () => {
      const exists = await hasRiseAndFallExe(config.gameDir);
      if (isMounted) {
        setGameExists(exists);
        setIsValidating(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [config.gameDir]);

  const formatPlaytime = (totalMinutes: number): string => {
    if (!totalMinutes || totalMinutes <= 0) return "0 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    return `${hours} hrs`;
  };

  const handleStartGame = async () => {
    if (!gameExists) {
      toast({
        title: "Game Not Found",
        description:
          "RiseAndFall.exe is missing from the configured directory.",
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        title: "Platform Unsupported",
        description:
          "Game launcher can only start executables natively on Windows.",
        type: "error",
      });
      return;
    }

    if (isRunning) return;
    setIsRunning(true);

    const root = config.gameDir.trim();
    const launchStartTime = new Date();

    try {
      const exePath = join(root, "RiseAndFall.exe");
      const args = parseArgs(config.gameArg);

      const res = await launchExe(exePath, {
        cwd: root,
        args,
        trackSession: true,
        onSessionEnd: async (daemonResult) => {
          setIsRunning(false);

          try {
            const nextConfig = await recordGameSession(
              daemonResult.elapsedMinutes,
              launchStartTime,
            );
            onConfigChange?.(nextConfig);
          } catch (sessionErr) {
            console.error("Failed to record game session:", sessionErr);
          }

          toast({
            title: "Game Session Ended",
            description: `Played: ${daemonResult.elapsedMinutes} min (${daemonResult.elapsedSeconds}s)`,
            type: "info",
          });
        },
      });

      if (!res.success) {
        setIsRunning(false);

        if (res.error === "unsupported_os") {
          toast({
            title: "Platform Notice",
            description:
              "Direct .exe execution requires Windows or Wine environment.",
            type: "error",
          });
        } else if (res.error === "file_not_found") {
          toast({
            title: "Game Missing",
            description: "RiseAndFall.exe not found at target directory.",
            type: "error",
          });
        } else {
          toast({
            title: "Execution Error",
            description: "Failed to spawn game process.",
            type: "error",
          });
        }
        return;
      }

      toast({
        title: "Game Initialized",
        description: `Rise and Fall running [PID: ${res.pid}]`,
        type: "info",
      });
    } catch {
      setIsRunning(false);
      toast({
        title: "Launch Failed",
        description: "Unexpected error during launch sequence.",
        type: "error",
      });
    }
  };

  const isButtonDisabled = isRunning || isValidating || !gameExists || !isWin;

  const getButtonText = () => {
    if (isRunning) return "Game Running...";
    if (isValidating) return "Checking...";
    if (!gameExists) return "Game Missing";
    if (!isWin) return "Windows Only";
    return "Start Game";
  };

  const isActionReady = !isValidating && gameExists && isWin && !isRunning;

  return (
    <UiHeader
      variant="down"
      size={72}
      style={{
        backgroundColor: theme.colors.card,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Row
        justify="between"
        align="center"
        style={{
          width: "100%",
          height: 72,
          paddingLeft: 13,
          paddingRight: 13,
        }}
      >
        <Row gap={16} align="center">
          <Button
            variant="secondary"
            size="lg"
            disabled={isRunning}
            onClick={onOpenSettings}
            style={{
              height: 46,
              width: 46,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          >
            <Settings size={18} color={theme.colors.fg} />
          </Button>

          <Column gap={4} align="start">
            <Row gap={8} align="center">
              <Users size={14} color={theme.colors.mutedFg} />
              <Muted>Current Online:</Muted>
              <P style={{ fontWeight: "bold" }}>42</P>
            </Row>
            <Row gap={8} align="center">
              <Clock size={14} color={theme.colors.mutedFg} />
              <Muted>Total Playtime:</Muted>
              <P style={{ color: theme.colors.mutedFg }}>
                {formatPlaytime(config.totalPlaytimeMinutes)}
              </P>
            </Row>
          </Column>
        </Row>

        <Button
          size="lg"
          disabled={isButtonDisabled}
          onClick={handleStartGame}
          style={{
            height: 46,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <Row gap={10} align="center">
            <Play
              size={18}
              color={
                isActionReady ? theme.colors.primaryFg : theme.colors.mutedFg
              }
            />
            <P
              style={{
                color: isActionReady
                  ? theme.colors.primaryFg
                  : theme.colors.mutedFg,
                fontWeight: "bold",
              }}
            >
              {getButtonText()}
            </P>
          </Row>
        </Button>
      </Row>
    </UiHeader>
  );
}
