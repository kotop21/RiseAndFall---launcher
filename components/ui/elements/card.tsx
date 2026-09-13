import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export function Card({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 24,
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 18,
        fontWeight: "bold",
      }}
    >
      {children}
    </text>
  );
}

export function CardDescription({ children }: { children: ReactNode }) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.mutedFg,
        fontSize: 13,
      }}
    >
      {children}
    </text>
  );
}

export function CardContent({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, ...style }}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
