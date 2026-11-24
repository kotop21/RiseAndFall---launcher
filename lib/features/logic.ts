import { ALL_CURRENT_FEATURE_IDS } from "./generated-features";

export interface FeatureDevOverrides {
  showAll?: boolean;
  reset?: boolean;
  unreadIds?: Set<string>;
}

/**
 * Returns the child prefix for a given feature ID.
 * Standardizes common parent aliases (e.g. "header.settings" -> "settings.").
 */
export function getChildPrefix(featureId: string): string {
  const trimmed = featureId.trim();
  if (trimmed === "header.settings" || trimmed === "settings") {
    return "settings.";
  }
  if (trimmed === "header.mods" || trimmed === "mods") {
    return "mods.";
  }
  if (trimmed.endsWith(".")) {
    return trimmed;
  }
  return `${trimmed}.`;
}

/**
 * Determines whether a badge should be visible for a feature.
 * Supports hierarchical bubbling: if any child feature is unread, the parent is also considered unread.
 */
export function isBadgeUnseen(
  featureId: string | undefined | null,
  seenBadges: string[],
  allFeatures: string[] = ALL_CURRENT_FEATURE_IDS,
  devOverrides?: FeatureDevOverrides,
): boolean {
  if (!featureId) return false;

  const id = featureId.trim();
  if (!id) return false;

  // Dev CLI override: show all badges unconditionally
  if (devOverrides?.showAll) return true;

  const effectiveSeen = devOverrides?.reset ? [] : seenBadges;
  const unreadSet = devOverrides?.unreadIds;

  const isItemUnread = (targetId: string): boolean => {
    if (unreadSet && unreadSet.size > 0) {
      return unreadSet.has(targetId);
    }
    return !effectiveSeen.includes(targetId);
  };

  // Direct check for this specific element
  if (isItemUnread(id)) {
    return true;
  }

  // Hierarchical check: if this element acts as a parent to other features
  const childPrefix = getChildPrefix(id);

  // 1. Check known allFeatures
  const hasUnseenKnownChild = allFeatures.some(
    (feat) => feat.startsWith(childPrefix) && isItemUnread(feat),
  );
  if (hasUnseenKnownChild) {
    return true;
  }

  // 2. Also check if any item in unreadSet starts with childPrefix
  if (unreadSet && unreadSet.size > 0) {
    for (const unreadId of unreadSet) {
      if (unreadId.startsWith(childPrefix)) {
        return true;
      }
    }
  }

  return false;
}
