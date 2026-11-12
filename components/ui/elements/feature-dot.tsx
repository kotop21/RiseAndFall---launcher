import type { StyleDesc } from "@gpuix/react";
import { isLowSpecMode, safeMotion as motion } from "@/components/ui/motion-compat";
import { theme } from "@/components/ui/theme";

export interface FeatureDotProps {
  isFadingOut?: boolean;
  style?: StyleDesc;
}

export function FeatureDot({ isFadingOut = false, style = {} }: FeatureDotProps) {
  const lowSpec = isLowSpecMode();

  return (
    <motion.div
      style={{
        width: 7,
        height: 7,
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.accent,
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: "none",
        flexShrink: 0,
        ...style,
      }}
      initial={lowSpec ? false : { opacity: 0 }}
      animate={{
        opacity: isFadingOut ? 0 : 1,
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    />
  );
}
