import {
  createContext,
  useContext,
  useState,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import type { StyleDesc } from "@gpuix/react";
import { motion } from "@gpuix/react";
import { theme } from "../theme";

interface NavigationContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within <NavigationRoot />");
  }
  return ctx;
}

export interface NavigationRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function NavigationRoot({
  value,
  defaultValue = "",
  onValueChange,
  children,
}: NavigationRootProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);

  const activeTab = value !== undefined ? value : internalTab;
  const setActiveTab = (newTab: string) => {
    if (value === undefined) {
      setInternalTab(newTab);
    }
    onValueChange?.(newTab);
  };

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  );
}

export interface NavItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedNavProps {
  items: NavItem[];
  itemWidth?: number;
  itemHeight?: number;
  duration?: number;
  style?: StyleDesc;
  triggerStyle?: StyleDesc;
}

export function SegmentedNav({
  items,
  itemWidth = 84,
  itemHeight = 28,
  duration = 0.22,
  style,
  triggerStyle,
}: SegmentedNavProps) {
  const { activeTab, setActiveTab } = useNavigation();

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeTab)
  );

  const listPadding = 3;
  const gap = 3;
  const targetLeft = listPadding + activeIndex * (itemWidth + gap);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.md,
        padding: listPadding,
        gap: gap,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Плавающая плашка активного таба */}
      <motion.div
        animate={{
          left: targetLeft,
          width: itemWidth,
          height: itemHeight,
        }}
        transition={{
          duration: duration,
          ease: "easeOut",
        }}
        style={{
          position: "absolute",
          top: listPadding,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.bg,
          pointerEvents: "none",
        }}
      />

      {items.map((item) => {
        const isActive = activeTab === item.id;
        const textColor = isActive ? theme.colors.fg : theme.colors.mutedFg;

        let labelWords: string[] = [];
        if (typeof item.label === "string" || typeof item.label === "number") {
          labelWords = String(item.label).trim().split(/\s+/).filter(Boolean);
        }

        const iconNode =
          item.icon && isValidElement(item.icon)
            ? cloneElement(item.icon as any, {
                color: (item.icon.props as any)?.color ?? textColor,
              })
            : item.icon;

        const textStyle: StyleDesc = {
          color: textColor,
          fontSize: 13,
          fontWeight: isActive ? "bold" : "normal",
          userSelect: "none",
          flexShrink: 0,
          ...(theme.fontFamily ? { fontFamily: theme.fontFamily } : {}),
        };

        return (
          <div
            key={item.id}
            tabIndex={0}
            onClick={() => setActiveTab(item.id)}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: itemWidth,
              height: itemHeight,
              gap: 6,
              cursor: "pointer",
              userSelect: "none",
              backgroundColor: "transparent",
              flexShrink: 0,
              active: { opacity: 0.8 },
              ...triggerStyle,
            }}
          >
            {iconNode && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {iconNode}
              </div>
            )}

            {labelWords.length > 0 ? (
              labelWords.map((word, idx) => (
                <text key={idx} style={textStyle}>
                  {word}
                </text>
              ))
            ) : (
              <text style={textStyle}>{item.label}</text>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface NavPanelProps {
  tab: string;
  children: ReactNode;
  style?: StyleDesc;
}

export function NavPanel({ tab, children, style }: NavPanelProps) {
  const { activeTab } = useNavigation();

  if (activeTab !== tab) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
