import type { StyleDesc } from "@gpuix/react";
import { Row, P, theme } from "@/ui";
import { Download, RefreshCw } from "@/icon";

interface DownloadGameButtonProps {
  variant?: "download" | "reinstall";
  size?: "default" | "sm" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  style?: StyleDesc;
}

export function DownloadGameButton({
  variant = "download",
  size = "lg",
  onClick,
  disabled = false,
  style,
}: DownloadGameButtonProps) {
  const isReinstall = variant === "reinstall";
  const iconColor = disabled ? theme.colors.mutedFg : theme.colors.primaryFg;
  const textColor = disabled ? theme.colors.mutedFg : theme.colors.primaryFg;

  const h = size === "sm" ? 36 : 46;
  const px = size === "sm" ? 16 : 24;

  return (
    <div
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        height: h,
        paddingLeft: px,
        paddingRight: px,
        borderRadius: theme.radius.md,
        backgroundColor: disabled ? theme.colors.muted : theme.colors.primary,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: disabled
          ? undefined
          : { backgroundColor: theme.colors.primaryHover },
        active: disabled ? undefined : { opacity: 0.9 },
        ...style,
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
          {isReinstall ? "Reinstall Game" : "Download Game"}
        </P>
      </Row>
    </div>
  );
}
