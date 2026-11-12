import type { StyleDesc } from "@gpuix/react";
import type { ReactNode } from "react";
import { useFeatureBadge } from "@/lib/features";
import { theme } from "../theme";
import { FeatureDot } from "./feature-dot";

export interface FeatureBadgeAnchorProps {
  featureId?: string;
  children: ReactNode;
  style?: StyleDesc;
}

export function FeatureBadgeAnchor({ featureId, children, style = {} }: FeatureBadgeAnchorProps) {
  const { showBadge, isFadingOut, badgeHandlers } = useFeatureBadge(featureId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
      onMouseEnter={badgeHandlers.onMouseEnter}
      onMouseLeave={badgeHandlers.onMouseLeave}
      onClick={badgeHandlers.onClick}
    >
      {children}
      {showBadge && <FeatureDot isFadingOut={isFadingOut} />}
    </div>
  );
}

export interface TypographyProps {
  children: ReactNode;
  style?: StyleDesc;
  featureId?: string;
}

export function H1({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 24,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}

export function H2({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 20,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}

export function H3({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 16,
        fontWeight: "bold",
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}

export function P({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}

export function Muted({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.mutedFg,
        fontSize: 13,
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}

export function Label({ children, style = {}, featureId }: TypographyProps) {
  const el = (
    <text
      style={{
        fontFamily: theme.fontFamily,
        color: theme.colors.fg,
        fontSize: 14,
        fontWeight: "bold",
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </text>
  );
  if (!featureId) return el;
  return <FeatureBadgeAnchor featureId={featureId}>{el}</FeatureBadgeAnchor>;
}
