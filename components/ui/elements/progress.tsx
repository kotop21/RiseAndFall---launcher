import type { StyleDesc } from "@gpuix/react";
import { useEffect, useRef, useState } from "react";
import { isLowSpecMode } from "../motion-compat";
import { theme } from "../theme";

export type ProgressVariant = "default" | "success" | "destructive" | "warning";

export interface ProgressProps {
  /** Current progress value between 0 and max. */
  value?: number;
  /** Maximum value corresponding to 100% (defaults to 100). */
  max?: number;
  /** Semantic color variant for the progress fill. */
  variant?: ProgressVariant;
  /** Height of the progress track in pixels (defaults to 8). */
  height?: number;
  /** Transition duration in milliseconds for smooth value updates (defaults to 220ms). */
  durationMs?: number;
  /** Optional style overrides for the track container. */
  style?: StyleDesc;
  /** Optional style overrides for the filled indicator bar. */
  indicatorStyle?: StyleDesc;
}

const DEFAULT_ANIMATION_MS = 220;
const FRAME_INTERVAL_MS = 16;

const VARIANT_COLORS: Record<ProgressVariant, string> = {
  default: theme.colors.primary,
  success: theme.colors.successFg,
  destructive: theme.colors.destructiveHover,
  warning: theme.colors.warning,
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Rounded horizontal progress bar with globally smooth fill transitions.
 */
export function Progress({
  value = 0,
  max = 100,
  variant = "default",
  height = 8,
  durationMs = DEFAULT_ANIMATION_MS,
  style = {},
  indicatorStyle = {},
}: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const targetRatio = Math.max(0, Math.min(1, safeValue / safeMax));

  const [displayRatio, setDisplayRatio] = useState(targetRatio);
  const currentRatioRef = useRef(targetRatio);

  useEffect(() => {
    if (isLowSpecMode() || durationMs <= 0) {
      currentRatioRef.current = targetRatio;
      setDisplayRatio(targetRatio);
      return;
    }

    const fromRatio = currentRatioRef.current;
    if (Math.abs(fromRatio - targetRatio) < 0.001) {
      currentRatioRef.current = targetRatio;
      setDisplayRatio(targetRatio);
      return;
    }

    const startTime = performance.now();
    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const nextRatio = fromRatio + (targetRatio - fromRatio) * easeOutCubic(progress);

      currentRatioRef.current = nextRatio;
      setDisplayRatio(nextRatio);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, FRAME_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [targetRatio, durationMs]);

  const fillColor = VARIANT_COLORS[variant];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height,
        backgroundColor: theme.colors.popover,
        borderRadius: theme.radius.full,
        overflow: "hidden",
        ...style,
      }}
    >
      {displayRatio > 0 && (
        <div
          style={{
            flexGrow: displayRatio,
            height,
            backgroundColor: fillColor,
            borderRadius: theme.radius.full,
            ...indicatorStyle,
          }}
        />
      )}
      {displayRatio < 1 && (
        <div
          style={{
            flexGrow: 1 - displayRatio,
            height,
          }}
        />
      )}
    </div>
  );
}
