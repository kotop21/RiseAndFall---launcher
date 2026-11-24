import { describe, expect, it } from "bun:test";
import { BASELINE_2_0_0_BADGES } from "@/lib/features/baseline";
import { ALL_CURRENT_FEATURE_IDS } from "@/lib/features/generated-features";
import { getChildPrefix, isBadgeUnseen } from "@/lib/features/logic";

describe("Features: Hierarchy & Child Prefix", () => {
  it("maps known parent identifiers to correct child prefixes", () => {
    expect(getChildPrefix("header.settings")).toBe("settings.");
    expect(getChildPrefix("settings")).toBe("settings.");
    expect(getChildPrefix("header.mods")).toBe("mods.");
    expect(getChildPrefix("mods")).toBe("mods.");
    expect(getChildPrefix("custom.section")).toBe("custom.section.");
    expect(getChildPrefix("already.prefixed.")).toBe("already.prefixed.");
  });
});

describe("Features: isBadgeUnseen Logic & Bubbling", () => {
  const mockFeatures = [
    "header.settings",
    "settings.profiles",
    "settings.integrations.discord",
    "settings.actions.delete",
    "header.mods",
    "main.profiles",
  ];

  it("identifies a leaf feature as unseen when not present in seenBadges", () => {
    const seen: string[] = [];
    expect(isBadgeUnseen("settings.actions.delete", seen, mockFeatures)).toBe(true);

    const seenAfter = ["settings.actions.delete"];
    expect(isBadgeUnseen("settings.actions.delete", seenAfter, mockFeatures)).toBe(false);
  });

  it("handles parent bubbling: parent is unseen if any child is unseen", () => {
    // If settings.actions.delete is unseen:
    const seen = ["header.settings", "settings.profiles", "settings.integrations.discord"];
    // header.settings is already in seen, but its child settings.actions.delete is NOT
    expect(isBadgeUnseen("header.settings", seen, mockFeatures)).toBe(true);

    // Now mark the child as seen:
    const seenAll = [...seen, "settings.actions.delete"];
    expect(isBadgeUnseen("header.settings", seenAll, mockFeatures)).toBe(false);
  });

  it("respects dev override showAll", () => {
    const seen = ["header.mods", "settings.profiles"];
    expect(isBadgeUnseen("header.mods", seen, mockFeatures)).toBe(false);

    expect(isBadgeUnseen("header.mods", seen, mockFeatures, { showAll: true })).toBe(true);
  });

  it("respects dev override reset (empty seenBadges simulation)", () => {
    const seen = ["header.mods", "settings.profiles"];
    expect(isBadgeUnseen("header.mods", seen, mockFeatures, { reset: true })).toBe(true);
  });

  it("respects dev override unreadIds", () => {
    const seen = ["header.mods", "settings.profiles"];
    expect(
      isBadgeUnseen("header.mods", seen, mockFeatures, {
        unreadIds: new Set(["header.mods"]),
      }),
    ).toBe(true);
  });

  it("bubbles up unread status to parent when using unreadIds override", () => {
    const seen = ["header.settings", "settings.profiles", "settings.integrations.discord"];
    const unreadIds = new Set(["settings.profiles"]);
    // header.settings is parent to settings.profiles
    expect(isBadgeUnseen("header.settings", seen, mockFeatures, { unreadIds })).toBe(true);
    expect(isBadgeUnseen("settings.profiles", seen, mockFeatures, { unreadIds })).toBe(true);
    expect(isBadgeUnseen("settings.integrations.discord", seen, mockFeatures, { unreadIds })).toBe(
      false,
    );
  });
});

describe("Features: Baseline & Migration Specs", () => {
  it("ensures BASELINE_2_0_0_BADGES contains 2.0.0/2.0.1 features and excludes 2.0.2 new features", () => {
    // 2.0.0/2.0.1 features
    expect(BASELINE_2_0_0_BADGES).toContain("header.settings");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.profiles");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.profiles.browse");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.profiles.revert");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.profiles.save");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.language");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.actions");
    expect(BASELINE_2_0_0_BADGES).toContain("settings.integrations.discord");
    expect(BASELINE_2_0_0_BADGES).toContain("welcome.browse");
    expect(BASELINE_2_0_0_BADGES).toContain("welcome.install");

    // Strictly new 2.0.2 features must NOT be in baseline
    expect(BASELINE_2_0_0_BADGES).not.toContain("header.mods");
    expect(BASELINE_2_0_0_BADGES).not.toContain("settings.actions.freshInstall");
    expect(BASELINE_2_0_0_BADGES).not.toContain("settings.profiles.delete");
    expect(BASELINE_2_0_0_BADGES).not.toContain("settings.profiles.reinstall");
  });

  it("ensures migrating user has 2.0.2 badges active and 2.0.1 features inactive", () => {
    const migratingSeenBadges = [...BASELINE_2_0_0_BADGES];
    const allFeatures = [...ALL_CURRENT_FEATURE_IDS];

    // Older 2.0.1 leaf features must NOT show a badge
    expect(isBadgeUnseen("settings.profiles.browse", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("settings.profiles.save", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("settings.profiles.revert", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("settings.actions.dgvoodoo", migratingSeenBadges, allFeatures)).toBe(
      false,
    );
    expect(isBadgeUnseen("settings.language", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("welcome.browse", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("welcome.install", migratingSeenBadges, allFeatures)).toBe(false);
    expect(isBadgeUnseen("settings.integrations.discord", migratingSeenBadges, allFeatures)).toBe(
      false,
    );

    // New 2.0.2 features MUST show a badge
    expect(isBadgeUnseen("header.mods", migratingSeenBadges, allFeatures)).toBe(true);
    expect(isBadgeUnseen("settings.actions.freshInstall", migratingSeenBadges, allFeatures)).toBe(
      true,
    );
    expect(isBadgeUnseen("settings.profiles.delete", migratingSeenBadges, allFeatures)).toBe(true);
    expect(isBadgeUnseen("settings.profiles.reinstall", migratingSeenBadges, allFeatures)).toBe(
      true,
    );

    // header.settings bubbles up because it has unread children in 2.0.2
    expect(isBadgeUnseen("header.settings", migratingSeenBadges, allFeatures)).toBe(true);
  });

  it("ensures new user (Variant 1: clean start) has all badges inactive", () => {
    const newUserSeenBadges = [...ALL_CURRENT_FEATURE_IDS];
    for (const feat of ALL_CURRENT_FEATURE_IDS) {
      expect(isBadgeUnseen(feat, newUserSeenBadges, ALL_CURRENT_FEATURE_IDS)).toBe(false);
    }
  });

  it("marks clicked feature seen immediately so returning to the view displays no badge", () => {
    const initialSeen = [...BASELINE_2_0_0_BADGES];
    const targetFeature = "settings.actions.freshInstall";

    // Before click: target is unread
    expect(isBadgeUnseen(targetFeature, initialSeen, ALL_CURRENT_FEATURE_IDS)).toBe(true);

    // Click occurs: feature is synchronously appended to seen list
    const updatedSeen = [...initialSeen, targetFeature];

    // After click: target is read immediately, even before unmount/remount
    expect(isBadgeUnseen(targetFeature, updatedSeen, ALL_CURRENT_FEATURE_IDS)).toBe(false);
  });
});
