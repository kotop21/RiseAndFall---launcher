import { useEffect, useRef, useState } from "react";
import { WelcomeChoices } from "@/components/welcome";
import { Sparkles, Wrench } from "@/icon";
import { useTranslation } from "@/lib/lang";
import { detectSystemLanguage } from "@/lib/lang/detect";
import { logger } from "@/lib/logger";
import { Column, H1, H2, Muted, theme, View, Views } from "@/ui";

interface WelcomeViewProps {
  welcomeSeen?: boolean;
  onCompleteWelcome?: () => void;
  onAutoDetectLanguage?: (lang: "en" | "ru" | "ua") => void;
  onSelectExistingGame: (gameDir: string) => Promise<void> | void;
  onNavigateInstall: () => void;
  skipAutoDetect?: boolean;
}

export function WelcomeView({
  welcomeSeen = false,
  onCompleteWelcome,
  onAutoDetectLanguage,
  onSelectExistingGame,
  onNavigateInstall,
  skipAutoDetect = false,
}: WelcomeViewProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState<"greeting" | "preparing" | "choice">(() =>
    welcomeSeen ? "choice" : "greeting",
  );
  const hasDetectedLang = useRef(false);

  // 1. Автодетект языка системы: запускается строго один раз (если приветствие еще не было просмотрено)
  useEffect(() => {
    if (!skipAutoDetect && !hasDetectedLang.current && !welcomeSeen) {
      hasDetectedLang.current = true;
      try {
        const detected = detectSystemLanguage();
        onAutoDetectLanguage?.(detected);
      } catch (err) {
        logger.warn("lang", "Auto language detection failed in WelcomeView:", err);
      }
    }
  }, [onAutoDetectLanguage, skipAutoDetect, welcomeSeen]);

  // 2. Таймеры автоматического переключения слайдов (запускаются только при первом просмотре)
  useEffect(() => {
    if (welcomeSeen) {
      return;
    }

    const t1 = setTimeout(() => {
      setSlide("preparing");
    }, 1600);

    const t2 = setTimeout(() => {
      setSlide("choice");
      onCompleteWelcome?.();
    }, 4400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [welcomeSeen, onCompleteWelcome]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.bg,
      }}
    >
      <Views value={slide} onValueChange={(val) => setSlide(val as typeof slide)}>
        <View
          id="greeting"
          transition="slide-up"
          duration={0.3}
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Column align="center" justify="center" gap={12}>
            <Sparkles size={32} color={theme.colors.fg} />
            <H1 style={{ fontSize: 36, textAlign: "center" }}>{t("welcome.hello")}</H1>
            <Muted style={{ fontSize: 14 }}>{t("welcome.author")}</Muted>
          </Column>
        </View>

        <View
          id="preparing"
          transition="slide-up"
          duration={0.3}
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Column align="center" justify="center" gap={12}>
            <Wrench size={32} color={theme.colors.fg} />
            <H2 style={{ fontSize: 28, textAlign: "center" }}>{t("welcome.settingUp")}</H2>
            <Muted style={{ fontSize: 14 }}>{t("welcome.preparing")}</Muted>
          </Column>
        </View>

        <View
          id="choice"
          transition="slide-up"
          duration={0.3}
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <WelcomeChoices
            onSelectExistingGame={onSelectExistingGame}
            onNavigateInstall={onNavigateInstall}
          />
        </View>
      </Views>
    </div>
  );
}
