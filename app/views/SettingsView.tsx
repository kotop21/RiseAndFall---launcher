import { Column, Row, H2, Muted, Button, Separator, ScrollArea, theme } from "@/ui";
import { ArrowLeft } from "@/icon";
import {
  GameProfiles,
  SettingsLanguage,
  SettingsIntegrations,
  SettingsActions,
} from "@/components/settings";
import type { LauncherConfig } from "@/lib/config/types";
import { useTranslation } from "@/lib/lang";

interface SettingsViewProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
  onBack?: () => void;
  onOpenInstall?: () => void;
}

export function SettingsView({
  config,
  onChangeConfig,
  onBack,
  onOpenInstall,
}: SettingsViewProps) {
  const { t } = useTranslation();

  return (
    <ScrollArea
      direction="vertical"
      style={{ flexGrow: 1, width: "100%", height: "100%" }}
    >
      <Column gap={20} style={{ width: "100%", padding: 24 }}>
        <Row gap={12} align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            style={{ width: 36, height: 36, paddingLeft: 0, paddingRight: 0 }}
          >
            <ArrowLeft size={18} color={theme.colors.fg} />
          </Button>

          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>{t("settings.title")}</H2>
            <Muted>{t("settings.subtitle")}</Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        <GameProfiles config={config} onChangeConfig={onChangeConfig} onSaved={onBack} />

        <Separator orientation="horizontal" />

        <SettingsLanguage config={config} onChangeConfig={onChangeConfig} />

        <SettingsIntegrations config={config} onChangeConfig={onChangeConfig} />

        <Separator orientation="horizontal" />

        <SettingsActions gameDir={config.gameDir} onOpenInstall={onOpenInstall} />
      </Column>
    </ScrollArea>
  );
}
