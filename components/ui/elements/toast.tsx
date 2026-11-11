import type { StyleDesc } from "@gpuix/react";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { safeMotion as motion } from "@/components/ui/motion-compat";
import { AlertTriangle, CircleCheck, Info, X, XCircle } from "@/icon";
import { theme } from "../theme";
import { Button } from "./button";

export type ToastType = "info" | "error" | "warn" | "success";

export type ToastPosition =
  | "top-center"
  | "top-left"
  | "top-right"
  | "bottom-center"
  | "bottom-left"
  | "bottom-right";

export interface ToastItem {
  id: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastOptions {
  description: string;
  type?: ToastType;
  duration?: number;
}

let toastInteracting = false;
let toastResetTimer: ReturnType<typeof setTimeout> | null = null;

export function isToastActive(): boolean {
  return toastInteracting;
}

export function markToastInteraction() {
  toastInteracting = true;
  if (toastResetTimer) {
    clearTimeout(toastResetTimer);
  }
  toastResetTimer = setTimeout(() => {
    toastInteracting = false;
    toastResetTimer = null;
  }, 400);
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  removeToast: () => void;
  setPosition: (pos: ToastPosition) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export interface ToastProviderProps {
  children: ReactNode;
  defaultPosition?: ToastPosition;
}

export function ToastProvider({ children, defaultPosition = "top-right" }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);
  const [animStage, setAnimStage] = useState<"initial" | "entered" | "exiting">("initial");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    markToastInteraction();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAnimStage("exiting");

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = setTimeout(() => {
      setCurrentToast(null);
      setAnimStage("initial");
    }, 220);
  }, []);

  const currentToastRef = useRef<ToastItem | null>(null);
  currentToastRef.current = currentToast;

  const toast = useCallback(
    ({ description, type = "info", duration = 3500 }: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (animFrameRef.current) {
        clearTimeout(animFrameRef.current);
        animFrameRef.current = null;
      }

      const id = Math.random().toString(36).substring(2, 9);
      const newItem: ToastItem = { id, description, type, duration };

      if (currentToastRef.current) {
        setAnimStage("exiting");
        exitTimerRef.current = setTimeout(() => {
          setCurrentToast(newItem);
          setAnimStage("initial");

          animFrameRef.current = setTimeout(() => {
            setAnimStage("entered");
          }, 16);

          if (duration > 0) {
            timerRef.current = setTimeout(() => {
              dismissToast();
            }, duration);
          }
        }, 180);
      } else {
        setCurrentToast(newItem);
        setAnimStage("initial");

        animFrameRef.current = setTimeout(() => {
          setAnimStage("entered");
        }, 16);

        if (duration > 0) {
          timerRef.current = setTimeout(() => {
            dismissToast();
          }, duration);
        }
      }
    },
    [dismissToast],
  );

  const isTop = position.startsWith("top");

  const alignStyle: StyleDesc = position.endsWith("center")
    ? { left: 0, right: 0, alignItems: "center" }
    : position.endsWith("left")
      ? { left: 20, alignItems: "flex-start" }
      : { right: 20, alignItems: "flex-end" };

  const getToastIcon = (type: ToastType = "info") => {
    switch (type) {
      case "error":
        return <XCircle size={18} color={theme.colors.destructiveHover} />;
      case "warn":
        return <AlertTriangle size={18} color={theme.colors.fg} />;
      case "success":
        return <CircleCheck size={18} color={theme.colors.fg} />;
      default:
        return <Info size={18} color={theme.colors.fg} />;
    }
  };

  const isEntered = animStage === "entered";

  const animStyles = isTop
    ? {
        top: isEntered ? 24 : 0,
        opacity: isEntered ? 1 : 0,
      }
    : {
        bottom: isEntered ? 24 : 0,
        opacity: isEntered ? 1 : 0,
      };

  return (
    <ToastContext.Provider value={{ toast, removeToast: dismissToast, setPosition }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {children}

        {currentToast ? (
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              pointerEvents: "none",
              ...alignStyle,
              ...(isTop ? { top: 0 } : { bottom: 0 }),
            }}
          >
            <motion.div
              animate={animStyles}
              transition={{
                duration: 0.22,
                ease: "easeOut",
              }}
              onMouseEnter={markToastInteraction}
              onMouseLeave={() => {
                if (toastResetTimer) clearTimeout(toastResetTimer);
                toastResetTimer = setTimeout(() => {
                  toastInteracting = false;
                  toastResetTimer = null;
                }, 100);
              }}
              onMouseDown={markToastInteraction}
              style={{
                position: "absolute",
                minWidth: 320,
                maxWidth: 560,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                overflow: "hidden",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flexGrow: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getToastIcon(currentToast.type)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flexGrow: 1,
                      minWidth: 0,
                    }}
                  >
                    <text
                      style={{
                        fontFamily: theme.fontFamily,
                        color: theme.colors.mutedFg,
                        fontSize: 13,
                        lineHeight: 18,
                        userSelect: "none",
                      }}
                    >
                      {currentToast.description}
                    </text>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    markToastInteraction();
                    dismissToast();
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.sm,
                    flexShrink: 0,
                  }}
                >
                  <X size={15} color={theme.colors.mutedFg} />
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
