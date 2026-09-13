import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export type HeaderVariant = "up" | "down" | "left" | "right";

export interface HeaderProps {
  children: ReactNode;
  variant?: HeaderVariant;
  size?: number;
  style?: StyleDesc;
}

export function Header({
  children,
  variant = "up",
  size = 56,
  style = {},
}: HeaderProps) {
  const isHorizontal = variant === "up" || variant === "down";

  const positionStyles: Record<HeaderVariant, StyleDesc> = {
    up: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: size,
      borderBottomWidth: 1,
      borderColor: theme.colors.border,
    },
    down: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: size,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    left: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: size,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
    },
    right: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: size,
      borderLeftWidth: 1,
      borderColor: theme.colors.border,
    },
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: isHorizontal ? 16 : 8,
        paddingRight: isHorizontal ? 16 : 8,
        paddingTop: isHorizontal ? 8 : 16,
        paddingBottom: isHorizontal ? 8 : 16,
        backgroundColor: theme.colors.bg,
        pointerEvents: "auto",
        ...positionStyles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
