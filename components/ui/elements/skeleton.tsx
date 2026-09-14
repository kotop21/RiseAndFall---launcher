import { useEffect, useState } from 'react';
import type { StyleDesc } from '@gpuix/react';
import { motion } from '@gpuix/react';
import { theme } from "../theme";

export function Skeleton({ style = {} }: { style?: StyleDesc }) {
  const [pulsed, setPulsed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsed((prev) => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      animate={{
        opacity: pulsed ? 0.35 : 0.8,
      }}
      transition={{
        duration: 0.8,
        ease: 'easeInOut',
      }}
      style={{
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.md,
        ...style,
      }}
    />
  );
}
