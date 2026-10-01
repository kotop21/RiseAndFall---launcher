import type { StyleDesc } from "@gpuix/react";
import { Heart } from "@/icon";
import { openBrowser } from "@/lib/browser/open";
import { formatErrorToast } from "@/lib/errors";
import { useTranslation } from "@/lib/lang";
import { Button, Row, Tooltip, theme, useToast } from "@/ui";

const DONATE_URL = "https://ko-fi.com/kotop21#";

interface DonateButtonProps {
  style?: StyleDesc;
}

export function DonateButton({ style }: DonateButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleOpen = () => {
    try {
      if (!openBrowser(DONATE_URL)) {
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

  return (
    <Tooltip content={t("buttons.donateTooltip")} side="top">
      <Button variant="outline" size="sm" onClick={handleOpen} style={style}>
        <Row gap={8} align="center" justify="center">
          <Heart size={14} color={theme.colors.destructive} />
          {t("buttons.donate")}
        </Row>
      </Button>
    </Tooltip>
  );
}
