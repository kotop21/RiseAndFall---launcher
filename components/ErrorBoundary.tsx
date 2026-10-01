import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMsg = error?.message || String(error);
    const stack = error?.stack || "No stack available";
    const componentStack = errorInfo?.componentStack || "No component stack";

    // Распознавание минифицированных кодов ошибок React 19 в проде
    const match = errorMsg.match(/Minified React error #(\d+)/i);
    const reactDocUrl = match
      ? `\nReact Error Documentation: https://react.dev/errors/${match[1]}`
      : "";

    logger.error(
      "ErrorBoundary",
      `React UI Exception: ${errorMsg}${reactDocUrl}\nComponent Stack: ${componentStack}\nError Stack: ${stack}`,
    );
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <text style={{ fontSize: 16, color: "#f87171", fontWeight: "bold" }}>
            An unexpected interface error occurred
          </text>
          <text style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
            Check launcher logs for complete details.
          </text>
        </div>
      );
    }
    return this.props.children;
  }
}
