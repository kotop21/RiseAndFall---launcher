import { useEffect, useState } from "react";
import { Check, Download, RefreshCw, Trash2 } from "@/icon";
import { fetchManifest, type ManifestPackage } from "@/lib/api";
import { useTranslation } from "@/lib/lang";
import { logger } from "@/lib/logger";
import {
  checkAllModsStatus,
  installMod,
  type ModInstallStatus,
  type ModsManifest,
  syncLocalModsWithDisk,
  uninstallMod,
} from "@/lib/manager/install";
import {
  Badge,
  Button,
  Column,
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  P,
  Row,
  theme,
  useToast,
} from "@/ui";

/**
 * List of mod IDs that cannot be deleted by user (only installed or updated).
 * Add any protected mod IDs here (e.g. "mod_bfm").
 */
export const NON_REMOVABLE_MOD_IDS: string[] = ["mod_bfm"];

export interface ModsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameDir?: string;
}

function formatModSize(size?: number | string): string {
  if (size === undefined || size === null || size === "") return "—";
  let bytes = 0;
  if (typeof size === "number") {
    bytes = size;
  } else {
    const clean = size.trim().toLowerCase();
    if (clean.endsWith("gb") || clean.endsWith("mb") || clean.endsWith("kb")) {
      return size.trim();
    }
    const parsed = parseFloat(clean);
    bytes = Number.isNaN(parsed) ? 0 : parsed;
  }

  if (bytes <= 0) return "0 KB";

  const ONE_KB = 1024;
  const ONE_MB = 1024 * 1024;
  const ONE_GB = 1024 * 1024 * 1024;

  if (bytes >= ONE_GB) {
    return `${(bytes / ONE_GB).toFixed(1)} GB`;
  }
  if (bytes >= ONE_MB) {
    return `${(bytes / ONE_MB).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / ONE_KB))} KB`;
}

export function ModsDialog({ open, onOpenChange, gameDir = "" }: ModsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mods, setMods] = useState<ManifestPackage[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ModInstallStatus>>({});
  const [loading, setLoading] = useState(false);
  const [activeInstallingId, setActiveInstallingId] = useState<string | null>(null);
  const [installProgressText, setInstallProgressText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);

    const initMods = async () => {
      let localConfig: ModsManifest | undefined;
      // 1. До получения манифеста проверяем физические файлы на диске и синхронизируем их с конфигурацией
      if (gameDir.trim()) {
        try {
          localConfig = await syncLocalModsWithDisk(gameDir.trim());
        } catch {}
      }

      // 2. Получаем манифест с API и сверяем данные API с локальной конфигурацией
      try {
        const manifest = await fetchManifest();
        if (!isMounted) return;

        const modPackages = (manifest.packages || []).filter((p) => p.id.startsWith("mod_"));
        setMods(modPackages);

        if (gameDir.trim()) {
          const stats = await checkAllModsStatus(gameDir.trim(), modPackages, localConfig);
          if (isMounted) setStatuses(stats);
        }
      } catch {
        if (!isMounted) return;
        toast({
          description: t("toasts.modsLoadFailedDesc"),
          type: "error",
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initMods();

    return () => {
      isMounted = false;
    };
  }, [open, gameDir, toast, t]);

  const handleToggleMod = async (mod: ManifestPackage) => {
    const cleanDir = gameDir.trim();
    if (!cleanDir) {
      toast({
        description: t("toasts.modsPathRequiredDesc"),
        type: "warn",
      });
      return;
    }

    const currentStatus = statuses[mod.id] || "not_installed";
    const isNonRemovable = NON_REMOVABLE_MOD_IDS.includes(mod.id);

    if (currentStatus === "installed") {
      if (isNonRemovable) {
        // Protected mod cannot be uninstalled
        return;
      }
      logger.info("mods", `uninstall started (${mod.id})`);
      setActiveInstallingId(mod.id);
      setInstallProgressText(t("mods.uninstalling"));
      try {
        const res = await uninstallMod(cleanDir, mod.id);
        if (res.success) {
          logger.info("mods", `uninstall ok (${mod.id})`);
          setStatuses((prev) => ({ ...prev, [mod.id]: "not_installed" }));
          toast({
            description: t("toasts.modDisabledDesc").replace("{name}", mod.name),
            type: "info",
          });
        } else {
          const errorDesc = res.error?.description || t("errors.FS_ACCESS_DENIED.description");
          logger.error("mods", `uninstall failed (${mod.id})`, errorDesc);
          toast({
            description: t("toasts.modUninstallErrorDesc").replace("{error}", errorDesc),
            type: "error",
          });
        }
      } finally {
        setActiveInstallingId(null);
        setInstallProgressText(null);
      }
      return;
    }

    const isUpdate = currentStatus === "update_available";
    const actionLabel = isUpdate ? "update" : "install";
    logger.info("mods", `${actionLabel} started (${mod.id})`);
    setActiveInstallingId(mod.id);
    setInstallProgressText(t("mods.installing"));

    try {
      const res = await installMod(cleanDir, mod, {
        onProgress: (p) => {
          if (p.percent !== undefined) {
            setInstallProgressText(`${p.percent}%`);
          } else {
            setInstallProgressText(p.message);
          }
        },
      });

      if (res.success) {
        logger.info("mods", `${actionLabel} ok (${mod.id})`);
        setStatuses((prev) => ({ ...prev, [mod.id]: "installed" }));
        toast({
          description: t("toasts.modInstalledDesc").replace("{name}", mod.name),
          type: "success",
        });
      } else {
        const errorDesc = res.error?.description || t("errors.UNKNOWN_ERROR.description");
        logger.error("mods", `${actionLabel} failed (${mod.id})`, errorDesc);
        toast({
          description: t("toasts.modInstallErrorDesc").replace("{error}", errorDesc),
          type: "error",
        });
      }
    } finally {
      setActiveInstallingId(null);
      setInstallProgressText(null);
    }
  };

  const installedCount = mods.filter((m) => statuses[m.id] === "installed").length;
  const isAnyInstalling = activeInstallingId !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width={560}
      minWidth={400}
      maxWidth={680}
      maxHeight={500}
    >
      <DialogHeader>
        <Row gap={8} align="center" style={{ flexGrow: 1, minWidth: 0, flexWrap: "wrap" }}>
          <DialogTitle>{t("mods.title")}</DialogTitle>
          <Badge variant="secondary">
            {t("mods.installedCount")
              .replace("{installed}", String(installedCount))
              .replace("{total}", String(mods.length))}
          </Badge>
        </Row>
        <DialogClose />
      </DialogHeader>

      <DialogDescription>{t("mods.description")}</DialogDescription>

      <DialogBody>
        <Column gap={10} style={{ width: "100%" }}>
          {mods.length === 0 && !loading ? (
            <Row justify="center" style={{ width: "100%", padding: 16 }}>
              <P style={{ color: theme.colors.mutedFg }}>{t("mods.noMods")}</P>
            </Row>
          ) : null}

          {mods.map((mod) => {
            const status = statuses[mod.id] || "not_installed";
            const isNonRemovable = NON_REMOVABLE_MOD_IDS.includes(mod.id);
            const isCurrentInstalling = activeInstallingId === mod.id;
            const rawSize =
              mod.size ??
              (mod as unknown as Record<string, unknown>).size_bytes ??
              (mod as unknown as Record<string, unknown>).file_size;
            const sizeStr = formatModSize(rawSize as number | string | undefined);
            const desc = mod.description?.trim() ? mod.description.trim() : t("mods.noDescription");

            return (
              <div
                key={mod.id}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: theme.colors.popover,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md,
                  padding: 12,
                  gap: 12,
                }}
              >
                <Column gap={4} style={{ flexGrow: 1, minWidth: 0 }}>
                  <Row gap={8} align="center" style={{ flexWrap: "wrap" }}>
                    <P
                      style={{
                        fontWeight: "bold",
                        fontSize: 14,
                        color: theme.colors.fg,
                      }}
                    >
                      {mod.name}
                    </P>

                    {/* Бейдж статуса слева от веса в стиле dgvoodoo */}
                    <Badge
                      variant={
                        status === "installed"
                          ? "success"
                          : status === "update_available"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {status === "installed"
                        ? t("mods.installed")
                        : status === "update_available"
                          ? t("mods.updateAvailable")
                          : t("mods.notInstalled")}
                    </Badge>

                    {/* Обычный бейдж с весом: KB если <1MB, MB если >=1MB, GB если >=1GB */}
                    <Badge variant="secondary">{sizeStr}</Badge>
                  </Row>
                  <P
                    style={{
                      fontSize: 12,
                      color: theme.colors.mutedFg,
                      lineHeight: 16,
                    }}
                  >
                    {desc}
                  </P>
                </Column>

                {status === "installed" && isNonRemovable ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={true}
                    style={{ flexShrink: 0, opacity: 0.8 }}
                  >
                    <Row gap={6} align="center">
                      <Check size={13} color={theme.colors.successFg} />
                      {t("mods.installed")}
                    </Row>
                  </Button>
                ) : (
                  <Button
                    variant={status === "installed" ? "destructive" : "default"}
                    size="sm"
                    disabled={isAnyInstalling}
                    onClick={() => handleToggleMod(mod)}
                    style={{ flexShrink: 0 }}
                  >
                    <Row gap={6} align="center">
                      {isCurrentInstalling ? (
                        installProgressText ||
                        (status === "installed" ? t("mods.uninstalling") : t("mods.installing"))
                      ) : status === "installed" ? (
                        <>
                          <Trash2 size={13} color={theme.colors.destructiveFg} />
                          {t("mods.uninstall")}
                        </>
                      ) : status === "update_available" ? (
                        <>
                          <RefreshCw size={13} color={theme.colors.fg} />
                          {t("mods.update")}
                        </>
                      ) : (
                        <>
                          <Download size={13} color={theme.colors.primaryFg} />
                          {t("mods.install")}
                        </>
                      )}
                    </Row>
                  </Button>
                )}
              </div>
            );
          })}
        </Column>
      </DialogBody>
    </Dialog>
  );
}
