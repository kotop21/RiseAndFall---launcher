import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export function H1({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 24,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function H2({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 20,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function H3({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 16,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function P({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function Muted({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.mutedFg,
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function Label({
  children,
  style = {},
}: {
  children: ReactNode;
  style?: StyleDesc;
}) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 14,
        fontWeight: "bold",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </text>
  );
}
