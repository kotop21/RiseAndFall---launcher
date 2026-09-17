import { render } from "@gpuix/react";
import { initConfig } from "@/lib/config";
import { initLogger, logger } from "@/lib/logger";
import { getLauncherVersion } from "@/lib/utils/version";
import { App } from "./app/App";

initLogger(getLauncherVersion());

async function main() {
  const { config, isFirstLaunch } = await initConfig();

  render(<App initialConfig={config} isFirstLaunch={isFirstLaunch} />, {
    title: "Rise and Fall Launcher",
    width: 700,
    height: 520,
    minWidth: 700,
    minHeight: 520,
  });
}

main().catch((err) => {
  logger.error("fatal", "startup error", err);
});
