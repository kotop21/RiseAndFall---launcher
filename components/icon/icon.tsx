import type { StyleDesc } from "@gpuix/react";
import * as icons from "lucide-static";

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleDesc;
}

export type PresetIconProps = Omit<IconProps, "name">;

export function Icon({
  name,
  size = 16,
  color = "#fafafa",
  style = {},
}: IconProps) {
  const source = icons[name] as string | undefined;

  if (!source) {
    return null;
  }

  return (
    <svg
      source={source}
      style={{
        width: size,
        height: size,
        color,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
