import { useState } from "react";
import {
  Column,
  Row,
  H2,
  Label,
  Muted,
  Input,
  Button,
  Separator,
  ScrollArea,
  useFileDialog,
  useToast,
  theme,
} from "@/ui";
import { ArrowLeft, Folder, RotateCcw, Check } from "@/icon";
import { OpenGameFolderButton } from "@/components/OpenGameFolderButton";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { DownloadGameButton } from "@/components/DownloadGameButton";
import type { LauncherConfig } from "@/lib/config/types";

interface SettingsViewProps {
  config: LauncherConfig;
  onChangeConfig: (nextConfig: LauncherConfig) => Promise<void> | void;
  onBack?: () => void;
  onOpenInstall?: () => void;
}

export function SettingsView({
  config,
  onChangeConfig,
  onBack,
  onOpenInstall,
}: SettingsViewProps) {
  const { pickFolder } = useFileDialog();
  const { toast } = useToast();

  const [formState, setFormState] = useState<LauncherConfig>({ ...config });
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const hasChanges =
    formState.gameDir !== config.gameDir ||
    formState.gameArg !== config.gameArg ||
    formState.launcherLang !== config.launcherLang;

  const handleBack = () => {
    if (hasChanges) {
      toast({
        title: "Unsaved Changes",
        description: "Save or revert your modifications before leaving.",
        type: "error",
      });
      return;
    }
    onBack?.();
  };

  const handleSelectGamePath = async () => {
    if (isPickingFolder) return;
    setIsPickingFolder(true);

    try {
      const current = formState.gameDir.trim();
      const parentDir =
        current.includes("/") || current.includes("\\")
          ? current.replace(/[\\/][^\\/]+[\\/]?$/, "")
          : undefined;

      const selected = await pickFolder({
        title: "Select Game Directory",
        defaultPath: parentDir || undefined,
        requiredFile: "RiseAndFall.exe",
      });

      if (!selected) return;

      const pickedPath =
        typeof selected === "object" ? selected.path : selected;
      const isValid = typeof selected === "object" ? selected.isValid : true;

      if (!isValid) {
        toast({
          title: "Invalid Game Directory",
          description: "RiseAndFall.exe not found in the selected folder.",
          type: "error",
        });
        return;
      }

      if (pickedPath) {
        setFormState((prev) => ({ ...prev, gameDir: pickedPath }));
      }
    } catch (err) {
      console.error("Settings: failed to pick folder", err);
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleRevert = () => {
    setFormState({ ...config });
  };

  const handleSave = async () => {
    await onChangeConfig(formState);
    toast({
      title: "Settings Saved",
      description: "Configuration file updated successfully.",
      type: "info",
    });
  };

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
        <Row gap={12} align="center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            style={{
              width: 36,
              height: 36,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          >
            <ArrowLeft size={18} color={theme.colors.fg} />
          </Button>
          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>Settings & Diagnostics</H2>
            <Muted>
              Manage game installation, executables, and startup hooks
            </Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        <Column gap={8} style={{ width: "100%" }}>
          <Label>Game Path</Label>
          <Row gap={8} align="center" style={{ width: "100%" }}>
            <div style={{ flexGrow: 1 }}>
              <Input
                value={formState.gameDir}
                onChange={(val) =>
                  setFormState((prev) => ({ ...prev, gameDir: val }))
                }
                placeholder="/path/to/RiseAndFall"
              />
            </div>
            <Button
              variant="secondary"
              disabled={isPickingFolder}
              onClick={handleSelectGamePath}
            >
              <Row gap={8} align="center">
                <Folder size={14} color={theme.colors.fg} />
                Browse
              </Row>
            </Button>
          </Row>
        </Column>

        <Column gap={8} style={{ width: "100%" }}>
          <Row gap={8} align="center">
            <Label>Launch Arguments</Label>
          </Row>
          <Input
            value={formState.gameArg}
            onChange={(val) =>
              setFormState((prev) => ({ ...prev, gameArg: val }))
            }
            placeholder='-datapath "Data\" -redistpath "Redist\"'
          />
          <Muted>Default engine arguments for proper resource mounting</Muted>
        </Column>

        <Row gap={10} justify="end" align="center" style={{ width: "100%" }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasChanges}
            onClick={handleRevert}
          >
            <Row gap={8} align="center">
              <RotateCcw size={14} color={theme.colors.fg} />
              Revert Changes
            </Row>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={!hasChanges}
            onClick={handleSave}
          >
            <Row gap={8} align="center">
              <Check size={14} color={theme.colors.primaryFg} />
              Save
            </Row>
          </Button>
        </Row>

        <Separator orientation="horizontal" />

        <Column gap={10} style={{ width: "100%" }}>
          <Label>Actions & Tools</Label>

          <Column gap={8} style={{ width: "100%" }}>
            <Row gap={10} align="center" style={{ width: "100%" }}>
              <div style={{ flexGrow: 1 }}>
                <OpenGameFolderButton
                  gameDir={formState.gameDir}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ flexGrow: 1 }}>
                <OpenDgVoodooButton
                  gameDir={formState.gameDir}
                  style={{ width: "100%" }}
                />
              </div>
            </Row>

            <Row gap={10} align="center" style={{ width: "100%" }}>
              <div style={{ flexGrow: 1 }}>
                <DownloadGameButton
                  variant="reinstall"
                  size="sm"
                  onClick={onOpenInstall}
                  style={{ width: "100%" }}
                />
              </div>
            </Row>
          </Column>
        </Column>
      </Column>
    </ScrollArea>
  );
}
