import { useState } from "react";
import { Download, FolderCheck } from "@/icon";
import { useTranslation } from "@/lib/lang";
import { hasRiseAndFallExe } from "@/lib/utils/game-files";
import { Button, Column, H2, Muted, P, Row, theme, useFileDialog, useToast } from "@/ui";

interface WelcomeChoicesProps {
  onSelectExistingGame: (gameDir: string) => Promise<void> | void;
  onNavigateInstall: () => void;
}

export function WelcomeChoices({ onSelectExistingGame, onNavigateInstall }: WelcomeChoicesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { pickFolder } = useFileDialog();
  const [isPicking, setIsPicking] = useState(false);

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
        typeof selected === "object" ? selected.isValid : await hasRiseAndFallExe(path);

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
    <Column align="center" justify="center" gap={18} style={{ maxWidth: 440, width: "100%" }}>
      <Column align="center" gap={4}>
        <H2 style={{ fontSize: 24, textAlign: "center" }}>{t("welcome.gettingStarted")}</H2>
        <Muted style={{ textAlign: "center" }}>{t("welcome.chooseMethod")}</Muted>
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
                <P style={{ fontWeight: "bold" }}>{t("welcome.existingGame")}</P>
              </Row>
              <Muted style={{ fontSize: 12 }}>{t("welcome.existingDesc")}</Muted>
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
                <P style={{ fontWeight: "bold" }}>{t("welcome.freshInstall")}</P>
              </Row>
              <Muted style={{ fontSize: 12 }}>{t("welcome.freshDesc")}</Muted>
            </Column>
          </div>

          <Button variant="default" size="sm" onClick={onNavigateInstall} style={{ flexShrink: 0 }}>
            <Row gap={6} align="center" justify="center">
              <Download size={14} color={theme.colors.primaryFg} />
              {t("welcome.install")}
            </Row>
          </Button>
        </div>
      </Column>
    </Column>
  );
}
