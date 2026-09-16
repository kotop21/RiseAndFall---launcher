import { useEffect, useState } from "react";
import { Column, Row, Card, Badge, P, Muted, Button, Skeleton, useToast, theme } from "@/ui";
import { ExternalLink } from "@/icon";
import { fetchReleases, getCachedReleases } from "@/lib/github/releases";
import { openBrowser } from "@/lib/browser/open";
import type { ReleaseItem } from "@/lib/github/types";
import { formatErrorToast } from "@/lib/errors";

export function UpdateList() {
  const { toast } = useToast();
  const cached = getCachedReleases();
  const [releases, setReleases] = useState<ReleaseItem[]>(() => cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let isMounted = true;

    fetchReleases()
      .then((data) => {
        if (isMounted) {
          setReleases(data);
          setIsLoading(false);
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

  const handleOpenRelease = async (url: string) => {
    try {
      if (!(await openBrowser(url))) {
        toast({
          title: "Browser Error",
          description: "Failed to launch default web browser for changelog link.",
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
                <Skeleton style={{ width: 58, height: 22, borderRadius: theme.radius.sm }} />
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
                  <Skeleton style={{ width: 90, height: 22, borderRadius: theme.radius.sm }} />
                )}
                <Skeleton style={{ width: 28, height: 28, borderRadius: theme.radius.md }} />
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
                {isLatest && <Badge variant="success">Latest Update</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenRelease(release.url)}
                  style={{ width: 28, height: 28, paddingLeft: 0, paddingRight: 0 }}
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
