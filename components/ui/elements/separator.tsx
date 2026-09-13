import type { StyleDesc } from '@gpuix/react';
import { theme } from "../theme";

export function Separator({
  orientation = 'horizontal',
  style = {},
}: {
  orientation?: 'horizontal' | 'vertical';
  style?: StyleDesc;
}) {
  const isHoriz = orientation === 'horizontal';
  return (
    <div
      style={{
        width: isHoriz ? '100%' : 1,
        height: isHoriz ? 1 : '100%',
        backgroundColor: theme.colors.border,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
