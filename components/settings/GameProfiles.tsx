import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";
import { Check, Folder, Layers, RotateCcw, Trash2 } from "@/icon";
import type { GameBuildProfile, LauncherConfig } from "@/lib/config/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import { uninstallGameProfile } from "@/lib/manager/uninstall";
import {
  Badge,
  Button,
  Column,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Muted,
  Row,
  theme,
  useFileDialog,
  useToast,
} from "@/ui";

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
  onOpenInstall?: (targetDir?: string) => void;
  onConfigChange?: (nextConfig: LauncherConfig) => Promise<void> | void;
}

export function GameProfiles({
  config,
  formState,
  setFormState,
  hasProfileChanges,
  onSaveProfiles,
  onRevertProfiles,
  onOpenInstall,
  onConfigChange,
}: GameProfilesProps) {
  const { t } = useTranslation();
  const { pickFolder } = useFileDialog();
  const { toast } = useToast();

  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

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

      const pickedPath = typeof selected === "object" ? selected.path : selected;
      const isValid = typeof selected === "object" ? selected.isValid : true;

      if (!isValid) {
        toast({
          description: t("toasts.gameMissingDesc"),
          type: "error",
        });
        return;
      }

      if (pickedPath) {
        logger.info("profile", `game path set (${formState.activeProfileId})`);
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

  const handleOpenDeleteDialog = () => {
    clearCountdown();
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = (open: boolean) => {
    if (isDeleting) return;
    if (!open) {
      clearCountdown();
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteConfirmClick = async () => {
    if (isDeleting) return;

    if (countdown === null) {
      setCountdown(3);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    if (countdown === 0) {
      setIsDeleting(true);
      try {
        const baseConfig: LauncherConfig = {
          ...config,
          activeProfileId: formState.activeProfileId,
          gameProfiles: formState.gameProfiles,
          gameDir: formState.gameDir,
          gameArg: formState.gameArg,
        };
        const res = await uninstallGameProfile(formState.activeProfileId, baseConfig);
        if (!res.success) {
          if (res.error === "CLEAN_FAILED") {
            toast({
              description: t("toasts.filesLockedDesc"),
              type: "error",
            });
          } else {
            toast({
              description: t("errors.UNKNOWN_ERROR.description"),
              type: "error",
            });
          }
          setIsDeleting(false);
          clearCountdown();
          return;
        }

        if (res.nextConfig) {
          await onConfigChange?.(res.nextConfig);

          const nextActiveId = res.nextConfig.activeProfileId;
          const nextTarget = res.nextConfig.gameProfiles.find((p) => p.id === nextActiveId);

          setFormState({
            activeProfileId: nextActiveId,
            gameDir: nextTarget?.path || "",
            gameArg: nextTarget?.gameArg || res.nextConfig.gameArg,
            gameProfiles: res.nextConfig.gameProfiles,
          });
        }

        toast({
          description: t("toasts.gameDeletedDesc"),
          type: "success",
        });

        setDeleteDialogOpen(false);
        clearCountdown();
      } catch (err) {
        toast(formatErrorToast(err, "UNKNOWN_ERROR"));
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleReinstallProfile = async () => {
    if (!isSlotConfigured || isDeleting) return;
    if (hasProfileChanges) {
      await onSaveProfiles();
    }
    onOpenInstall?.(formState.gameDir);
  };

  const getDeleteButtonText = () => {
    if (isDeleting) return t("buttons.deleting");
    if (countdown !== null && countdown > 0) {
      return t("buttons.deleteCountdown").replace("{n}", String(countdown));
    }
    return t("buttons.delete");
  };

  const activeSlotIndex = Math.max(
    0,
    formState.gameProfiles.findIndex((p) => p.id === formState.activeProfileId),
  );
  const activeSlotLabel = t("settings.slotLabel").replace("{n}", String(activeSlotIndex + 1));
  const activeProfile = formState.gameProfiles[activeSlotIndex];
  const isSlotConfigured = Boolean(activeProfile?.path?.trim());

  return (
    <Column featureId="settings.profiles" gap={16} style={{ width: "100%" }}>
      <Column gap={10} style={{ width: "100%" }}>
        <Row justify="between" align="center" style={{ width: "100%" }}>
          <Row gap={8} align="center">
            <Layers size={14} color={theme.colors.mutedFg} />
            <Label featureId="settings.profiles">{t("settings.buildsTitle")}</Label>
            <Badge variant={isSlotConfigured ? "success" : "secondary"}>{activeSlotLabel}</Badge>
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
        </Row>

        <Row gap={8} align="center" style={{ width: "100%" }}>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <Input
              value={formState.gameDir}
              onChange={(val) => {
                const updatedProfiles = formState.gameProfiles.map((p) =>
                  p.id === formState.activeProfileId ? { ...p, path: val } : p,
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
            featureId="settings.profiles.browse"
            variant="secondary"
            disabled={isPickingFolder}
            onClick={handleSelectGamePath}
          >
            <Row gap={8} align="center">
              <Folder size={14} color={theme.colors.fg} />
              {t("buttons.browse")}
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
        <Muted>{t("settings.launchArgsProfileHint").replace("{profile}", activeSlotLabel)}</Muted>
      </Column>

      <Row
        justify="between"
        align="center"
        style={{ width: "100%", marginTop: 2, flexWrap: "wrap", gap: 10 }}
      >
        <Row gap={8} align="center">
          <Button
            featureId="settings.profiles.delete"
            variant="destructive"
            size="sm"
            disabled={!isSlotConfigured || isDeleting}
            onClick={handleOpenDeleteDialog}
          >
            <Row gap={6} align="center">
              <Trash2 size={14} color={theme.colors.destructiveFg} />
              {t("buttons.deleteGame")}
            </Row>
          </Button>

          <Button
            featureId="settings.profiles.reinstall"
            variant="outline"
            size="sm"
            disabled={!isSlotConfigured || isDeleting}
            onClick={handleReinstallProfile}
          >
            <Row gap={6} align="center">
              <RotateCcw size={14} color={theme.colors.fg} />
              {t("buttons.reinstall")}
            </Row>
          </Button>
        </Row>

        <Row gap={10} align="center">
          <Button
            featureId="settings.profiles.revert"
            variant="secondary"
            size="sm"
            disabled={!hasProfileChanges || isDeleting}
            onClick={onRevertProfiles}
          >
            <Row gap={8} align="center">
              <RotateCcw size={14} color={theme.colors.fg} />
              {t("buttons.revert")}
            </Row>
          </Button>

          <Button
            featureId="settings.profiles.save"
            variant="default"
            size="sm"
            disabled={!hasProfileChanges || isDeleting}
            onClick={onSaveProfiles}
          >
            <Row gap={8} align="center">
              <Check size={14} color={theme.colors.primaryFg} />
              {t("buttons.save")}
            </Row>
          </Button>
        </Row>
      </Row>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={handleCloseDeleteDialog}
        width={480}
        minWidth={360}
        maxWidth={540}
      >
        <DialogHeader>
          <Row gap={8} align="center" style={{ flexGrow: 1, minWidth: 0, flexWrap: "wrap" }}>
            <DialogTitle>{t("settings.deleteDialogTitle")}</DialogTitle>
            <Badge variant="secondary">{activeSlotLabel}</Badge>
          </Row>
          {!isDeleting && <DialogClose />}
        </DialogHeader>

        <DialogDescription>{t("settings.deleteDialogDesc")}</DialogDescription>

        <DialogBody>
          <Column gap={8} style={{ width: "100%" }}>
            <div
              style={{
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 12,
                paddingRight: 12,
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.sm,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Muted style={{ fontSize: 13, color: theme.colors.fg }}>{formState.gameDir}</Muted>
            </div>
          </Column>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            disabled={isDeleting}
            onClick={() => handleCloseDeleteDialog(false)}
          >
            {t("install.cancel")}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting || (countdown !== null && countdown > 0)}
            onClick={handleDeleteConfirmClick}
            style={{ minWidth: 120 }}
          >
            <Row gap={6} align="center">
              <Trash2 size={14} color={theme.colors.destructiveFg} />
              {getDeleteButtonText()}
            </Row>
          </Button>
        </DialogFooter>
      </Dialog>
    </Column>
  );
}
