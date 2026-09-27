import { useState, useEffect } from "react";
import { Row, Column, Badge, H1, Muted, theme } from "@/ui";
import { Tag, Layers, Calendar } from "@/icon";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { hasDgVoodooCplExe } from "@/lib/utils/game-files";
import { getLauncherVersion } from "@/lib/utils/version";
import { useTranslation } from "@/lib/lang";
import type { LauncherConfig } from "@/lib/config/types";

const QUOTES = [
  "«Command from above. Conquer on foot.»",
  "«Lead from the front, or die with the rest.»",
  "«Glory belongs to the victor!»",
  "«For honor and the empire!»",
  "«Stand firm, warriors of antiquity!»",
];

const rawVersion = getLauncherVersion().trim().replace(/^v/i, "");
const launcherLabel = `Launcher v${rawVersion}`;

interface GameStatusHeaderProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function GameStatusHeader({
  config,
  onChangeConfig,
}: GameStatusHeaderProps) {
  const { t, lang } = useTranslation();
  const [isDgVoodooReady, setIsDgVoodooReady] = useState(false);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const exists = await hasDgVoodooCplExe(config.gameDir);
      if (isMounted) {
        setIsDgVoodooReady(exists);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [config.gameDir]);

  const handleSelectSlot = async (slotId: string) => {
    if (slotId === config.activeProfileId) return;
    const target = config.gameProfiles?.find((p) => p.id === slotId);
    const nextConfig: LauncherConfig = {
      ...config,
      activeProfileId: slotId,
      gameDir: target?.path || "",
      gameArg: target?.gameArg || config.gameArg,
    };
    await onChangeConfig(nextConfig);
  };

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

  return (
    <Column gap={10} style={{ width: "100%" }}>
      <Row justify="between" align="center" style={{ width: "100%" }}>
        <H1 style={{ color: theme.colors.fg }}>{t("main.title")}</H1>
        <ProfileSwitcher
          profiles={config.gameProfiles || []}
          activeProfileId={config.activeProfileId || "slot-1"}
          onSelectProfile={handleSelectSlot}
          onlyConfigured
        />
      </Row>

      <Row gap={8} align="center">
        <Badge variant="secondary">
          <Row gap={6} align="center">
            <Tag size={12} color={theme.colors.mutedFg} />
            {launcherLabel}
          </Row>
        </Badge>

        <Badge variant={isDgVoodooReady ? "success" : "destructive"}>
          <Row gap={6} align="center">
            <Layers size={12} color={theme.colors.fg} />
            {isDgVoodooReady
              ? t("main.dgVoodooReady")
              : t("main.dgVoodooMissing")}
          </Row>
        </Badge>

        <Badge variant="outline">
          <Row gap={6} align="center">
            <Calendar size={12} color={theme.colors.mutedFg} />
            {formatLastLaunch(config.lastLaunchDate)}
          </Row>
        </Badge>
      </Row>

      <Muted>{quote}</Muted>
    </Column>
  );
}
