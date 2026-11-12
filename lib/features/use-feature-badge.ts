import { useCallback, useEffect, useRef, useState } from "react";
import { useFeatures } from "./context";

export interface UseFeatureBadgeOptions {
  hoverDelayMs?: number;
  fadeDurationMs?: number;
}

export function useFeatureBadge(featureId?: string | null, options: UseFeatureBadgeOptions = {}) {
  const { hoverDelayMs = 1300, fadeDurationMs = 250 } = options;
  const { isBadgeUnseen, markBadgeSeen } = useFeatures();

  const [isFadingOut, setIsFadingOut] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = Boolean(featureId && isBadgeUnseen(featureId));

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const triggerDismiss = useCallback(() => {
    if (!featureId || !active || isFadingOut) return;

    setIsFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      markBadgeSeen(featureId);
      setIsFadingOut(false);
    }, fadeDurationMs);
  }, [featureId, active, isFadingOut, markBadgeSeen, fadeDurationMs]);

  const handleMouseEnter = useCallback(() => {
    if (!featureId || !active || isFadingOut) return;

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      triggerDismiss();
    }, hoverDelayMs);
  }, [featureId, active, isFadingOut, triggerDismiss, hoverDelayMs]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!featureId || !active) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    triggerDismiss();
  }, [featureId, active, triggerDismiss]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    showBadge: active || isFadingOut,
    isFadingOut,
    badgeHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    },
  };
}
