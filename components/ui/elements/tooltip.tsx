import type { EventPayload, MotionStyle, StyleDesc } from "@gpuix/react";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isLowSpecMode, safeMotion as motion } from "@/components/ui/motion-compat";
import { theme } from "../theme";

interface TooltipHoverContextValue {
  enter: (source: symbol) => void;
  leave: (source: symbol) => void;
}

const TooltipHoverContext = createContext<TooltipHoverContextValue | null>(null);

export interface TooltipTriggerHandlers {
  onMouseEnter?: (event: EventPayload) => void;
  onMouseLeave?: (event: EventPayload) => void;
}

/**
 * Subscribe a fill-painting UI element to an ancestor Tooltip and compose its
 * own mouse enter/leave handlers. In GPUIX, elements with a background fill or
 * positioning intercept pointer hit-testing and prevent parent wrappers from
 * receiving `onMouseEnter`/`onMouseLeave`.
 */
export function useTooltipTrigger(handlers?: TooltipTriggerHandlers): TooltipTriggerHandlers {
  const ctx = useContext(TooltipHoverContext);
  const sourceRef = useRef<symbol | null>(null);
  const getSource = useCallback(() => {
    if (sourceRef.current === null) {
      sourceRef.current = Symbol("tooltip-trigger");
    }
    return sourceRef.current;
  }, []);

  useEffect(() => {
    if (!ctx) return;
    const source = getSource();
    return () => {
      ctx.leave(source);
    };
  }, [ctx, getSource]);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const hasOwnEnter = Boolean(handlers?.onMouseEnter);
  const hasOwnLeave = Boolean(handlers?.onMouseLeave);

  const onMouseEnter = useMemo(() => {
    if (!ctx && !hasOwnEnter) return undefined;
    const source = getSource();
    return (event: EventPayload) => {
      handlersRef.current?.onMouseEnter?.(event);
      ctx?.enter(source);
    };
  }, [ctx, getSource, hasOwnEnter]);

  const onMouseLeave = useMemo(() => {
    if (!ctx && !hasOwnLeave) return undefined;
    const source = getSource();
    return (event: EventPayload) => {
      handlersRef.current?.onMouseLeave?.(event);
      ctx?.leave(source);
    };
  }, [ctx, getSource, hasOwnLeave]);

  return {
    ...(onMouseEnter ? { onMouseEnter } : {}),
    ...(onMouseLeave ? { onMouseLeave } : {}),
  };
}

function composeMouseHandlers(
  existing: ((event: EventPayload) => void) | undefined,
  extra: () => void,
): (event: EventPayload) => void {
  return (event: EventPayload) => {
    existing?.(event);
    extra();
  };
}

export type TooltipSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

const TOOLTIP_ANIMATION_DURATION = 0.15;
const TOOLTIP_SLIDE_OFFSET = 6;

interface TooltipSideConfig {
  side: "top" | "bottom" | "left" | "right";
  align: "start" | "center" | "end";
  marginKey: "marginBottom" | "marginTop" | "marginRight" | "marginLeft";
  axis: "top" | "left";
  sign: 1 | -1;
}

const TOOLTIP_SIDE_CONFIG: Record<TooltipSide, TooltipSideConfig> = {
  top: { side: "top", align: "center", marginKey: "marginBottom", axis: "top", sign: 1 },
  bottom: { side: "bottom", align: "center", marginKey: "marginTop", axis: "top", sign: -1 },
  left: { side: "left", align: "center", marginKey: "marginRight", axis: "left", sign: 1 },
  right: { side: "right", align: "center", marginKey: "marginLeft", axis: "left", sign: -1 },
  "top-start": { side: "top", align: "start", marginKey: "marginBottom", axis: "top", sign: 1 },
  "top-end": { side: "top", align: "end", marginKey: "marginBottom", axis: "top", sign: 1 },
  "bottom-start": { side: "bottom", align: "start", marginKey: "marginTop", axis: "top", sign: -1 },
  "bottom-end": { side: "bottom", align: "end", marginKey: "marginTop", axis: "top", sign: -1 },
};

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  offset?: number;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleDesc;
}

export function Tooltip({
  content,
  side = "top",
  offset = 6,
  disabled = false,
  children,
  style = {},
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeSourcesRef = useRef<Set<symbol>>(new Set());
  const wrapperSourceRef = useRef<symbol>(Symbol("tooltip-wrapper"));
  const hostChildSourceRef = useRef<symbol>(Symbol("tooltip-host-child"));
  const isDisabledOrEmpty = disabled || !content;

  const enterSource = useCallback((source: symbol) => {
    activeSourcesRef.current.add(source);
    setIsOpen(true);
  }, []);

  const leaveSource = useCallback((source: symbol) => {
    activeSourcesRef.current.delete(source);
    if (activeSourcesRef.current.size === 0) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isDisabledOrEmpty) {
      activeSourcesRef.current.clear();
      setIsOpen(false);
    }
  }, [isDisabledOrEmpty]);

  const hoverContext = useMemo(
    () => ({ enter: enterSource, leave: leaveSource }),
    [enterSource, leaveSource],
  );

  if (isDisabledOrEmpty) {
    return <>{children}</>;
  }

  const sideCfg = TOOLTIP_SIDE_CONFIG[side] ?? TOOLTIP_SIDE_CONFIG.top;
  const margin: StyleDesc = { [sideCfg.marginKey]: offset };
  const lowSpec = isLowSpecMode();
  const initialMotion: MotionStyle = {
    opacity: 0,
    [sideCfg.axis]: sideCfg.sign * TOOLTIP_SLIDE_OFFSET,
  };
  const animateMotion: MotionStyle = {
    opacity: 1,
    [sideCfg.axis]: 0,
  };

  const renderedChildren =
    Children.count(children) === 1 &&
    isValidElement<Record<string, unknown>>(children) &&
    typeof children.type === "string"
      ? cloneElement(children, {
          onMouseEnter: composeMouseHandlers(
            children.props.onMouseEnter as ((event: EventPayload) => void) | undefined,
            () => enterSource(hostChildSourceRef.current),
          ),
          onMouseLeave: composeMouseHandlers(
            children.props.onMouseLeave as ((event: EventPayload) => void) | undefined,
            () => leaveSource(hostChildSourceRef.current),
          ),
        })
      : children;

  return (
    <TooltipHoverContext.Provider value={hoverContext}>
      <div
        onMouseEnter={() => enterSource(wrapperSourceRef.current)}
        onMouseLeave={() => leaveSource(wrapperSourceRef.current)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          ...style,
        }}
      >
        {renderedChildren}
        {isOpen && (
          <anchored
            side={sideCfg.side}
            align={sideCfg.align}
            style={{
              position: "absolute",
              ...margin,
            }}
          >
            <motion.div
              initial={lowSpec ? false : initialMotion}
              animate={animateMotion}
              transition={{ duration: TOOLTIP_ANIMATION_DURATION, ease: "easeOut" }}
              style={{
                position: "relative",
                backgroundColor: theme.colors.popover,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 8,
                paddingRight: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {typeof content === "string" ? (
                <text
                  style={{
                    fontFamily: theme.fontFamily,
                    color: theme.colors.popoverFg,
                    fontSize: 12,
                    userSelect: "none",
                  }}
                >
                  {content}
                </text>
              ) : (
                content
              )}
            </motion.div>
          </anchored>
        )}
      </div>
    </TooltipHoverContext.Provider>
  );
}
