import {
  NavigationRoot,
  SegmentedNav,
} from "@/components/ui/elements/navigation";
import type { GameBuildProfile } from "@/lib/config/types";

interface ProfileSwitcherProps {
  profiles: GameBuildProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onlyConfigured?: boolean;
  style?: Record<string, any>;
}

export function ProfileSwitcher({
  profiles,
  activeProfileId,
  onSelectProfile,
  onlyConfigured = false,
  style,
}: ProfileSwitcherProps) {
  const safeProfiles = profiles?.length ? profiles : [];

  if (onlyConfigured) {
    const configuredProfiles = safeProfiles.filter((p) => Boolean(p.path?.trim()));

    if (configuredProfiles.length <= 1) {
      return null;
    }

    const navItems = configuredProfiles.map((profile) => {
      const originalIndex = safeProfiles.findIndex((p) => p.id === profile.id);
      return {
        id: profile.id,
        label: `#${originalIndex + 1}`,
      };
    });

    return (
      <div style={style}>
        <NavigationRoot
          value={activeProfileId || configuredProfiles[0]?.id || "slot-1"}
          onValueChange={onSelectProfile}
        >
          <SegmentedNav
            items={navItems}
            itemWidth={46}
            itemHeight={28}
          />
        </NavigationRoot>
      </div>
    );
  }

  const lastFilledIndex = safeProfiles.reduce(
    (acc, profile, idx) => (profile.path?.trim() ? idx : acc),
    -1,
  );
  const activeSlotIndex = Math.max(
    0,
    safeProfiles.findIndex((p) => p.id === activeProfileId),
  );
  const visibleSlotsCount = Math.min(
    5,
    Math.max(1, lastFilledIndex + 2, activeSlotIndex + 1),
  );

  const slotNavItems = safeProfiles
    .slice(0, visibleSlotsCount)
    .map((profile, idx) => {
      const hasPath = Boolean(profile.path?.trim());
      return {
        id: profile.id,
        label: `#${idx + 1}${hasPath ? " •" : ""}`,
      };
    });

  return (
    <div style={style}>
      <NavigationRoot
        value={activeProfileId || "slot-1"}
        onValueChange={onSelectProfile}
      >
        <SegmentedNav
          items={slotNavItems}
          itemWidth={46}
          itemHeight={28}
        />
      </NavigationRoot>
    </div>
  );
}
