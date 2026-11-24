import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { Calendar, Layers, Tag } from "@/icon";
import type { LauncherConfig } from "@/lib/config/types";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { useGameStatus } from "@/lib/utils/game-status";
import { getLauncherVersion } from "@/lib/utils/version";
import { Badge, Column, H1, Muted, Row, theme } from "@/ui";

const QUOTES = [
  "«Command from above. Conquer on foot.»",
  "«Lead from the front, or die with the rest.»",
  "«Glory belongs to the victor!»",
  "«For honor and the empire!»",
  "«Stand firm, warriors of antiquity!»",
];

const SESSION_QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];
const rawVersion = getLauncherVersion().trim().replace(/^v/i, "");
const launcherLabel = `Launcher v${rawVersion}`;

interface GameStatusHeaderProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function GameStatusHeader({ config, onChangeConfig }: GameStatusHeaderProps) {
  const { t, lang } = useTranslation();
  const { dgVoodooExists: isDgVoodooReady } = useGameStatus(config.gameDir);

  const handleSelectSlot = async (slotId: string) => {
    if (slotId === config.activeProfileId) return;
    const prevSlotId = config.activeProfileId || "slot-1";
    logger.info("profile", `switch (${prevSlotId} -> ${slotId})`);
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

  const safeProfiles = config.gameProfiles?.length ? config.gameProfiles : [];
  const configuredProfiles = safeProfiles.filter((p) => Boolean(p.path?.trim()));
  const isSwitcherVisible = configuredProfiles.length > 1;
  const activeSlotIndex = safeProfiles.findIndex((p) => p.id === config.activeProfileId);
  const activeSlotNumber = activeSlotIndex >= 0 ? activeSlotIndex + 1 : 1;
  const fullTitle = isSwitcherVisible
    ? `${t("main.title")} - #${activeSlotNumber}`
    : t("main.title");

  return (
    <Column gap={10} style={{ width: "100%" }}>
      <Row justify="between" align="center" style={{ width: "100%", flexWrap: "nowrap", gap: 12 }}>
        <H1
          featureId="main.profiles"
          style={{
            color: theme.colors.fg,
            fontSize: isSwitcherVisible ? 21 : 24,
            whiteSpace: "nowrap",
            lineClamp: 1,
          }}
        >
          {fullTitle}
        </H1>
        <ProfileSwitcher
          profiles={config.gameProfiles || []}
          activeProfileId={config.activeProfileId || "slot-1"}
          onSelectProfile={handleSelectSlot}
          onlyConfigured
          style={{ flexShrink: 0 }}
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
            {isDgVoodooReady ? t("main.dgVoodooReady") : t("main.dgVoodooMissing")}
          </Row>
        </Badge>

        <Badge variant="outline">
          <Row gap={6} align="center">
            <Calendar size={12} color={theme.colors.mutedFg} />
            {formatLastLaunch(config.lastLaunchDate)}
          </Row>
        </Badge>
      </Row>

      <Muted>{SESSION_QUOTE}</Muted>
    </Column>
  );
}
