import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { safeMotion as motion } from "@/components/ui/motion-compat";
import { CheckIcon } from "@/icon";
import { theme } from "../theme";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  style?: StyleDesc;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  style = {},
}: CheckboxProps) {
  return (
    <div
      onClick={disabled ? undefined : () => onCheckedChange(!checked)}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        userSelect: "none",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: theme.radius.sm,
          backgroundColor: checked ? theme.colors.primary : "transparent",
          borderWidth: 1,
          borderColor: checked ? theme.colors.primary : theme.colors.border,
          pointerEvents: "none",
        }}
      >
        <motion.div
          animate={{
            opacity: checked ? 1 : 0,
          }}
          transition={{
            duration: 0.1,
            ease: "easeOut",
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckIcon size={12} color={theme.colors.primaryFg} />
        </motion.div>
      </div>
      {label ? (
        <text
          style={{
            fontFamily: theme.fontFamily,
            color: theme.colors.fg,
            fontSize: 14,
            userSelect: "none",
          }}
        >
          {label}
        </text>
      ) : null}
    </div>
  );
}
