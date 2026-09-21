import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { StyleDesc, MotionTransition } from "@gpuix/react";
import { safeMotion as motion } from "@/components/ui/motion-compat";
import { logger } from "@/lib/logger";

let isMotionDisabledGlobal = false;

export function setDisableMotionAnimations(disabled: boolean) {
  isMotionDisabledGlobal = disabled;
}

export function isMotionAnimationsDisabled(): boolean {
  return isMotionDisabledGlobal;
}

export type ViewTransition =
  | "slide-down"
  | "slide-up"
  | "slide-left"
  | "slide-right"
  | "fade"
  | "none";

interface ViewContextType {
  activeView: string;
  setView: (id: string) => void;
  defaultTransition: ViewTransition;
  duration: number;
}

const ViewContext = createContext<ViewContextType | null>(null);

export function useViews() {
  const ctx = useContext(ViewContext);
  if (!ctx) {
    throw new Error("useViews must be used within <Views />");
  }
  return ctx;
}

export interface ViewsProps {
  value?: string;
  defaultValue?: string;
  defaultTransition?: ViewTransition;
  duration?: number;
  onValueChange?: (id: string) => void;
  children: ReactNode;
}

export function Views({
  value,
  defaultValue = "",
  defaultTransition = "fade",
  duration = 0.15,
  onValueChange,
  children,
}: ViewsProps) {
  const [internalView, setInternalView] = useState(defaultValue);
  const activeView = value !== undefined ? value : internalView;
  const prevViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeView && prevViewRef.current !== activeView) {
      logger.info("view", `switched to: ${activeView}`);
      prevViewRef.current = activeView;
    }
  }, [activeView]);

  const setView = (id: string) => {
    if (value === undefined) {
      setInternalView(id);
    }
    onValueChange?.(id);
  };

  return (
    <ViewContext.Provider
      value={{ activeView, setView, defaultTransition, duration }}
    >
      {children}
    </ViewContext.Provider>
  );
}

export interface ViewProps {
  id: string;
  transition?: ViewTransition;
  duration?: number;
  offset?: number;
  style?: StyleDesc;
  children: ReactNode;
}

export function View({
  id,
  transition,
  duration,
  offset = 20,
  style = {},
  children,
}: ViewProps) {
  const ctx = useViews();

  if (ctx.activeView !== id) {
    return null;
  }

  const selectedTransition = transition ?? ctx.defaultTransition;
  const selectedDuration = duration ?? ctx.duration;

  // Если отключены анимации или transition === "none" — рендерим чистый div
  if (isMotionDisabledGlobal || selectedTransition === "none") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  const transConfig: MotionTransition = {
    duration: selectedDuration,
    ease: "easeOut",
  };

  let initial: any = { opacity: 0 };
  let animate: any = { opacity: 1 };

  switch (selectedTransition) {
    case "slide-down":
      initial = { opacity: 0, top: -offset };
      animate = { opacity: 1, top: 0 };
      break;
    case "slide-up":
      initial = { opacity: 0, top: offset };
      animate = { opacity: 1, top: 0 };
      break;
    case "slide-left":
      initial = { opacity: 0, left: offset };
      animate = { opacity: 1, left: 0 };
      break;
    case "slide-right":
      initial = { opacity: 0, left: -offset };
      animate = { opacity: 1, left: 0 };
      break;
    case "fade":
    default:
      initial = { opacity: 0 };
      animate = { opacity: 1 };
      break;
  }

  return (
    <motion.div
      key={id}
      initial={initial}
      animate={animate}
      transition={transConfig}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export interface ViewTriggerProps {
  target: string;
  children:
    | ReactNode
    | ((props: { isActive: boolean; select: () => void }) => ReactNode);
  onClick?: () => void;
}

export function ViewTrigger({ target, children, onClick }: ViewTriggerProps) {
  const { activeView, setView } = useViews();
  const isActive = activeView === target;

  const select = () => {
    setView(target);
    onClick?.();
  };

  if (typeof children === "function") {
    return <>{children({ isActive, select })}</>;
  }

  return (
    <div onClick={select} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
