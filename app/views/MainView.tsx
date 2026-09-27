import { Row, Column, Separator, ScrollArea } from "@/ui";
import { UpdateList } from "@/components/UpdateList";
import { OpenGameFolderButton } from "@/components/OpenGameFolderButton";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { GameStatusHeader } from "@/components/main";
import { useTranslation } from "@/lib/lang";
import type { LauncherConfig } from "@/lib/config/types";

interface MainViewProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function MainView({ config, onChangeConfig }: MainViewProps) {
  const { t } = useTranslation();

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
        <GameStatusHeader config={config} onChangeConfig={onChangeConfig} />

        <Row justify="start" gap={10} align="center" style={{ width: "100%" }}>
          <OpenGameFolderButton
            gameDir={config.gameDir}
            label={t("main.openGameFolder")}
          />
          <OpenDgVoodooButton gameDir={config.gameDir} />
        </Row>

        <Separator orientation="horizontal" />

        <UpdateList />
      </Column>
    </ScrollArea>
  );
}
