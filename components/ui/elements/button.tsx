import type { StyleDesc } from "@gpuix/react";
import type { ReactNode } from "react";
import { isLowSpecMode } from "../motion-compat";
import { theme } from "../theme";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "default" | "lg" | "icon";

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  style?: StyleDesc;
  pressAnimation?: boolean;
}

export function Button({
  children,
  variant = "default",
  size = "default",
  disabled = false,
  onClick,
  style = {},
  pressAnimation = true,
}: ButtonProps) {
  const sizes: Record<ButtonSize, { h: number; px: number; fontSize: number; isIcon?: boolean }> = {
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
      hoverBg: theme.colors.secondaryHover,
      border: theme.colors.border,
    },
    ghost: {
      bg: "transparent",
      text: theme.colors.fg,
      hoverBg: theme.colors.secondaryHover,
    },
    destructive: {
      bg: theme.colors.destructive,
      text: theme.colors.destructiveFg,
      hoverBg: theme.colors.destructiveHover,
    },
  };

  const s = sizes[size];
  const v = variants[variant];
  const shouldAnimate = pressAnimation && !isLowSpecMode();
  const baseTop = typeof style.top === "number" ? style.top : 0;

  const activeStyle: Omit<StyleDesc, "hover" | "active"> = {
    backgroundColor: v.hoverBg,
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
        hover: disabled ? undefined : { backgroundColor: v.hoverBg, ...(style.hover || {}) },
        ...style,
        active: disabled ? undefined : activeStyle,
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
