import { useState, useEffect, useRef } from "react";
import {
  Views,
  View,
  Column,
  Row,
  H1,
  H2,
  P,
  Muted,
  Button,
  useFileDialog,
  useToast,
  theme,
} from "@/ui";
import { FolderCheck, Download, Sparkles, Wrench } from "@/icon";
import { hasRiseAndFallExe } from "@/lib/utils/game-files";
import { detectSystemLanguage } from "@/lib/lang/detect";
import { useTranslation } from "@/lib/lang";

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
  const { toast } = useToast();
  const { pickFolder } = useFileDialog();
  const [slide, setSlide] = useState<"greeting" | "preparing" | "choice">(
    "greeting",
  );
  const [isPicking, setIsPicking] = useState(false);
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

  const handlePickFolder = async () => {
    if (isPicking) return;
    setIsPicking(true);

    try {
      const selected = await pickFolder({
        title: t("welcome.chooseMethod"),
        requiredFile: "RiseAndFall.exe",
      });

      if (!selected) return;

      const path = typeof selected === "object" ? selected.path : selected;
      const isValid =
        typeof selected === "object"
          ? selected.isValid
          : await hasRiseAndFallExe(path);

      if (!isValid) {
        toast({
          title: t("toasts.welcomeMissingTitle"),
          description: t("toasts.welcomeMissingDesc"),
          type: "error",
        });
        return;
      }

      await onSelectExistingGame(path);
    } catch {
      toast({
        title: t("toasts.welcomeAccessDeniedTitle"),
        description: t("toasts.welcomeAccessDeniedDesc"),
        type: "error",
      });
    } finally {
      setIsPicking(false);
    }
  };

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
          <Column
            align="center"
            justify="center"
            gap={18}
            style={{ maxWidth: 440, width: "100%" }}
          >
            <Column align="center" gap={4}>
              <H2 style={{ fontSize: 24, textAlign: "center" }}>
                {t("welcome.gettingStarted")}
              </H2>
              <Muted style={{ textAlign: "center" }}>
                {t("welcome.chooseMethod")}
              </Muted>
            </Column>

            <Column gap={12} style={{ width: "100%" }}>
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  gap: 16,
                }}
              >
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <Column gap={4}>
                    <Row gap={8} align="center">
                      <FolderCheck size={16} color={theme.colors.fg} />
                      <P style={{ fontWeight: "bold" }}>
                        {t("welcome.existingGame")}
                      </P>
                    </Row>
                    <Muted style={{ fontSize: 12 }}>
                      {t("welcome.existingDesc")}
                    </Muted>
                  </Column>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isPicking}
                  onClick={handlePickFolder}
                  style={{ flexShrink: 0 }}
                >
                  <Row gap={6} align="center" justify="center">
                    <FolderCheck size={14} color={theme.colors.fg} />
                    {t("welcome.browse")}
                  </Row>
                </Button>
              </div>

              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  gap: 16,
                }}
              >
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <Column gap={4}>
                    <Row gap={8} align="center">
                      <Download size={16} color={theme.colors.fg} />
                      <P style={{ fontWeight: "bold" }}>
                        {t("welcome.freshInstall")}
                      </P>
                    </Row>
                    <Muted style={{ fontSize: 12 }}>
                      {t("welcome.freshDesc")}
                    </Muted>
                  </Column>
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={onNavigateInstall}
                  style={{ flexShrink: 0 }}
                >
                  <Row gap={6} align="center" justify="center">
                    <Download size={14} color={theme.colors.primaryFg} />
                    {t("welcome.install")}
                  </Row>
                </Button>
              </div>
            </Column>
          </Column>
        </View>
      </Views>
    </div>
  );
}
