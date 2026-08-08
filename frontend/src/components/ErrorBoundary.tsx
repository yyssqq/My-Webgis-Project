import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: 40,
              background: "var(--bg-deep)",
              color: "var(--text)",
              gap: 16,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <div style={{ fontSize: 36 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              程序遇到了一个错误
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                maxWidth: 480,
                textAlign: "center",
              }}
            >
              {this.state.error?.message ?? "未知错误"}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "6px 20px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--bg-card)",
                color: "var(--text)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              刷新页面
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
