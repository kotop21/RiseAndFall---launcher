import type { StyleDesc } from "@gpuix/react";
import { Download, RefreshCw } from "@/icon";
import { useTranslation } from "@/lib/lang";
import { P, Row, theme } from "@/ui";
import { isLowSpecMode } from "./ui/motion-compat";

interface DownloadGameButtonProps {
  variant?: "download" | "reinstall";
  size?: "default" | "sm" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  isInstalling?: boolean;
  style?: StyleDesc;
  pressAnimation?: boolean;
}

export function DownloadGameButton({
  variant = "download",
  size = "lg",
  onClick,
  disabled = false,
  isInstalling = false,
  style = {},
  pressAnimation = true,
}: DownloadGameButtonProps) {
  const { t } = useTranslation();
  const isReinstall = variant === "reinstall";
  const isSecondaryStyle = isInstalling && !disabled;
  const iconColor = disabled
    ? theme.colors.mutedFg
    : isSecondaryStyle
      ? theme.colors.secondaryFg
      : theme.colors.primaryFg;
  const textColor = disabled
    ? theme.colors.mutedFg
    : isSecondaryStyle
      ? theme.colors.secondaryFg
      : theme.colors.primaryFg;

  const buttonText = isInstalling
    ? t("install.processing")
    : isReinstall
      ? t("buttons.reinstall")
      : t("buttons.download");

  const h = size === "sm" ? 36 : 46;
  const px = size === "sm" ? 16 : 24;

  const shouldAnimate = pressAnimation && !isLowSpecMode();
  const baseTop = typeof style.top === "number" ? style.top : 0;
  const bg = disabled
    ? theme.colors.muted
    : isSecondaryStyle
      ? theme.colors.secondary
      : theme.colors.primary;
  const hoverBg = isSecondaryStyle ? theme.colors.secondaryHover : theme.colors.primaryHover;

  const activeStyle: Omit<StyleDesc, "hover" | "active"> = {
    backgroundColor: hoverBg,
    ...(shouldAnimate ? { top: baseTop + 1 } : {}),
    ...(style.active || {}),
  };

  return (
    <div
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      style={{
        position: style.position ?? "relative",
        top: baseTop,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        height: h,
        paddingLeft: px,
        paddingRight: px,
        borderRadius: theme.radius.md,
        backgroundColor: bg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: disabled
          ? undefined
          : {
              backgroundColor: hoverBg,
              ...(style.hover || {}),
            },
        ...style,
        active: disabled ? undefined : activeStyle,
      }}
    >
      <Row gap={isReinstall ? 8 : 10} align="center" justify="center">
        {isReinstall ? (
          <RefreshCw size={size === "sm" ? 14 : 18} color={iconColor} />
        ) : (
          <Download size={size === "sm" ? 14 : 18} color={iconColor} />
        )}
        <P
          style={{
            color: textColor,
            fontWeight: "bold",
            fontSize: size === "sm" ? 12 : 14,
          }}
        >
          {buttonText}
        </P>
      </Row>
    </div>
  );
}
