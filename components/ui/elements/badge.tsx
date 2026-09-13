import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  maxChars?: number;
  style?: StyleDesc;
}

export function Badge({
  children,
  variant = "default",
  maxChars = 24,
  style = {},
}: BadgeProps) {
  const variants: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    default: { bg: theme.colors.primary, text: theme.colors.primaryFg },
    secondary: { bg: theme.colors.secondary, text: theme.colors.secondaryFg },
    outline: { bg: "transparent", text: theme.colors.fg, border: theme.colors.border },
    destructive: { bg: theme.colors.destructive, text: theme.colors.destructiveFg },
    success: { bg: theme.colors.success, text: "#ffffff" },
  };

  const v = variants[variant];

  let rawString = "";
  if (typeof children === "string" || typeof children === "number") {
    rawString = String(children);
  } else if (Array.isArray(children)) {
    rawString = children
      .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
      .join("");
  }

  let formatted = rawString.trim();
  if (formatted.length > maxChars) {
    formatted = formatted.slice(0, maxChars).trimEnd() + "...";
  }

  const words = formatted.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        height: 22,
        paddingLeft: 10,
        paddingRight: 10,
        gap: 4,
        borderRadius: theme.radius.full,
        backgroundColor: v.bg,
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border ?? "transparent",
        flexShrink: 0,
        ...style,
      }}
    >
      {words.length > 0 ? (
        words.map((word, idx) => (
          <text
            key={idx}
            style={{
              fontFamily: theme.fontFamily,
              color: v.text,
              fontSize: 12,
              fontWeight: "bold",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {word}
          </text>
        ))
      ) : (
        <text
          style={{
            fontFamily: theme.fontFamily,
            color: v.text,
            fontSize: 12,
            fontWeight: "bold",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {children}
        </text>
      )}
    </div>
  );
}
