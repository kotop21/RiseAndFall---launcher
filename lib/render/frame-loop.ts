import { createRenderer, type EventPayload, type GpuixRenderer } from "@gpuix/react";
import { setLowSpecMode } from "@/components/ui/motion-compat";

interface FrameLoopOptions {
  onTerminated?: () => void;
  lowSpecMode?: boolean;
}

const activeBackgroundOperations = new Set<string>();
let wakeAdaptiveRenderer: (() => void) | null = null;

export function setBackgroundActivity(operationId: string, isActive: boolean): void {
  if (isActive) {
    activeBackgroundOperations.add(operationId);
  } else {
    activeBackgroundOperations.delete(operationId);
  }
  wakeAdaptiveRenderer?.();
}

export function isBackgroundActivityActive(): boolean {
  return activeBackgroundOperations.size > 0;
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
  let isThrottledSleep = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let runLoop: (() => void) | null = null;

  const wakeUp = () => {
    lastActivityTime = performance.now();
    if (isThrottledSleep && timer !== null && runLoop) {
      clearTimeout(timer);
      timer = null;
      isThrottledSleep = false;
      runLoop();
    }
  };

  wakeAdaptiveRenderer = wakeUp;

  const handleEvent = (_event: EventPayload) => {
    wakeUp();
  };

  const renderer = createRenderer(handleEvent) as GpuixRenderer;
  renderer.init(windowOptions);

  const isLowSpec = Boolean(
    windowOptions.lowSpecMode ||
      process.env.RAF_LOW_SPEC === "1" ||
      process.argv.includes("--low-spec"),
  );

  if (isLowSpec) {
    setLowSpecMode(true);
  }

  const isWin = process.platform === "win32";

  const startLoop = (options: FrameLoopOptions = {}) => {
    if (!renderer.requiresTick()) {
      return { stop: () => {} };
    }

    const stop = () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      wakeAdaptiveRenderer = null;
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
      const isIdle = performance.now() - lastActivityTime > 2000;
      const hasBgActivity = activeBackgroundOperations.size > 0;

      let targetFrameMs: number;

      if (hasBgActivity) {
        // Активная фоновая операция: держим 60 FPS для плавных прогресс-баров и анимаций
        targetFrameMs = isLowSpec ? 33.3 : 16.6;
        isThrottledSleep = false;
      } else if (isIdle) {
        if (isWin) {
          // На Windows GPUI использует нативный поток с блокирующим циклом сообщений.
          // В AFK достаточно проверять закрытие окна раз в 500 мс (0.0% CPU)
          targetFrameMs = 500;
          isThrottledSleep = true;
        } else {
          targetFrameMs = isLowSpec ? 66.6 : 33.3;
          isThrottledSleep = true;
        }
      } else {
        // Активное взаимодействие пользователя: 60 FPS (или 30 FPS в low-spec)
        targetFrameMs = isLowSpec ? 33.3 : 16.6;
        isThrottledSleep = false;
      }

      const minYield = isLowSpec && !isThrottledSleep ? 8 : 0;
      const wait = Math.max(minYield, targetFrameMs - elapsed);

      timer = setTimeout(loop, wait);
    };

    runLoop = loop;
    loop();
    return { stop };
  };

  return { renderer, startLoop };
}
