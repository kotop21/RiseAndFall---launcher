import type { MotionDivProps, PublicInstance } from "@gpuix/react";
import { motion as gpuixMotion } from "@gpuix/react";
import React from "react";

let lowSpecEnabled = false;

export function setLowSpecMode(enabled: boolean) {
  lowSpecEnabled = enabled;
}

export function isLowSpecMode(): boolean {
  return lowSpecEnabled;
}

const FallbackDiv = React.forwardRef<PublicInstance, MotionDivProps>(
  ({ initial: _initial, animate, transition: _transition, style, children, ...props }, ref) => {
    const finalStyle = {
      ...style,
      ...(typeof animate === "object" ? animate : {}),
    };

    return (
      <div ref={ref} style={finalStyle} {...props}>
        {children}
      </div>
    );
  },
);

FallbackDiv.displayName = "MotionFallbackDiv";

export const safeMotion = {
  div: React.forwardRef<PublicInstance, MotionDivProps>((props, ref) => {
    if (lowSpecEnabled) {
      return <FallbackDiv ref={ref} {...props} />;
    }
    const GpuixMotionDiv = gpuixMotion.div;
    return <GpuixMotionDiv ref={ref} {...props} />;
  }),
};
