import { useState, useEffect } from "react";
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
  Badge,
  useFileDialog,
  useToast,
  theme,
} from "@/ui";
import {
  NavigationRoot,
  SegmentedNav,
} from "@/components/ui/elements/navigation";
import {
  ArrowLeft,
  Folder,
  RotateCcw,
  Check,
  Globe,
  Layers,
  Trash2,
} from "@/icon";
import { OpenGameFolderButton } from "@/components/OpenGameFolderButton";
import { OpenDgVoodooButton } from "@/components/OpenDgVoodooButton";
import { DownloadGameButton } from "@/components/DownloadGameButton";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import type { LauncherConfig } from "@/lib/config/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";

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
  const { t } = useTranslation();
  const { pickFolder } = useFileDialog();
  const { toast } = useToast();

  const [formState, setFormState] = useState<LauncherConfig>({
    ...config,
    gameProfiles: config.gameProfiles?.length ? [...config.gameProfiles] : [],
  });
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [showTopSave, setShowTopSave] = useState(false);

  useEffect(() => {
    setFormState({
      ...config,
      gameProfiles: config.gameProfiles?.length ? [...config.gameProfiles] : [],
    });
  }, [config]);

  const hasContentChanges =
    JSON.stringify(formState.gameProfiles) !==
      JSON.stringify(config.gameProfiles) ||
    formState.activeProfileId !== config.activeProfileId ||
    formState.launcherLang !== config.launcherLang;

  const handleBack = () => {
    if (hasContentChanges) {
      setShowTopSave(true);
      toast({
        title: t("settings.unsavedTitle"),
        description: t("settings.unsavedDesc"),
        type: "warn",
      });
      return;
    }
    onBack?.();
  };

  const handleSelectSlot = (slotId: string) => {
    if (slotId === formState.activeProfileId) return;

    const targetProfile = formState.gameProfiles.find((p) => p.id === slotId);
    setFormState((prev) => ({
      ...prev,
      activeProfileId: slotId,
      gameDir: targetProfile?.path || "",
      gameArg: targetProfile?.gameArg || prev.gameArg,
    }));
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
        title: t("settings.gamePath"),
        defaultPath: parentDir,
        requiredFile: "RiseAndFall.exe",
      });

      if (!selected) return;

      const pickedPath =
        typeof selected === "object" ? selected.path : selected;
      const isValid = typeof selected === "object" ? selected.isValid : true;

      if (!isValid) {
        toast({
          title: t("toasts.welcomeMissingTitle"),
          description: t("toasts.welcomeMissingDesc"),
          type: "error",
        });
        return;
      }

      if (pickedPath) {
        const updatedProfiles = formState.gameProfiles.map((prof) => {
          if (prof.id === formState.activeProfileId) {
            return { ...prof, path: pickedPath };
          }
          return prof;
        });

        setFormState((prev) => ({
          ...prev,
          gameDir: pickedPath,
          gameProfiles: updatedProfiles,
        }));
      }
    } catch (err) {
      toast(formatErrorToast(err, "FS_ACCESS_DENIED"));
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleClearCurrentSlot = () => {
    const configuredCount = formState.gameProfiles.filter((p) =>
      Boolean(p.path?.trim()),
    ).length;

    if (configuredCount <= 1) {
      return;
    }

    const updatedProfiles = formState.gameProfiles.map((prof) => {
      if (prof.id === formState.activeProfileId) {
        return { ...prof, path: "" };
      }
      return prof;
    });

    const nextConfigured = updatedProfiles.find((p) => Boolean(p.path?.trim()));
    const nextSlotId = nextConfigured
      ? nextConfigured.id
      : formState.activeProfileId;
    const nextTarget = updatedProfiles.find((p) => p.id === nextSlotId);

    setFormState((prev) => ({
      ...prev,
      gameProfiles: updatedProfiles,
      activeProfileId: nextSlotId,
      gameDir: nextTarget?.path || "",
      gameArg: nextTarget?.gameArg || prev.gameArg,
    }));
  };

  const handleRevert = () => {
    const defaultActiveId = config.activeProfileId || "slot-1";
    const baseTarget = config.gameProfiles?.find((p) => p.id === defaultActiveId);

    setShowTopSave(false);
    setFormState({
      ...config,
      activeProfileId: defaultActiveId,
      gameDir: baseTarget?.path || "",
      gameArg: baseTarget?.gameArg || config.gameArg,
      gameProfiles: config.gameProfiles ? [...config.gameProfiles] : [],
    });
  };

  const handleSave = async () => {
    try {
      const activeProf = formState.gameProfiles.find(
        (p) => p.id === formState.activeProfileId,
      );
      const toSave: LauncherConfig = {
        ...formState,
        gameDir: activeProf?.path || "",
        gameArg: activeProf?.gameArg || formState.gameArg,
      };
      await onChangeConfig(toSave);
      setShowTopSave(false);
      onBack?.();
    } catch (err) {
      toast(formatErrorToast(err, "CONFIG_WRITE_FAILED"));
    }
  };

  const activeSlotIndex = Math.max(
    0,
    formState.gameProfiles.findIndex((p) => p.id === formState.activeProfileId),
  );
  const activeSlotLabel = t("settings.slotLabel").replace(
    "{n}",
    String(activeSlotIndex + 1),
  );
  const activeProfile = formState.gameProfiles[activeSlotIndex];
  const isSlotConfigured = Boolean(activeProfile?.path?.trim());
  const configuredCount = formState.gameProfiles.filter((p) =>
    Boolean(p.path?.trim()),
  ).length;
  const canDeleteProfile = isSlotConfigured && configuredCount > 1;

  const langNavItems = [
    { id: "en", label: "English" },
    { id: "ru", label: "Русский" },
    { id: "ua", label: "Українська" },
  ];

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
            onClick={handleBack}
            style={{ width: 36, height: 36, paddingLeft: 0, paddingRight: 0 }}
          >
            <ArrowLeft size={18} color={theme.colors.fg} />
          </Button>

          {showTopSave && hasContentChanges && (
            <Button variant="default" size="sm" onClick={handleSave}>
              <Row gap={8} align="center">
                <Check size={14} color={theme.colors.primaryFg} />
                {t("settings.save")}
              </Row>
            </Button>
          )}

          <Column gap={2}>
            <H2 style={{ color: theme.colors.fg }}>{t("settings.title")}</H2>
            <Muted>{t("settings.subtitle")}</Muted>
          </Column>
        </Row>

        <Separator orientation="horizontal" />

        <Column gap={10} style={{ width: "100%" }}>
          <Row justify="between" align="center" style={{ width: "100%" }}>
            <Row gap={8} align="center">
              <Layers size={14} color={theme.colors.mutedFg} />
              <Label>{t("settings.buildsTitle")}</Label>
              <Badge variant={isSlotConfigured ? "success" : "secondary"}>
                {activeSlotLabel}
              </Badge>
            </Row>

            <ProfileSwitcher
              profiles={formState.gameProfiles}
              activeProfileId={formState.activeProfileId || "slot-1"}
              onSelectProfile={handleSelectSlot}
            />
          </Row>
          <Muted style={{ fontSize: 12 }}>{t("settings.buildsDesc")}</Muted>
        </Column>

        <Column gap={8} style={{ width: "100%" }}>
          <Row justify="between" align="center" style={{ width: "100%" }}>
            <Label>{t("settings.gamePath")}</Label>
            {canDeleteProfile && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearCurrentSlot}
                style={{
                  width: 32,
                  height: 32,
                  paddingLeft: 0,
                  paddingRight: 0,
                  backgroundColor: theme.colors.destructive,
                }}
              >
                <Trash2 size={15} color={theme.colors.destructiveFg} />
              </Button>
            )}
          </Row>

          <Row gap={8} align="center" style={{ width: "100%" }}>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <Input
                value={formState.gameDir}
                onChange={(val) => {
                  const updatedProfiles = formState.gameProfiles.map((p) =>
                    p.id === formState.activeProfileId
                      ? { ...p, path: val }
                      : p,
                  );
                  setFormState((prev) => ({
                    ...prev,
                    gameDir: val,
                    gameProfiles: updatedProfiles,
                  }));
                }}
                placeholder={t("settings.setPathFirst")}
              />
            </div>
            <Button
              variant="secondary"
              disabled={isPickingFolder}
              onClick={handleSelectGamePath}
            >
              <Row gap={8} align="center">
                <Folder size={14} color={theme.colors.fg} />
                {t("settings.browse")}
              </Row>
            </Button>
          </Row>
        </Column>

        <Column gap={8} style={{ width: "100%" }}>
          <Row justify="between" align="center" style={{ width: "100%" }}>
            <Label>{t("settings.launchArgs")}</Label>
            <Badge variant="outline" style={{ fontSize: 11 }}>
              {activeSlotLabel}
            </Badge>
          </Row>
          <Input
            value={formState.gameArg}
            onChange={(val) => {
              const updatedProfiles = formState.gameProfiles.map((p) =>
                p.id === formState.activeProfileId ? { ...p, gameArg: val } : p,
              );
              setFormState((prev) => ({
                ...prev,
                gameArg: val,
                gameProfiles: updatedProfiles,
              }));
            }}
            placeholder='-datapath "Data\\" -redistpath "Redist\\"'
          />
          <Muted>
            {t("settings.launchArgsProfileHint").replace(
              "{profile}",
              activeSlotLabel,
            )}
          </Muted>
        </Column>

        <Separator
          orientation="horizontal"
          style={{ marginTop: 6, marginBottom: 2 }}
        />

        <Column gap={8} style={{ width: "100%" }}>
          <Row gap={8} align="center">
            <Globe size={14} color={theme.colors.mutedFg} />
            <Label>{t("settings.language")}</Label>
          </Row>
          <NavigationRoot
            value={formState.launcherLang || "en"}
            onValueChange={(val) =>
              setFormState((prev) => ({ ...prev, launcherLang: val }))
            }
          >
            <SegmentedNav
              items={langNavItems}
              itemWidth={100}
              itemHeight={32}
            />
          </NavigationRoot>
        </Column>

        <Row
          gap={10}
          justify="end"
          align="center"
          style={{ width: "100%", marginTop: 4 }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasContentChanges}
            onClick={handleRevert}
          >
            <Row gap={8} align="center">
              <RotateCcw size={14} color={theme.colors.fg} />
              {t("settings.revert")}
            </Row>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={!hasContentChanges}
            onClick={handleSave}
          >
            <Row gap={8} align="center">
              <Check size={14} color={theme.colors.primaryFg} />
              {t("settings.save")}
            </Row>
          </Button>
        </Row>

        <Separator orientation="horizontal" />

        <Column gap={10} style={{ width: "100%" }}>
          <Label>{t("settings.actions")}</Label>

          <Row gap={10} align="center" style={{ width: "100%" }}>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <OpenGameFolderButton
                gameDir={formState.gameDir}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <OpenDgVoodooButton
                gameDir={formState.gameDir}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ flexGrow: 1, minWidth: 0 }}>
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
    </ScrollArea>
  );
}
