import "./scripts/runtime-napi";
import { render } from "@gpuix/react";
import { initConfig } from "@/lib/config";
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
  const { config, isFirstLaunch } = await initConfig();
  discordRpc.init(config.discordRpc);
  launcherTracker.init(config.launcherPlaytimeMinutes || 0);

  const windowOptions = {
    title: `Raf-Launcher v${getLauncherVersion()}`,
    width: 700,
    height: 520,
    minWidth: 700,
    minHeight: 520,
    lowSpecMode: Boolean(config.lowPerformanceMode),
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
