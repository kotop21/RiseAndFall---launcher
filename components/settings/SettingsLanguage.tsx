import { Column, Row, Label } from "@/ui";
import {
  NavigationRoot,
  SegmentedNav,
} from "@/components/ui/elements/navigation";
import { Globe } from "@/icon";
import { theme } from "@/ui";
import type { LauncherConfig } from "@/lib/config/types";
import { useToast } from "@/ui";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";

interface SettingsLanguageProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

const LANG_ITEMS = [
  { id: "en", label: "English" },
  { id: "ua", label: "Українська" },
  { id: "ru", label: "Русский" },
];

export function SettingsLanguage({
  config,
  onChangeConfig,
}: SettingsLanguageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleLanguageChange = async (newLang: string) => {
    try {
      await onChangeConfig({
        ...config,
        launcherLang: newLang,
      });
    } catch (err) {
      toast(formatErrorToast(err, "CONFIG_WRITE_FAILED"));
    }
  };

  return (
    <Column gap={8} style={{ width: "100%" }}>
      <Row gap={8} align="center">
        <Globe size={14} color={theme.colors.mutedFg} />
        <Label>{t("settings.language")}</Label>
      </Row>
      <NavigationRoot
        value={config.launcherLang || "en"}
        onValueChange={handleLanguageChange}
      >
        <SegmentedNav items={LANG_ITEMS} itemWidth={100} itemHeight={32} />
      </NavigationRoot>
    </Column>
  );
}
