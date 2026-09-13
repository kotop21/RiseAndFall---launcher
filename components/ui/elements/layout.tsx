import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export function Flex({
  children,
  direction = "row",
  align = "stretch",
  justify = "start",
  gap = 0,
  style = {},
}: {
  children: ReactNode;
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  gap?: number;
  style?: StyleDesc;
}) {
  const alignMap: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };
  const justifyMap: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        alignItems: alignMap[align] as any,
        justifyContent: justifyMap[justify] as any,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Row({
  children,
  align = "center",
  justify = "start",
  gap = 8,
  style = {},
}: {
  children: ReactNode;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  gap?: number;
  style?: StyleDesc;
}) {
  return (
    <Flex direction="row" align={align} justify={justify} gap={gap} style={style}>
      {children}
    </Flex>
  );
}

export function Column({
  children,
  align = "stretch",
  justify = "start",
  gap = 8,
  style = {},
}: {
  children: ReactNode;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  gap?: number;
  style?: StyleDesc;
}) {
  return (
    <Flex direction="column" align={align} justify={justify} gap={gap} style={style}>
      {children}
    </Flex>
  );
}

export function ScreenContainer({
  children,
  padding = 24,
  style = {},
}: {
  children: ReactNode;
  padding?: number;
  style?: StyleDesc;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: theme.colors.bg,
        fontFamily: theme.fontFamily,
        minHeight: 0,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: "scroll",
          padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}
