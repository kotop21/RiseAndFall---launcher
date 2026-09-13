import { useState } from "react";
export interface EventPayload { [key: string]: any; }
import type { StyleDesc } from "@gpuix/react";
import { theme } from "../theme";

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: EventPayload) => void;
  onKeyUp?: (e: EventPayload) => void;
  onFocus?: (e: EventPayload) => void;
  onBlur?: (e: EventPayload) => void;
  style?: StyleDesc;
}

export function Input({
  value,
  onChange,
  placeholder,
  disabled = false,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  style = {},
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: 36,
        paddingLeft: 10,
        paddingRight: 10,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.input,
        borderWidth: 1,
        borderColor: isFocused ? theme.colors.primary : theme.colors.border,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.value ?? "")}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        style={{
          flexGrow: 1,
          minWidth: 0,
          fontFamily: theme.fontFamily,
          fontSize: 13,
          color: theme.colors.fg,
          selectionColor: theme.colors.primary,
        }}
      />
    </div>
  );
}
