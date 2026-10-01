import { DonateButton } from "@/components/DonateButton";
import { GameStatusHeader } from "@/components/main";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { UpdateList } from "@/components/UpdateList";
import type { LauncherConfig } from "@/lib/config/types";
import { Column, Row, ScrollArea, Separator } from "@/ui";

interface MainViewProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function MainView({ config, onChangeConfig }: MainViewProps) {
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
          <OpenDgVoodooButton gameDir={config.gameDir} />
          <DonateButton />
        </Row>

        <Separator orientation="horizontal" />

        <UpdateList />
      </Column>
    </ScrollArea>
  );
}
