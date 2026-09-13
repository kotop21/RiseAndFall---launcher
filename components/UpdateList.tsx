import { useEffect, useState } from "react";
import {
  Column,
  Row,
  Card,
  Badge,
  P,
  Muted,
  Button,
  useToast,
  theme,
} from "@/ui";
import { ExternalLink } from "@/icon";
import { fetchReleases } from "@/lib/github/releases";
import { openBrowser } from "@/lib/browser/open";
import type { ReleaseItem } from "@/lib/github/types";

export function UpdateList() {
  const { toast } = useToast();
  const [releases, setReleases] = useState<ReleaseItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetchReleases().then((data) => {
      if (isMounted) {
        setReleases(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenRelease = async (url: string) => {
    const ok = await openBrowser(url);
    if (!ok) {
      toast({
        title: "Browser Error",
        description: "Failed to open default web browser.",
        type: "error",
      });
    }
  };

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
