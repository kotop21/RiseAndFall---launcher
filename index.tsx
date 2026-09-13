import { render } from "@gpuix/react";
import { initConfig } from "@/lib/config";
import { App } from "./app/App";

async function main() {
  const config = await initConfig();

  render(<App initialConfig={config} />, {
    title: "Launcher",
    width: 700,
    height: 520,
    minWidth: 700,
    minHeight: 520,
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
});
