import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { motion } from "@gpuix/react";
import { theme } from "../theme";

export type ToastType = "info" | "error" | "warn";

export type ToastPosition =
  | "top-center"
  | "top-left"
  | "top-right"
  | "bottom-center"
  | "bottom-left"
  | "bottom-right";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
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

export function ToastProvider({
  children,
  defaultPosition = "bottom-right",
}: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);
  const [animStage, setAnimStage] = useState<"initial" | "entered" | "exiting">("initial");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
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

  const toast = useCallback(
    ({ title, description, type = "info", duration = 3500 }: ToastOptions) => {
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
      const newItem: ToastItem = { id, title, description, type, duration };

      if (currentToast) {
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
    [dismissToast, currentToast]
  );

  const isTop = position.startsWith("top");

  const alignStyle: StyleDesc = position.endsWith("center")
    ? { left: 0, right: 0, alignItems: "center" }
    : position.endsWith("left")
    ? { left: 20, alignItems: "flex-start" }
    : { right: 20, alignItems: "flex-end" };

  const getBarColor = (type: ToastType = "info") => {
    switch (type) {
      case "error":
        return theme.colors.destructive;
      case "warn":
        return theme.colors.warning;
      case "info":
      default:
        return theme.colors.primary;
    }
  };

  const barColor = getBarColor(currentToast?.type);
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
              style={{
                position: "absolute",
                width: 320,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
                overflow: "hidden",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  width: 4,
                  backgroundColor: barColor,
                  flexShrink: 0,
                }}
              />

              <div
                style={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flexGrow: 1,
                  }}
                >
                  <text
                    style={{
                      fontFamily: theme.fontFamily,
                      color: theme.colors.fg,
                      fontSize: 13,
                      fontWeight: "bold",
                    }}
                  >
                    {currentToast.title}
                  </text>
                  {currentToast.description ? (
                    <text
                      style={{
                        fontFamily: theme.fontFamily,
                        color: theme.colors.mutedFg,
                        fontSize: 12,
                      }}
                    >
                      {currentToast.description}
                    </text>
                  ) : null}
                </div>

                <div
                  onClick={dismissToast}
                  style={{
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <text
                    style={{
                      fontFamily: theme.fontFamily,
                      color: theme.colors.mutedFg,
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                  >
                    ✕
                  </text>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
