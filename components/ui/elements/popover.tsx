import { useState, useRef, type ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { motion } from "@gpuix/react";
import { theme } from "../theme";

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverTriggerProps {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export interface PopoverProps {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  side?: PopoverSide;
  align?: PopoverAlign;
  width?: number;
  offset?: number;
  style?: StyleDesc;
}

export function Popover({
  trigger,
  children,
  side = "bottom",
  align = "start",
  width = 200,
  offset = 6,
  style,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lastClosedOutsideTime = useRef(0);

  const close = () => {
    lastClosedOutsideTime.current = Date.now();
    setIsOpen(false);
  };

  const toggle = () => {
    if (Date.now() - lastClosedOutsideTime.current < 150) {
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const open = () => setIsOpen(true);

  const getMargin = (): StyleDesc => {
    switch (side) {
      case "bottom": return { marginTop: offset };
      case "top": return { marginBottom: offset };
      case "right": return { marginLeft: offset };
      case "left": return { marginRight: offset };
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {trigger({ isOpen, toggle, open, close })}

      {isOpen && (
        <anchored
          side={side}
          align={align}
          style={{
            position: "absolute",
            ...getMargin(),
          }}
        >
          <div
            tabIndex={0}
            autoFocus
            onMouseDownOutside={close}
          >
            <motion.div
              animate={{
                opacity: 1,
              }}
              transition={{ duration: 0.12 }}
              style={{
                width,
                backgroundColor: theme.colors.popover,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.md,
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                ...style,
              }}
            >
              {children}
            </motion.div>
          </div>
        </anchored>
      )}
    </div>
  );
}

export interface PopoverItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  style?: StyleDesc;
}

export function PopoverItem({
  children,
  onClick,
  destructive = false,
  disabled = false,
  style,
}: PopoverItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 6,
        paddingBottom: 6,
        borderRadius: theme.radius.sm,
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        backgroundColor: hovered
          ? destructive
            ? theme.colors.destructive
            : theme.colors.muted
          : "transparent",
        color: destructive
          ? hovered
            ? theme.colors.destructiveFg
            : theme.colors.destructive
          : theme.colors.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        ...style,
      }}
    >
      <text
        style={{
          fontFamily: theme.fontFamily,
          color: destructive
            ? hovered
              ? theme.colors.destructiveFg
              : theme.colors.destructive
            : theme.colors.fg,
          fontSize: 13,
        }}
      >
        {children}
      </text>
    </div>
  );
}
