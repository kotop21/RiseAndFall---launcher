import type { StyleDesc } from '@gpuix/react';
import { motion } from '@gpuix/react';
import { theme } from "../theme";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleDesc;
}

export function Switch({ checked, onCheckedChange, disabled = false, style = {} }: SwitchProps) {
  return (
    <div
      onClick={disabled ? undefined : () => onCheckedChange(!checked)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        width: 44,
        height: 24,
        borderRadius: theme.radius.full,
        backgroundColor: checked ? theme.colors.primary : theme.colors.secondary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <motion.div
        animate={{
          left: checked ? 22 : 2,
        }}
        transition={{
          duration: 0.15,
          ease: 'easeOut',
        }}
        style={{
          position: 'absolute',
          top: 2,
          width: 20,
          height: 20,
          borderRadius: theme.radius.full,
          backgroundColor: checked ? theme.colors.primaryFg : theme.colors.mutedFg,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
