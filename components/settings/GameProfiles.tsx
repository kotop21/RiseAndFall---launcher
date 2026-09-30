import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Column,
  Row,
  Label,
  Muted,
  Input,
  Button,
  Badge,
  useFileDialog,
  useToast,
  theme,
} from "@/ui";
import { Folder, RotateCcw, Check, Layers, Trash2 } from "@/icon";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import type { LauncherConfig, GameBuildProfile } from "@/lib/config/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";

export interface ProfileFormState {
  activeProfileId: string;
  gameDir: string;
  gameArg: string;
  gameProfiles: GameBuildProfile[];
}

export interface GameProfilesProps {
  config: LauncherConfig;
  formState: ProfileFormState;
  setFormState: Dispatch<SetStateAction<ProfileFormState>>;
  hasProfileChanges: boolean;
  onSaveProfiles: () => Promise<void>;
  onRevertProfiles: () => void;
}

export function GameProfiles({
  config,
  formState,
  setFormState,
  hasProfileChanges,
  onSaveProfiles,
  onRevertProfiles,
}: GameProfilesProps) {
  const { t } = useTranslation();
  const { pickFolder } = useFileDialog();
  const { toast } = useToast();

  const [isPickingFolder, setIsPickingFolder] = useState(false);

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
      let parentDir =
        current.includes("/") || current.includes("\\")
          ? current.replace(/[\\/][^\\/]+[\\/]?$/, "")
          : undefined;
      if (parentDir && /^[a-zA-Z]:$/.test(parentDir)) {
        parentDir += "\\";
      }

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

  return (
    <Column gap={16} style={{ width: "100%" }}>
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

      <Row
        gap={10}
        justify="end"
        align="center"
        style={{ width: "100%", marginTop: 2 }}
      >
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasProfileChanges}
          onClick={onRevertProfiles}
        >
          <Row gap={8} align="center">
            <RotateCcw size={14} color={theme.colors.fg} />
            {t("buttons.revert")}
          </Row>
        </Button>

        <Button
          variant="default"
          size="sm"
          disabled={!hasProfileChanges}
          onClick={onSaveProfiles}
        >
          <Row gap={8} align="center">
            <Check size={14} color={theme.colors.primaryFg} />
            {t("buttons.save")}
          </Row>
        </Button>
      </Row>
    </Column>
  );
}
