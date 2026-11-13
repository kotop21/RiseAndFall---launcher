import { join } from "node:path";
import { useState } from "react";
import { Calendar, Clock, Layers, Play, Settings, Timer, Users } from "@/icon";
import { useOnlineTracker } from "@/lib/api/online";
import { recordGameSession } from "@/lib/config/session";
import type { LauncherConfig } from "@/lib/config/types";
import { discordRpc } from "@/lib/discord-rpc";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import {
  formatInstallStatusMessage,
  installationManager,
  useInstallation,
  useIsInstalling,
} from "@/lib/manager/install";
import { launchExe } from "@/lib/process/launch";
import { launcherTracker } from "@/lib/process/launcher-tracker";
import { useGameStatus } from "@/lib/utils/game-status";
import { isWindows } from "@/lib/utils/os";
import {
  Button,
  Column,
  Muted,
  P,
  Progress,
  Row,
  Tooltip,
  theme,
  Header as UiHeader,
  useToast,
} from "@/ui";
import { DownloadGameButton } from "./DownloadGameButton";
import { ModsDialog } from "./ModsDialog";

interface HeaderProps {
  config: LauncherConfig;
  onConfigChange?: (updatedConfig: LauncherConfig) => void;
  onOpenSettings?: () => void;
  onOpenInstall?: () => void;
}

function HeaderInstallBanner() {
  const { t } = useTranslation();
  const installation = useInstallation();
  const installStatusMessage = formatInstallStatusMessage(installation, t);

  return (
    <Column
      gap={6}
      style={{
        width: "100%",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
      }}
    >
      <Muted style={{ fontSize: 12 }}>{installStatusMessage}</Muted>
      <Progress height={6} value={installation.progress?.percent ?? 0} />
    </Column>
  );
}

export function Header({ config, onConfigChange, onOpenSettings, onOpenInstall }: HeaderProps) {
  const { t, lang } = useTranslation();
  const isInstalling = useIsInstalling();
  const isReinstall = isInstalling ? installationManager.getState().isReinstall : false;
  const [isModsDialogOpen, setIsModsDialogOpen] = useState(false);

  const formatLastLaunch = (rawDate: string | null) => {
    if (!rawDate) return t("main.neverPlayed");
    try {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return t("main.neverPlayed");
      const locale = lang === "ru" ? "ru-RU" : lang === "ua" ? "uk-UA" : "en-US";
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
  const isWin = isWindows();
  const isPathConfigured = Boolean(config.gameDir?.trim());
  const { gameExists, isValidating } = useGameStatus(config.gameDir);
  const isGameMissing = !isPathConfigured || (!isValidating && !gameExists);
  const isModsDisabled = isGameMissing || isInstalling || isRunning;

  const formatLauncherPlaytime = (mins: number) => {
    if (!mins || mins <= 0) return "0 min";
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)} hrs ${mins % 60} min`;
  };

  const formatPlaytime = (totalMinutes: number): string => {
    if (!totalMinutes || totalMinutes <= 0) return "0 min";
    if (totalMinutes < 60) return `${totalMinutes} min`;
    return `${Math.floor(totalMinutes / 60)} hrs`;
  };

  const handleStartGame = async () => {
    if (!gameExists) {
      toast({
        description: t("toasts.gameMissingDesc"),
        type: "error",
      });
      return;
    }

    if (!isWin) {
      toast({
        description: t("header.osUnsupportedDesc"),
        type: "error",
      });
      return;
    }

    if (isRunning) return;
    const activeSlot = config.activeProfileId || "slot-1";
    logger.info("game", `start requested (${activeSlot})`);
    setIsRunning(true);
    discordRpc.setGameRunning(true);
    launcherTracker.saveToDisk().catch(() => {});

    toast({
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
          logger.info("game", `session ended (${daemonResult.elapsedMinutes}m)`);
          setIsRunning(false);
          discordRpc.setGameRunning(false);
          launcherTracker.saveToDisk().catch(() => {});

          try {
            const nextConfig = await recordGameSession(
              daemonResult.elapsedMinutes,
              launchStartTime,
            );
            onConfigChange?.(nextConfig);
          } catch (_err) {
            toast({
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
      size={isInstalling ? 110 : 72}
      style={{
        backgroundColor: theme.colors.card,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-end",
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      {isInstalling && <HeaderInstallBanner />}

      <Row
        justify="between"
        align="center"
        style={{
          width: "100%",
          height: 72,
          paddingLeft: 29,
          paddingRight: 29,
        }}
      >
        <Row gap={16} align="center">
          <Row gap={8} align="center">
            <Button
              featureId="header.settings"
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

            <Button
              featureId="header.mods"
              variant="secondary"
              size="lg"
              disabled={isModsDisabled}
              onClick={() => {
                if (!isModsDisabled) setIsModsDialogOpen(true);
              }}
              style={{
                height: 46,
                width: 46,
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <Layers size={18} color={isModsDisabled ? theme.colors.mutedFg : theme.colors.fg} />
            </Button>
          </Row>

          <Column gap={4} align="start">
            <Row gap={8} align="center">
              <Users size={14} color={theme.colors.mutedFg} />
              <Muted>{t("header.currentOnline")}</Muted>
              <P
                style={{
                  fontWeight: "bold",
                  color: onlineCount !== null ? theme.colors.fg : theme.colors.mutedFg,
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
                        formatLauncherPlaytime(config.launcherPlaytimeMinutes || 0),
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

        {isInstalling ? (
          <DownloadGameButton
            variant={isReinstall ? "reinstall" : "download"}
            isInstalling={true}
            onClick={onOpenInstall}
          />
        ) : isGameMissing ? (
          <DownloadGameButton onClick={onOpenInstall} disabled={isValidating || isRunning} />
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
                color={isActionReady ? theme.colors.primaryFg : theme.colors.mutedFg}
              />
              <P
                style={{
                  color: isActionReady ? theme.colors.primaryFg : theme.colors.mutedFg,
                  fontWeight: "bold",
                }}
              >
                {getButtonText()}
              </P>
            </Row>
          </Button>
        )}
      </Row>

      <ModsDialog
        open={isModsDialogOpen}
        onOpenChange={setIsModsDialogOpen}
        gameDir={config.gameDir}
      />
    </UiHeader>
  );
}
