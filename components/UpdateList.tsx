import { useEffect, useState } from "react";
import {
  Column,
  Row,
  Card,
  Badge,
  P,
  Muted,
  Button,
  Skeleton,
  useToast,
  theme,
} from "@/ui";
import { ExternalLink } from "@/icon";
import { fetchReleases, getCachedReleases } from "@/lib/github/releases";
import { openBrowser } from "@/lib/browser/open";
import type { ReleaseItem } from "@/lib/github/types";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { getLauncherVersion } from "@/lib/utils/version";
import { updateLauncher, isDifferentVersion } from "@/lib/updater";

let hasNotifiedUpdate = false;

export function UpdateList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const cached = getCachedReleases();
  const [releases, setReleases] = useState<ReleaseItem[]>(() => cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgressText, setUpdateProgressText] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    fetchReleases()
      .then((data) => {
        if (isMounted) {
          setReleases(data);
          setIsLoading(false);

          if (!hasNotifiedUpdate && data.length > 0) {
            const latest = data[0];
            const currentVer = getLauncherVersion();
            if (isDifferentVersion(latest.version, currentVer)) {
              hasNotifiedUpdate = true;
              toast({
                title: t("toasts.updateAvailableTitle"),
                description: t("toasts.updateAvailableDesc").replace(
                  "{version}",
                  latest.version,
                ),
                type: "info",
                duration: 4000,
              });
            }
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoading(false);
          toast(formatErrorToast(err, "GITHUB_API_FAILED"));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdate = async (release: ReleaseItem) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateProgressText(t("buttons.updating"));

    toast({
      title: t("toasts.updateDownloadingTitle"),
      description: t("toasts.updateDownloadingDesc").replace(
        "{version}",
        release.version,
      ),
      type: "info",
      duration: 3500,
    });

    try {
      const result = await updateLauncher(release, {
        onProgress: (p) => {
          if (p.phase === "downloading" && p.percent !== undefined) {
            setUpdateProgressText(`${p.percent}%`);
          } else if (p.phase === "extracting") {
            setUpdateProgressText(t("buttons.updating"));
          }
        },
      });

      if (!result.success) {
        toast({
          title: t("toasts.updateErrorTitle"),
          description: result.error || t("toasts.updateErrorDesc"),
          type: "error",
        });
        setIsUpdating(false);
        setUpdateProgressText(null);
        return;
      }

      if (result.isDev) {
        toast({
          title: t("toasts.updateDevSuccessTitle"),
          description: t("toasts.updateDevSuccessDesc"),
          type: "info",
          duration: 4000,
        });
        setIsUpdating(false);
        setUpdateProgressText(null);
      } else {
        toast({
          title: t("toasts.updateSuccessTitle"),
          description: t("toasts.updateSuccessDesc"),
          type: "info",
          duration: 5000,
        });
      }
    } catch (err: any) {
      toast({
        title: t("toasts.updateErrorTitle"),
        description: err?.message || t("toasts.updateErrorDesc"),
        type: "error",
      });
      setIsUpdating(false);
      setUpdateProgressText(null);
    }
  };

  const handleOpenRelease = async (url: string) => {
    try {
      if (!(await openBrowser(url))) {
        toast({
          title: t("toasts.browserErrorTitle"),
          description: t("toasts.browserErrorDesc"),
          type: "error",
        });
      }
    } catch (err) {
      toast(formatErrorToast(err, "BROWSER_FAILED"));
    }
  };

  if (isLoading && releases.length === 0) {
    return (
      <Column
        gap={8}
        style={{
          width: "100%",
          paddingTop: 0,
          paddingBottom: 15,
          paddingLeft: 15,
          paddingRight: 15,
        }}
      >
        {[0, 1, 2].map((idx) => (
          <Card
            key={idx}
            style={{
              padding: 10,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <Row justify="between" align="center" style={{ width: "100%" }}>
              <Row gap={12} align="center">
                <Skeleton
                  style={{
                    width: 58,
                    height: 22,
                    borderRadius: theme.radius.sm,
                  }}
                />
                <Skeleton
                  style={{
                    width: idx === 0 ? 160 : 120,
                    height: 16,
                    borderRadius: theme.radius.sm,
                  }}
                />
              </Row>
              <Row gap={8} align="center">
                {idx === 0 && (
                  <Skeleton
                    style={{
                      width: 90,
                      height: 26,
                      borderRadius: theme.radius.md,
                    }}
                  />
                )}
                <Skeleton
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.md,
                  }}
                />
              </Row>
            </Row>
          </Card>
        ))}
      </Column>
    );
  }

  return (
    <Column
      gap={8}
      style={{
        width: "100%",
        paddingTop: 0,
        paddingBottom: 15,
        paddingLeft: 15,
        paddingRight: 15,
      }}
    >
      {releases.map((release, index) => {
        const isLatest = index === 0;

        return (
          <Card
            key={release.version}
            style={{
              padding: 10,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            }}
          >
            <Row justify="between" align="center" style={{ width: "100%" }}>
              <Row gap={12} align="center">
                <Badge variant="secondary">{release.version}</Badge>
                {release.title &&
                  (isLatest ? (
                    <P style={{ fontWeight: "bold" }}>{release.title}</P>
                  ) : (
                    <Muted>{release.title}</Muted>
                  ))}
              </Row>

              <Row gap={8} align="center">
                {isLatest && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => handleUpdate(release)}
                    style={{
                      height: 26,
                      paddingLeft: 10,
                      paddingRight: 10,
                    }}
                  >
                    {isUpdating
                      ? updateProgressText || t("buttons.updating")
                      : t("buttons.update")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenRelease(release.url)}
                  style={{
                    width: 28,
                    height: 28,
                    paddingLeft: 0,
                    paddingRight: 0,
                  }}
                >
                  <ExternalLink size={14} />
                </Button>
              </Row>
            </Row>
          </Card>
        );
      })}
    </Column>
  );
}
