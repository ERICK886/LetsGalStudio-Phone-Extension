import React from "react";

interface PhoneErrorBoundaryProps {
  closePhone: () => void;
  children: React.ReactNode;
}

interface PhoneErrorBoundaryState {
  error?: Error;
}

/**
 * 将 React 渲染、构造和生命周期错误限制在手机 UI 内的错误边界。
 * 正常状态直接渲染子树；捕获到错误后显示隔离的全屏回退界面，并仅允许通过 `closePhone` 退出。
 * 它不捕获事件处理器或异步回调中的错误；这些错误仍应由各自的调用点处理。
 * `getDerivedStateFromError` 会把未知值标准化为 Error，`componentDidCatch` 会将错误与 React 组件栈写入扩展日志。
 */
export class PhoneErrorBoundary extends React.Component<
  PhoneErrorBoundaryProps,
  PhoneErrorBoundaryState
> {
  state: PhoneErrorBoundaryState = {};

  static getDerivedStateFromError(error: unknown): PhoneErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[phone] 手机界面渲染失败", error, info);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "grid", placeItems: "center", padding: 24, color: "#fff", background: "rgba(4, 7, 12, .84)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ width: "min(520px, 100%)", padding: 24, border: "1px solid rgba(255,255,255,.2)", borderRadius: 18, background: "#171d2a", boxShadow: "0 24px 70px rgba(0,0,0,.5)" }}>
          <h2 style={{ marginTop: 0 }}>手机界面加载失败</h2>
          <p style={{ opacity: .8 }}>请在扩展日志中查看详细错误。</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#ffb5b5" }}>{this.state.error.message}</pre>
          <button type="button" onClick={this.props.closePhone}>关闭手机</button>
        </div>
      </div>
    );
  }
}
