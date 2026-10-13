import "./scripts/runtime-napi";
import { render } from "@gpuix/react";
import { initConfig } from "@/lib/config";
import { getDevArgs } from "@/lib/dev/cli";
import { discordRpc } from "@/lib/discord-rpc";
import { initLogger, logger } from "@/lib/logger";
import { installationManager } from "@/lib/manager/install";
import { launcherTracker } from "@/lib/process/launcher-tracker";
import { setupAdaptiveRenderer } from "@/lib/render/frame-loop";
import { getLauncherVersion } from "@/lib/utils/version";
import { App } from "./app/App";
import { ErrorBoundary } from "./components/ErrorBoundary";

initLogger(getLauncherVersion());

async function main() {
  const devArgs = getDevArgs();
  const { config, isFirstLaunch } = await initConfig();
  discordRpc.init(config.discordRpc);
  launcherTracker.init(config.launcherPlaytimeMinutes || 0);

  const windowOptions = {
    title: `Raf-Launcher v${getLauncherVersion()}`,
    width: 720,
    height: 590,
    minWidth: 720,
    minHeight: 590,
    lowSpecMode: Boolean(config.lowPerformanceMode || (devArgs.isDev && devArgs.lowSpec)),
  };

  const { renderer, startLoop } = setupAdaptiveRenderer(windowOptions);

  render(
    <ErrorBoundary>
      <App initialConfig={config} isFirstLaunch={isFirstLaunch} />
    </ErrorBoundary>,
    {
      renderer,
      ...windowOptions,
    },
  );

  startLoop({
    onTerminated: () => {
      installationManager.abort();
      process.exit(0);
    },
  });
}

main().catch((err) => {
  logger.error("fatal", "startup error", err);
});
