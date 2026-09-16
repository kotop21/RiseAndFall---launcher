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

interface WelcomeViewProps {
  onSelectExistingGame: (gameDir: string) => Promise<void> | void;
  onNavigateInstall: () => void;
}

export function WelcomeView({
  onSelectExistingGame,
  onNavigateInstall,
}: WelcomeViewProps) {
  const { toast } = useToast();
  const { pickFolder } = useFileDialog();
  const [slide, setSlide] = useState<"greeting" | "preparing" | "choice">(
    "greeting",
  );
  const [isPicking, setIsPicking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
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
        title: "Select Game Directory",
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
          title: "Game Missing",
          description: "RiseAndFall.exe not found in selected folder.",
          type: "error",
        });
        return;
      }

      await onSelectExistingGame(path);
    } catch {
      toast({
        title: "Access Denied",
        description: "Failed to open directory picker.",
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
            <H1 style={{ fontSize: 36, textAlign: "center" }}>Hello!</H1>
            <Muted style={{ fontSize: 14 }}>Launcher by kotop21</Muted>
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
              Setting Things Up
            </H2>
            <Muted style={{ fontSize: 14 }}>
              Preparing runtime environment...
            </Muted>
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
                Getting Started
              </H2>
              <Muted style={{ textAlign: "center" }}>
                Choose how you want to set up the game files
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
                      <P style={{ fontWeight: "bold" }}>Existing Game</P>
                    </Row>
                    <Muted style={{ fontSize: 12 }}>
                      Locate an existing RiseAndFall.exe installation
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
                    Browse
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
                      <P style={{ fontWeight: "bold" }}>Fresh Install</P>
                    </Row>
                    <Muted style={{ fontSize: 12 }}>
                      Download the game pack with mods and your language
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
                    Install
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
