import { useEffect } from "react";
import { getDevArgs, IS_DEV_BUILD } from "@/lib/dev";
import { logger } from "@/lib/logger";

/**
 * Centralized entry point for developer UI tools (e.g. future Dev Menu / inspector overlay).
 * Automatically stripped from production builds via `scripts/build-bundle.js`.
 */
export function DevOverlay() {
  const devArgs = getDevArgs();

  useEffect(() => {
    if (IS_DEV_BUILD && devArgs.isDev && devArgs.devMenu) {
      logger.info("dev:ui", "Dev Menu flag (--dev-menu) active; DevOverlay hook mounted.");
    }
  }, [devArgs.isDev, devArgs.devMenu]);

  if (!IS_DEV_BUILD || !devArgs.isDev || !devArgs.devMenu) {
    return null;
  }

  // Extension slot: render Dev Menu UI or floating debug trigger here in the future
  return null;
}
