import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by boundary:", error, errorInfo);
  }

  private handleReload = () => {
    localStorage.clear(); // Clear corrupt local storage values
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          background: "linear-gradient(160deg, #f8fafc 0%, #eef2ff 55%, #f8fafc 100%)",
          fontFamily: "'Space Grotesk', sans-serif",
          textAlign: "center"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #fee2e2"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              background: "#fef2f2",
              color: "#ef4444",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <span style={{ fontSize: "28px", fontWeight: "bold" }}>!</span>
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px" }}>
              Application Render Error
            </h2>
            <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.6", margin: "0 0 24px" }}>
              An unexpected error occurred during rendering. This might be due to a disconnected data stream or corrupt session state.
            </p>
            <div style={{ fontSize: "11px", color: "#ef4444", background: "#fef2f2", padding: "10px", borderRadius: "6px", fontFamily: "monospace", overflowX: "auto", textAlign: "left", marginBottom: "24px" }}>
              {this.state.error?.toString()}
            </div>
            <button
              onClick={this.handleReload}
              style={{
                background: "#0ea5e9",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.4)"
              }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
