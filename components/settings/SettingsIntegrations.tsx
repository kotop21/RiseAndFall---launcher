import { setLowSpecMode } from "@/components/ui/motion-compat";
import type { LauncherConfig } from "@/lib/config/types";
import { discordRpc } from "@/lib/discord-rpc";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { Column, P, Row, Switch, theme, useToast } from "@/ui";

interface SettingsIntegrationsProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function SettingsIntegrations({ config, onChangeConfig }: SettingsIntegrationsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleToggleDiscord = (checked: boolean) => {
    logger.info("discord-rpc", checked ? "enabled" : "disabled");
    discordRpc.setEnabled(checked);
    onChangeConfig({
      ...config,
      discordRpc: checked,
    });
    toast({
      description: checked ? t("toasts.discordRpcEnabledDesc") : t("toasts.discordRpcDisabledDesc"),
      type: "info",
      duration: 2500,
    });
  };

  const handleToggleLowPerf = (checked: boolean) => {
    logger.info("settings", `low-performance mode: ${checked ? "on" : "off"}`);
    setLowSpecMode(checked);
    onChangeConfig({
      ...config,
      lowPerformanceMode: checked,
    });
    toast({
      description: checked ? t("toasts.lowPerfEnabledDesc") : t("toasts.lowPerfDisabledDesc"),
      type: "info",
      duration: 2500,
    });
  };

  return (
    <Column gap={8} style={{ width: "100%" }}>
      <Row
        featureId="settings.integrations.discord"
        justify="between"
        align="center"
        style={{ width: "100%" }}
      >
        <P
          featureId="settings.integrations.discord"
          style={{ color: theme.colors.fg, fontSize: 14 }}
        >
          {t("settings.enableDiscordRpc")}
        </P>
        <Switch checked={Boolean(config.discordRpc)} onCheckedChange={handleToggleDiscord} />
      </Row>

      <Row
        featureId="settings.integrations.perf"
        justify="between"
        align="center"
        style={{ width: "100%" }}
      >
        <P featureId="settings.integrations.perf" style={{ color: theme.colors.fg, fontSize: 14 }}>
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
