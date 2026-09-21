import { createRenderer, type GpuixRenderer } from "@gpuix/react";
import { setLowSpecMode } from "@/components/ui/motion-compat";

interface FrameLoopOptions {
  onTerminated?: () => void;
  lowSpecMode?: boolean;
}

export function setupAdaptiveRenderer(windowOptions: {
  title: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  lowSpecMode?: boolean;
}) {
  let lastActivityTime = performance.now();

  const handleEvent = (_event: any) => {
    lastActivityTime = performance.now();
  };

  const renderer = createRenderer(handleEvent) as GpuixRenderer;
  renderer.init(windowOptions);

  const isLowSpec = Boolean(
    windowOptions.lowSpecMode ||
    process.env.RAF_LOW_SPEC === "1" ||
    process.argv.includes("--low-spec")
  );

  if (isLowSpec) {
    setLowSpecMode(true);
  }

  const startLoop = (options: FrameLoopOptions = {}) => {
    if (!renderer.requiresTick()) {
      return { stop: () => {} };
    }

    let timer: any = null;
    let stopped = false;

    const stop = () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };

    const loop = () => {
      if (stopped) return;

      const started = performance.now();
      const running = renderer.tick();

      if (running === false) {
        stop();
        options.onTerminated?.();
        return;
      }

      const elapsed = performance.now() - started;
      const isIdle = performance.now() - lastActivityTime > 1200;

      // Глобальная адаптивная частота кадров:
      // При взаимодействии: 60 FPS на нормальном железе, 30 FPS на ретро ПК.
      // В простое (AFK): 30 FPS на нормальном железе, 20 FPS на ретро ПК.
      let targetFrameMs: number;
      if (isLowSpec) {
        targetFrameMs = isIdle ? 50 : 33.3; // 20 FPS в AFK / 30 FPS при кликах
      } else {
        targetFrameMs = isIdle ? 33.3 : 16.6; // 30 FPS в AFK / 60 FPS при кликах
      }

      const minYield = isLowSpec ? 8 : 0;
      const wait = Math.max(minYield, targetFrameMs - elapsed);

      timer = setTimeout(loop, wait);
    };

    loop();
    return { stop };
  };

  return { renderer, startLoop };
}
