import type { StyleDesc } from "@gpuix/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { X } from "@/icon";
import { isLowSpecMode, safeMotion as motion } from "../motion-compat";
import { theme } from "../theme";
import { Button } from "./button";
import { isToastActive } from "./toast";

type DialogListener = () => void;

class DialogStore {
  private dialogs = new Map<string, ReactNode>();
  private listeners = new Set<DialogListener>();

  subscribe = (listener: DialogListener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    return this.dialogs;
  };

  set = (id: string, node: ReactNode) => {
    this.dialogs = new Map(this.dialogs);
    this.dialogs.set(id, node);
    this.emit();
  };

  delete = (id: string) => {
    if (!this.dialogs.has(id)) return;
    this.dialogs = new Map(this.dialogs);
    this.dialogs.delete(id);
    this.emit();
  };

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const dialogStore = new DialogStore();

export function DialogHost() {
  const dialogs = useSyncExternalStore(
    dialogStore.subscribe,
    dialogStore.getSnapshot,
    dialogStore.getSnapshot,
  );

  if (dialogs.size === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      {Array.from(dialogs.values())}
    </div>
  );
}

export function DialogProvider({ children }: { children: ReactNode }) {
  return (
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
      <DialogHost />
    </div>
  );
}

interface DialogContextValue {
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within a <Dialog />");
  }
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  children?: ReactNode;
  closeOnOutsideClick?: boolean;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  style?: StyleDesc;
}

export interface DialogHeaderProps {
  children?: ReactNode;
  style?: StyleDesc;
}

export interface DialogTitleProps {
  children: ReactNode;
  style?: StyleDesc;
}

export interface DialogDescriptionProps {
  children: ReactNode;
  style?: StyleDesc;
}

export interface DialogBodyProps {
  children: ReactNode;
  style?: StyleDesc;
}

export interface DialogFooterProps {
  children: ReactNode;
  style?: StyleDesc;
}

export interface DialogCloseProps {
  children?: ReactNode;
  onClick?: () => void;
  style?: StyleDesc;
}

export function DialogTitle({ children, style = {} }: DialogTitleProps) {
  return (
    <text
      style={{
        fontFamily: theme.fontFamily,
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.fg,
        userSelect: "none",
        ...style,
      }}
    >
      {children}
    </text>
  );
}

export function DialogDescription({ children, style = {} }: DialogDescriptionProps) {
  if (typeof children === "string") {
    return (
      <div
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 2,
          paddingBottom: 6,
        }}
      >
        <text
          style={{
            fontFamily: theme.fontFamily,
            fontSize: 13,
            color: theme.colors.mutedFg,
            lineHeight: 18,
            userSelect: "none",
            ...style,
          }}
        >
          {children}
        </text>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 2,
        paddingBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DialogClose({ children, onClick, style = {} }: DialogCloseProps) {
  const ctx = useContext(DialogContext);

  const handleClick = () => {
    onClick?.();
    ctx?.onClose?.();
  };

  if (children) {
    return (
      <div onClick={handleClick} style={{ display: "contents" }}>
        {children}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: theme.radius.sm,
        flexShrink: 0,
        ...style,
      }}
    >
      <X size={15} color={theme.colors.mutedFg} />
    </Button>
  );
}

export function DialogHeader({ children, style = {} }: DialogHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 4,
        gap: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DialogBody({ children, style = {} }: DialogBodyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        paddingBottom: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DialogFooter({ children, style = {} }: DialogFooterProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: theme.colors.card,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        borderBottomLeftRadius: theme.radius.lg,
        borderBottomRightRadius: theme.radius.lg,
        gap: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Dialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  children,
  closeOnOutsideClick = true,
  width = 520,
  minWidth = 360,
  maxWidth = 680,
  maxHeight = 480,
  style = {},
}: DialogProps) {
  const isVisible = open !== undefined ? open : (isOpen ?? false);
  const id = useId();
  const [mounted, setMounted] = useState(isVisible);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    onClose?.();
  }, [onOpenChange, onClose]);

  const handleOutsideClick = useCallback(() => {
    if (isToastActive()) {
      return;
    }
    if (closeOnOutsideClick && !isClosing) {
      handleClose();
    }
  }, [closeOnOutsideClick, isClosing, handleClose]);

  useEffect(() => {
    if (isVisible) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      setIsClosing(false);
    } else if (mounted) {
      if (isLowSpecMode()) {
        setMounted(false);
        setIsClosing(false);
      } else {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
          setMounted(false);
          setIsClosing(false);
          closeTimerRef.current = null;
        }, 160);
      }
    }

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isVisible, mounted]);

  const lowSpec = isLowSpecMode();
  const initialMotion = lowSpec ? { opacity: 1, top: 0 } : { opacity: 0, top: 12 };
  const animateMotion = isClosing ? { opacity: 0, top: 12 } : { opacity: 1, top: 0 };
  const transitionConfig = lowSpec
    ? { duration: 0 }
    : {
        duration: 0.16,
        ease: isClosing ? ("easeIn" as const) : ("easeOut" as const),
      };

  const content = mounted ? (
    <DialogContext.Provider key={id} value={{ onClose: handleClose }}>
      <motion.div
        initial={lowSpec ? false : { opacity: 0 }}
        animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
        transition={transitionConfig}
        onMouseDown={handleOutsideClick}
        onClick={handleOutsideClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          pointerEvents: isClosing ? "none" : "auto",
        }}
      />

      <div
        onMouseDownOutside={handleOutsideClick}
        style={{
          position: "relative",
          pointerEvents: isClosing ? "none" : "auto",
        }}
      >
        <motion.div
          initial={isClosing ? false : initialMotion}
          animate={animateMotion}
          transition={transitionConfig}
          style={{
            position: "relative",
            width,
            minWidth,
            maxWidth,
            maxHeight,
            display: "flex",
            flexDirection: "column",
            backgroundColor: theme.colors.bg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            overflow: "hidden",
            boxShadow: {
              offsetX: 0,
              offsetY: 8,
              blurRadius: 24,
              spreadRadius: 0,
              color: "#000000",
            },
            ...style,
          }}
        >
          {children}
        </motion.div>
      </div>
    </DialogContext.Provider>
  ) : null;

  useEffect(() => {
    if (mounted && content) {
      dialogStore.set(id, content);
    } else {
      dialogStore.delete(id);
    }
  }, [id, mounted, content]);

  useEffect(() => {
    return () => {
      dialogStore.delete(id);
    };
  }, [id]);

  return null;
}
