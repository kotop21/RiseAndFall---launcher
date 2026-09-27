import { ScrollArea, Column, Row, H2, Muted, Button, Separator, theme } from "@/ui";
import { ArrowLeft } from "@/icon";
import { GameInstaller } from "@/components/install";
import { useTranslation } from "@/lib/lang";

interface InstallViewProps {
  defaultInstallPath?: string;
  isReinstall?: boolean;
  onInstalled?: (installedPath: string) => void;
  onCancel?: () => void;
}

export function InstallView({
  defaultInstallPath = "",
  isReinstall = false,
  onInstalled,
  onCancel,
}: InstallViewProps) {
  const { t } = useTranslation();

  return (
    <ScrollArea
      direction="vertical"
      style={{ flexGrow: 1, width: "100%", height: "100%" }}
    >
      <Column gap={20} style={{ width: "100%", padding: 24 }}>
        <Row gap={12} align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            style={{ width: 36, height: 36, paddingLeft: 0, paddingRight: 0 }}
          >
            <ArrowLeft size={18} color={theme.colors.fg} />
          </Button>
          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>
              {isReinstall
                ? t("install.titleReinstall")
                : t("install.titleInstall")}
            </H2>
            <Muted>
              {isReinstall
                ? t("install.subReinstall")
                : t("install.subInstall")}
            </Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        <GameInstaller
          defaultInstallPath={defaultInstallPath}
          isReinstall={isReinstall}
          onInstalled={onInstalled}
          onCancel={onCancel}
        />
      </Column>
    </ScrollArea>
  );
}
