import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { getDevArgs } from "@/lib/dev/cli";
import { ALL_CURRENT_FEATURE_IDS } from "./generated-features";
import { type FeatureDevOverrides, isBadgeUnseen } from "./logic";

export interface FeatureBadgeContextValue {
  seenBadges: string[];
  isBadgeUnseen: (featureId: string | undefined | null) => boolean;
  markBadgeSeen: (featureId: string) => void;
}

const FeatureBadgeContext = createContext<FeatureBadgeContextValue | null>(null);

export interface FeatureBadgeProviderProps {
  children: ReactNode;
  seenBadges: string[];
  onSeenChange?: (nextSeen: string[]) => Promise<void> | void;
  allFeatures?: string[];
}

export function FeatureBadgeProvider({
  children,
  seenBadges,
  onSeenChange,
  allFeatures = ALL_CURRENT_FEATURE_IDS,
}: FeatureBadgeProviderProps) {
  const [localSeen, setLocalSeen] = useState<string[]>(seenBadges);
  const devArgs = getDevArgs();

  // If unreadBadges is passed via devArgs, maintain a mutable set in state so dismissing works live
  const [devUnreadSet, setDevUnreadSet] = useState<Set<string> | undefined>(() => {
    if (devArgs.isDev && devArgs.unreadBadges && devArgs.unreadBadges.length > 0) {
      return new Set(devArgs.unreadBadges);
    }
    return undefined;
  });

  const effectiveSeen = seenBadges ?? localSeen;

  const devOverrides: FeatureDevOverrides = useMemo(() => {
    if (!devArgs.isDev) return {};
    return {
      showAll: devArgs.showAllBadges,
      reset: devArgs.resetBadges,
      unreadIds: devUnreadSet,
    };
  }, [devArgs.isDev, devArgs.showAllBadges, devArgs.resetBadges, devUnreadSet]);

  const checkUnseen = useCallback(
    (featureId: string | undefined | null): boolean => {
      return isBadgeUnseen(featureId, effectiveSeen, allFeatures, devOverrides);
    },
    [effectiveSeen, allFeatures, devOverrides],
  );

  const markBadgeSeen = useCallback(
    (featureId: string) => {
      const trimmed = featureId.trim();
      if (!trimmed) return;

      if (devUnreadSet?.has(trimmed)) {
        setDevUnreadSet((prev) => {
          if (!prev) return prev;
          const nextSet = new Set(prev);
          nextSet.delete(trimmed);
          return nextSet;
        });
      }

      if (effectiveSeen.includes(trimmed)) return;

      const next = [...effectiveSeen, trimmed];
      setLocalSeen(next);
      onSeenChange?.(next);
    },
    [devUnreadSet, effectiveSeen, onSeenChange],
  );

  const value = useMemo(
    () => ({
      seenBadges: effectiveSeen,
      isBadgeUnseen: checkUnseen,
      markBadgeSeen,
    }),
    [effectiveSeen, checkUnseen, markBadgeSeen],
  );

  return <FeatureBadgeContext.Provider value={value}>{children}</FeatureBadgeContext.Provider>;
}

export function useFeatures(): FeatureBadgeContextValue {
  const ctx = useContext(FeatureBadgeContext);
  if (!ctx) {
    return {
      seenBadges: [],
      isBadgeUnseen: () => false,
      markBadgeSeen: () => {},
    };
  }
  return ctx;
}
