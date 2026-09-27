import { useState, useEffect, useRef } from "react";
import { Views, View, Column, H1, H2, Muted, theme } from "@/ui";
import { Sparkles, Wrench } from "@/icon";
import { detectSystemLanguage } from "@/lib/lang/detect";
import { useTranslation } from "@/lib/lang";
import { WelcomeChoices } from "@/components/welcome";

interface WelcomeViewProps {
  onAutoDetectLanguage?: (lang: "en" | "ru" | "ua") => void;
  onSelectExistingGame: (gameDir: string) => Promise<void> | void;
  onNavigateInstall: () => void;
}

export function WelcomeView({
  onAutoDetectLanguage,
  onSelectExistingGame,
  onNavigateInstall,
}: WelcomeViewProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState<"greeting" | "preparing" | "choice">(
    "greeting",
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const detected = detectSystemLanguage();
    onAutoDetectLanguage?.(detected);

    timers.current.push(
      setTimeout(() => {
        setSlide("preparing");
      }, 1600),
    );

    timers.current.push(
      setTimeout(() => {
        setSlide("choice");
      }, 4400),
    );

    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
  }, []);

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
      <Views value={slide} onValueChange={(val) => setSlide(val as any)}>
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
            <H1 style={{ fontSize: 36, textAlign: "center" }}>
              {t("welcome.hello")}
            </H1>
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
            <H2 style={{ fontSize: 28, textAlign: "center" }}>
              {t("welcome.settingUp")}
            </H2>
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
