import { Column, Row, Label, P, Switch, useToast, theme } from "@/ui";
import { setLowSpecMode } from "@/components/ui/motion-compat";
import { discordRpc } from "@/lib/discord-rpc";
import type { LauncherConfig } from "@/lib/config/types";
import { useTranslation } from "@/lib/lang";

interface SettingsIntegrationsProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function SettingsIntegrations({
  config,
  onChangeConfig,
}: SettingsIntegrationsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleToggleDiscord = (checked: boolean) => {
    discordRpc.setEnabled(checked);
    onChangeConfig({
      ...config,
      discordRpc: checked,
    });
    toast({
      title: checked
        ? t("toasts.discordRpcEnabledTitle")
        : t("toasts.discordRpcDisabledTitle"),
      description: checked
        ? t("toasts.discordRpcEnabledDesc")
        : t("toasts.discordRpcDisabledDesc"),
      type: "info",
      duration: 2500,
    });
  };

  const handleToggleLowPerf = (checked: boolean) => {
    setLowSpecMode(checked);
    onChangeConfig({
      ...config,
      lowPerformanceMode: checked,
    });
    toast({
      title: checked
        ? t("toasts.lowPerfEnabledTitle")
        : t("toasts.lowPerfDisabledTitle"),
      description: checked
        ? t("toasts.lowPerfEnabledDesc")
        : t("toasts.lowPerfDisabledDesc"),
      type: "info",
      duration: 2500,
    });
  };

  return (
    <Column gap={8} style={{ width: "100%" }}>
      <Label>{t("settings.integrations")}</Label>
      <Row justify="between" align="center" style={{ width: "100%" }}>
        <P style={{ color: theme.colors.fg, fontSize: 14 }}>
          {t("settings.enableDiscordRpc")}
        </P>
        <Switch
          checked={Boolean(config.discordRpc)}
          onCheckedChange={handleToggleDiscord}
        />
      </Row>

      <Row justify="between" align="center" style={{ width: "100%" }}>
        <P style={{ color: theme.colors.fg, fontSize: 14 }}>
          {t("settings.lowPerformanceMode")}
        </P>
        <Switch
          checked={Boolean(config.lowPerformanceMode)}
          onCheckedChange={handleToggleLowPerf}
        />
      </Row>
    </Column>
  );
}
