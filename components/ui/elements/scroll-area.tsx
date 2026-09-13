import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";

export interface ScrollAreaProps {
  children: ReactNode;
  direction?: "vertical" | "horizontal" | "both";
  style?: StyleDesc;
}

export function ScrollArea({
  children,
  direction = "vertical",
  style = {},
}: ScrollAreaProps) {
  const overflowStyle: StyleDesc =
    direction === "vertical"
      ? { overflowY: "scroll", overflowX: "hidden" }
      : direction === "horizontal"
      ? { overflowX: "scroll", overflowY: "hidden" }
      : { overflow: "scroll" };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        pointerEvents: "auto",
        userSelect: "none",
        ...overflowStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
