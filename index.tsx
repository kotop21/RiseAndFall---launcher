import { launcherTracker } from "@/lib/process/launcher-tracker";
import { discordRpc } from "@/lib/discord-rpc";
import { render } from "@gpuix/react";
import { initConfig } from "@/lib/config";
import { initLogger, logger } from "@/lib/logger";
import { getLauncherVersion } from "@/lib/utils/version";
import { App } from "./app/App";

initLogger(getLauncherVersion());

async function main() {
  const { config, isFirstLaunch } = await initConfig();
  discordRpc.init(config.discordRpc);
  launcherTracker.init(config.launcherPlaytimeMinutes || 0);

  render(<App initialConfig={config} isFirstLaunch={isFirstLaunch} />, {
    title: `Raf-Launcher v${getLauncherVersion()}`,
    width: 700,
    height: 520,
    minWidth: 700,
    minHeight: 520,
  });
}

main().catch((err) => {
  logger.error("fatal", "startup error", err);
});
