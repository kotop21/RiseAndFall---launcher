import { useEffect, useState } from "react";
import {
  GameProfiles,
  type ProfileFormState,
  SettingsActions,
  SettingsIntegrations,
  SettingsLanguage,
} from "@/components/settings";
import { safeMotion as motion } from "@/components/ui/motion-compat";
import { ArrowLeft, Check } from "@/icon";
import type { LauncherConfig } from "@/lib/config/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { Button, Column, H2, Muted, Row, ScrollArea, Separator, theme, useToast } from "@/ui";

interface SettingsViewProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
  onBack?: () => void;
  onOpenInstall?: () => void;
}

export function SettingsView({ config, onChangeConfig, onBack, onOpenInstall }: SettingsViewProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [formState, setFormState] = useState<ProfileFormState>({
    activeProfileId: config.activeProfileId || "slot-1",
    gameDir: config.gameDir || "",
    gameArg: config.gameArg || "",
    gameProfiles: config.gameProfiles?.length ? [...config.gameProfiles] : [],
  });

  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isPromptAnimated, setIsPromptAnimated] = useState(false);

  useEffect(() => {
    setFormState({
      activeProfileId: config.activeProfileId || "slot-1",
      gameDir: config.gameDir || "",
      gameArg: config.gameArg || "",
      gameProfiles: config.gameProfiles?.length ? [...config.gameProfiles] : [],
    });
  }, [config]);

  const hasProfileChanges =
    JSON.stringify(formState.gameProfiles) !== JSON.stringify(config.gameProfiles || []) ||
    formState.activeProfileId !== (config.activeProfileId || "slot-1") ||
    formState.gameDir !== (config.gameDir || "") ||
    formState.gameArg !== (config.gameArg || "");

  useEffect(() => {
    if (!hasProfileChanges && showSavePrompt) {
      setShowSavePrompt(false);
      setIsPromptAnimated(false);
    }
  }, [hasProfileChanges, showSavePrompt]);

  const handleSaveProfiles = async () => {
    try {
      const activeProf = formState.gameProfiles.find((p) => p.id === formState.activeProfileId);
      const toSave: LauncherConfig = {
        ...config,
        activeProfileId: formState.activeProfileId,
        gameProfiles: formState.gameProfiles,
        gameDir: activeProf?.path || formState.gameDir || "",
        gameArg: activeProf?.gameArg || formState.gameArg,
      };
      await onChangeConfig(toSave);
      toast({
        title: t("toasts.settingsSavedTitle"),
        description: t("toasts.settingsSavedDesc"),
        type: "info",
        duration: 2500,
      });
      setShowSavePrompt(false);
      setIsPromptAnimated(false);
      onBack?.();
    } catch (err) {
      toast(formatErrorToast(err, "CONFIG_WRITE_FAILED"));
    }
  };

  const handleRevertProfiles = () => {
    const defaultActiveId = config.activeProfileId || "slot-1";
    const baseTarget = config.gameProfiles?.find((p) => p.id === defaultActiveId);

    setFormState({
      activeProfileId: defaultActiveId,
      gameDir: baseTarget?.path || "",
      gameArg: baseTarget?.gameArg || config.gameArg,
      gameProfiles: config.gameProfiles ? [...config.gameProfiles] : [],
    });
    setShowSavePrompt(false);
    setIsPromptAnimated(false);
  };

  const handleBackClick = () => {
    if (hasProfileChanges) {
      toast({
        title: t("toasts.unsavedTitle"),
        description: t("toasts.unsavedDesc"),
        type: "warn",
      });
      setShowSavePrompt(true);
      setTimeout(() => {
        setIsPromptAnimated(true);
      }, 16);
      return;
    }
    onBack?.();
  };

  return (
    <ScrollArea direction="vertical" style={{ flexGrow: 1, width: "100%", height: "100%" }}>
      <Column gap={20} style={{ width: "100%", padding: 24 }}>
        <Row gap={12} align="center">
          <motion.div
            animate={{
              width: showSavePrompt && isPromptAnimated ? 148 : 36,
            }}
            transition={{
              duration: 0.22,
              ease: "easeOut",
            }}
            style={{
              position: "relative",
              height: 36,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {showSavePrompt && (
              <motion.div
                animate={{
                  left: isPromptAnimated ? 44 : 0,
                  opacity: isPromptAnimated ? 1 : 0,
                }}
                transition={{
                  duration: 0.22,
                  ease: "easeOut",
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveProfiles}
                  style={{ height: 36 }}
                >
                  <Row gap={6} align="center">
                    <Check size={14} color={theme.colors.primaryFg} />
                    {t("buttons.save")}
                  </Row>
                </Button>
              </motion.div>
            )}

            <div
              style={{
                position: "relative",
                backgroundColor: theme.colors.bg,
                borderRadius: theme.radius.md,
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                style={{ width: 36, height: 36, paddingLeft: 0, paddingRight: 0 }}
              >
                <ArrowLeft size={18} color={theme.colors.fg} />
              </Button>
            </div>
          </motion.div>

          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>{t("settings.title")}</H2>
            <Muted>{t("settings.subtitle")}</Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        <GameProfiles
          config={config}
          formState={formState}
          setFormState={setFormState}
          hasProfileChanges={hasProfileChanges}
          onSaveProfiles={handleSaveProfiles}
          onRevertProfiles={handleRevertProfiles}
        />

        <Separator orientation="horizontal" />

        <SettingsLanguage config={config} onChangeConfig={onChangeConfig} />

        <SettingsIntegrations config={config} onChangeConfig={onChangeConfig} />

        <Separator orientation="horizontal" />

        <SettingsActions gameDir={formState.gameDir} onOpenInstall={onOpenInstall} />
      </Column>
    </ScrollArea>
  );
}
