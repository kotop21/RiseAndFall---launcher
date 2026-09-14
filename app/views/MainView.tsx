import { useState, useEffect } from "react";
import {
  Row,
  Column,
  Badge,
  H1,
  Muted,
  Separator,
  ScrollArea,
  theme,
} from "@/ui";
import { Tag, Layers } from "@/icon";
import { UpdateList } from "@/components/UpdateList";
import { OpenGameFolderButton } from "@/components/OpenGameFolderButton";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { hasDgVoodooCplExe } from "@/lib/utils/game-files";
import { getLauncherVersion } from "@/lib/utils/version";

const QUOTES = [
  "«Command from above. Conquer on foot.»",
  "«Lead from the front, or die with the rest.»",
  "«Glory belongs to the victor!»",
  "«For honor and the empire!»",
  "«Stand firm, warriors of antiquity!»",
];

const rawVersion = getLauncherVersion().trim().replace(/^v/i, "");
const launcherLabel = `Launcher v${rawVersion}`;

interface MainViewProps {
  gameDir?: string;
}

export function MainView({ gameDir = "" }: MainViewProps) {
  const [isDgVoodooReady, setIsDgVoodooReady] = useState(false);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const exists = await hasDgVoodooCplExe(gameDir);
      if (isMounted) {
        setIsDgVoodooReady(exists);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [gameDir]);

  return (
    <ScrollArea
      direction="vertical"
      style={{
        flexGrow: 1,
        width: "100%",
        height: "100%",
      }}
    >
      <Column
        gap={20}
        style={{
          width: "100%",
          padding: 24,
        }}
      >
        <Column gap={10} style={{ width: "100%" }}>
          <H1 style={{ color: theme.colors.fg }}>
            Rise And Fall: Civilization at War
          </H1>

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
                {isDgVoodooReady ? "dgVoodoo Ready" : "dgVoodoo Missing"}
              </Row>
            </Badge>
          </Row>

          <Muted>{quote}</Muted>
        </Column>

        <Separator orientation="horizontal" />

        <Row justify="start" gap={10} align="center" style={{ width: "100%" }}>
          <OpenGameFolderButton gameDir={gameDir} label="Open Game Directory" />
          <OpenDgVoodooButton gameDir={gameDir} />
        </Row>

        <Separator orientation="horizontal" />

        <UpdateList />
      </Column>
    </ScrollArea>
  );
}
