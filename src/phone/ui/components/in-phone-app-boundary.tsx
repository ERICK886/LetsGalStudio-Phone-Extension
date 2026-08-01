/**
 * @file in-phone-app-boundary.tsx
 * @description 手机内部应用渲染错误边界：崩溃时隔离在内页，可回桌面。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import React from "react";

interface InPhoneAppBoundaryProps {
  /** 返回手机桌面（不关闭手机） */
  onGoHome: () => void;
  children: React.ReactNode;
}

interface InPhoneAppBoundaryState {
  error?: Error;
}

/**
 * 将第三方内页应用的渲染错误限制在内容区内。
 *
 * @param props.onGoHome 用户点击「返回桌面」时调用
 * @param props.children 第三方 `render` 产出的节点
 * @returns React 节点
 *
 * @remarks
 * 不捕获事件处理器或异步回调中的错误。切换到另一个应用或回桌面时，
 * 父级应通过更换 `key` 重置本边界内部 state。
 */
export class InPhoneAppBoundary extends React.Component<
  InPhoneAppBoundaryProps,
  InPhoneAppBoundaryState
> {
  state: InPhoneAppBoundaryState = {};

  static getDerivedStateFromError(error: unknown): InPhoneAppBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[phone] 手机内部应用渲染失败", error, info);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="phone-in-app-error" role="alert" style={{ width: "100%", height: "100%" }}>
        <h2>应用加载失败</h2>
        <p>请查看扩展日志。可返回桌面后重试。</p>
        <pre>{this.state.error.message}</pre>
        <button type="button" className="phone-round-button" onClick={this.props.onGoHome}>
          返回桌面
        </button>
      </div>
    );
  }
}
