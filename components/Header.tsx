import { discordRpc } from "@/lib/discord-rpc";
import { useState, useEffect } from "react";
import { join } from "node:path";
import {
  Header as UiHeader,
  Row,
  Column,
  Button,
  P,
  Muted,
  Tooltip,
  useToast,
  theme,
} from "@/ui";
import { Play, Users, Clock, Settings, Calendar, Timer } from "@/icon";
import { launchExe } from "@/lib/process/launch";
import { recordGameSession } from "@/lib/config/session";
import { isWindows } from "@/lib/utils/os";
import { hasRiseAndFallExe } from "@/lib/utils/game-files";
import { useOnlineTracker } from "@/lib/api/online";
import { DownloadGameButton } from "./DownloadGameButton";
import type { LauncherConfig } from "@/lib/config/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";

interface HeaderProps {
  config: LauncherConfig;
  onConfigChange?: (updatedConfig: LauncherConfig) => void;
  onOpenSettings?: () => void;
  onOpenInstall?: () => void;
}

export function Header({
  config,
  onConfigChange,
  onOpenSettings,
  onOpenInstall,
}: HeaderProps) {
  const { t, lang } = useTranslation();

  const formatLastLaunch = (rawDate: string | null) => {
    if (!rawDate) return t("main.neverPlayed");
    try {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return t("main.neverPlayed");
      const locale =
        lang === "ru" ? "ru-RU" : lang === "ua" ? "uk-UA" : "en-US";
      const formatted = d.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return t("main.lastLaunch").replace("{date}", formatted);
    } catch {
      return t("main.neverPlayed");
    }
  };

  const { toast } = useToast();
  const onlineCount = useOnlineTracker();
  const [isRunning, setIsRunning] = useState(false);
  const [gameExists, setGameExists] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const isWin = isWindows();

  const formatLauncherPlaytime = (mins: number) => {
    if (!mins || mins <= 0) return "0 min";
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} hrs ${mins % 60} min`;
  };

  const isPathConfigured = Boolean(config.gameDir?.trim());

  useEffect(() => {
    let isMounted = true;
    setIsValidating(true);

    (async () => {
      if (!isPathConfigured) {
        if (isMounted) {
          setGameExists(false);
          setIsValidating(false);
        }
        return;
      }

      const exists = await hasRiseAndFallExe(config.gameDir);
      if (isMounted) {
        setGameExists(exists);
        setIsValidating(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [config.gameDir, isPathConfigured]);

  const formatPlaytime = (totalMinutes: number): string => {
    if (!totalMinutes || totalMinutes <= 0) return "0 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;
    return `${Math.floor(totalMinutes / 60)} hrs`;
  };

  const handleStartGame = async () => {
    if (!gameExists) {
      toast({
        title: t("header.gameMissing"),
        description: t("header.gameMissingDesc"),
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        title: t("header.windowsOnly"),
        description: t("header.osUnsupportedDesc"),
        type: "error",
      });
      return;
    }

    if (isRunning) return;
    setIsRunning(true);
    discordRpc.setGameRunning(true);

    toast({
      title: t("header.startingGame"),
      description: t("header.startingDesc"),
      type: "info",
      duration: 2000,
    });

    const root = config.gameDir.trim();
    const launchStartTime = new Date();

    try {
      const res = await launchExe(join(root, "RiseAndFall.exe"), {
        cwd: root,
        rawArgs: config.gameArg,
        trackSession: true,
        onSessionEnd: async (daemonResult) => {
          setIsRunning(false);
          discordRpc.setGameRunning(false);

          try {
            const nextConfig = await recordGameSession(
              daemonResult.elapsedMinutes,
              launchStartTime,
            );
            onConfigChange?.(nextConfig);
          } catch (err) {
            toast({
              title: t("toasts.sessionSaveErrorTitle"),
              description: t("toasts.sessionSaveErrorDesc"),
              type: "warn",
              duration: 3500,
            });
          }
        },
      });

      if (!res.success) {
        setIsRunning(false);
        discordRpc.setGameRunning(false);
        toast(formatErrorToast(res.error, "PROCESS_SPAWN_FAILED"));
      }
    } catch (err) {
      setIsRunning(false);
      discordRpc.setGameRunning(false);
      toast(formatErrorToast(err, "PROCESS_SPAWN_FAILED"));
    }
  };

  const isButtonDisabled = isRunning || isValidating || !gameExists || !isWin;

  const getButtonText = () => {
    if (isRunning) return t("header.gameRunning");
    if (isValidating) return t("header.checking");
    if (!gameExists) return t("header.gameMissing");
    if (!isWin) return t("header.windowsOnly");
    return t("header.startGame");
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
              <Muted>{t("header.currentOnline")}</Muted>
              <P
                style={{
                  fontWeight: "bold",
                  color:
                    onlineCount !== null
                      ? theme.colors.fg
                      : theme.colors.mutedFg,
                }}
              >
                {onlineCount !== null ? onlineCount : "Unavailable"}
              </P>
            </Row>

            <Tooltip
              content={
                <Column gap={4} style={{ padding: 2 }}>
                  <Row gap={6} align="center">
                    <Calendar size={13} color={theme.colors.mutedFg} />
                    <text
                      style={{
                        fontFamily: theme.fontFamily,
                        color: theme.colors.popoverFg,
                        fontSize: 12,
                      }}
                    >
                      {formatLastLaunch(config.lastLaunchDate)}
                    </text>
                  </Row>
                  <Row gap={6} align="center">
                    <Timer size={13} color={theme.colors.mutedFg} />
                    <text
                      style={{
                        fontFamily: theme.fontFamily,
                        color: theme.colors.mutedFg,
                        fontSize: 11,
                      }}
                    >
                      {t("header.launcherTime").replace(
                        "{time}",
                        formatLauncherPlaytime(
                          config.launcherPlaytimeMinutes || 0,
                        ),
                      )}
                    </text>
                  </Row>
                </Column>
              }
              side="top-start"
              offset={8}
            >
              <Row gap={8} align="center">
                <Clock size={14} color={theme.colors.mutedFg} />
                <Muted>{t("header.totalPlaytime")}</Muted>
                <P style={{ color: theme.colors.mutedFg }}>
                  {formatPlaytime(config.totalPlaytimeMinutes)}
                </P>
              </Row>
            </Tooltip>
          </Column>
        </Row>

        {!isPathConfigured || (!isValidating && !gameExists) ? (
          <DownloadGameButton
            onClick={onOpenInstall}
            disabled={isValidating || isRunning}
          />
        ) : (
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
        )}
      </Row>
    </UiHeader>
  );
}
