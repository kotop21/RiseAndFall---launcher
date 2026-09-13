import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "default" | "lg" | "icon";

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  style?: StyleDesc;
}

export function Button({
  children,
  variant = "default",
  size = "default",
  disabled = false,
  onClick,
  style = {},
}: ButtonProps) {
  const sizes: Record<
    ButtonSize,
    { h: number; px: number; fontSize: number; isIcon?: boolean }
  > = {
    sm: { h: 32, px: 12, fontSize: 12 },
    default: { h: 36, px: 16, fontSize: 14 },
    lg: { h: 40, px: 32, fontSize: 14 },
    icon: { h: 36, px: 0, fontSize: 14, isIcon: true },
  };

  const variants: Record<
    ButtonVariant,
    { bg: string; text: string; hoverBg: string; border?: string }
  > = {
    default: {
      bg: theme.colors.primary,
      text: theme.colors.primaryFg,
      hoverBg: theme.colors.primaryHover,
    },
    secondary: {
      bg: theme.colors.secondary,
      text: theme.colors.secondaryFg,
      hoverBg: theme.colors.secondaryHover,
    },
    outline: {
      bg: "transparent",
      text: theme.colors.fg,
      hoverBg: theme.colors.accent,
      border: theme.colors.border,
    },
    ghost: {
      bg: "transparent",
      text: theme.colors.fg,
      hoverBg: theme.colors.accent,
    },
    destructive: {
      bg: theme.colors.destructive,
      text: theme.colors.destructiveFg,
      hoverBg: theme.colors.destructiveHover,
    },
  };

  const s = sizes[size];
  const v = variants[variant];

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
        height: s.h,
        width: s.isIcon ? s.h : undefined,
        paddingLeft: s.px,
        paddingRight: s.px,
        borderRadius: theme.radius.md,
        backgroundColor: disabled ? theme.colors.muted : v.bg,
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border ?? "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        hover: disabled ? undefined : { backgroundColor: v.hoverBg },
        active: disabled ? undefined : { opacity: 0.9 },
        ...style,
      }}
    >
      <text
        style={{
          fontFamily: theme.fontFamily,
          color: disabled ? theme.colors.mutedFg : v.text,
          fontSize: s.fontSize,
          fontWeight: "normal",
          userSelect: "none",
        }}
      >
        {children}
      </text>
    </div>
  );
}
