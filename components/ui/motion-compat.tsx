import React from "react";
import { motion as gpuixMotion } from "@gpuix/react";

let lowSpecEnabled = false;

export function setLowSpecMode(enabled: boolean) {
  lowSpecEnabled = enabled;
}

export function isLowSpecMode(): boolean {
  return lowSpecEnabled;
}

const FallbackDiv = React.forwardRef<any, any>(
  ({ initial, animate, exit, transition, style, children, ...props }, ref) => {
    const finalStyle = {
      ...style,
      ...(typeof animate === "object" ? animate : {}),
    };

    return (
      <div ref={ref} style={finalStyle} {...props}>
        {children}
      </div>
    );
  }
);

FallbackDiv.displayName = "MotionFallbackDiv";

export const safeMotion = {
  div: React.forwardRef<any, any>((props, ref) => {
    if (lowSpecEnabled) {
      return <FallbackDiv ref={ref} {...props} />;
    }
    const GpuixMotionDiv = gpuixMotion.div as React.ComponentType<any>;
    return <GpuixMotionDiv ref={ref} {...props} />;
  }),
};
