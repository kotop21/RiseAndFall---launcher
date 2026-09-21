import { useState, type ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { safeMotion as motion } from "@/components/ui/motion-compat";
import { theme } from "../theme";

export type TooltipSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  offset?: number;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleDesc;
}

export function Tooltip({
  content,
  side = "top",
  offset = 6,
  disabled = false,
  children,
  style = {},
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const getAnchoredProps = () => {
    switch (side) {
      case "top":
        return { side: "top" as const, align: "center" as const, margin: { marginBottom: offset } };
      case "bottom":
        return { side: "bottom" as const, align: "center" as const, margin: { marginTop: offset } };
      case "left":
        return { side: "left" as const, align: "center" as const, margin: { marginRight: offset } };
      case "right":
        return { side: "right" as const, align: "center" as const, margin: { marginLeft: offset } };
      case "top-start":
        return { side: "top" as const, align: "start" as const, margin: { marginBottom: offset } };
      case "top-end":
        return { side: "top" as const, align: "end" as const, margin: { marginBottom: offset } };
      case "bottom-start":
        return { side: "bottom" as const, align: "start" as const, margin: { marginTop: offset } };
      case "bottom-end":
        return { side: "bottom" as const, align: "end" as const, margin: { marginTop: offset } };
      default:
        return { side: "top" as const, align: "center" as const, margin: { marginBottom: offset } };
    }
  };

  const { side: anchorSide, align: anchorAlign, margin } = getAnchoredProps();

  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        ...style,
      }}
    >
      {children}
      {isOpen && (
        <anchored
          side={anchorSide}
          align={anchorAlign}
          style={{
            position: "absolute",
            ...margin,
          }}
        >
          <motion.div
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{
              backgroundColor: theme.colors.popover,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.sm,
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 8,
              paddingRight: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {typeof content === "string" ? (
              <text
                style={{
                  fontFamily: theme.fontFamily,
                  color: theme.colors.popoverFg,
                  fontSize: 12,
                  userSelect: "none",
                }}
              >
                {content}
              </text>
            ) : (
              content
            )}
          </motion.div>
        </anchored>
      )}
    </div>
  );
}
