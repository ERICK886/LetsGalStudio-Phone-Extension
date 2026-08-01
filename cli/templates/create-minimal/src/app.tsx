/**
 * @file app.tsx
 * @description {{title}} 手机内页 UI（minimal 独立扩展模板）。
 * @author {{author}}
 * @date {{date}}
 * @version 0.1.0
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";

/**
 * {{title}} 内页组件（minimal 骨架）。
 *
 * @param props - Phone SDK 注入的运行时 props
 * @param props.appId - 注册时的程序 ID
 * @param props.closeApp - 返回手机桌面（不关闭手机）
 * @param props.closePhone - 关闭整部手机 UI
 * @param props.safeAreaInsets - 刘海 / Home 指示条等安全区像素
 * @returns 嵌在手机屏幕内的 React 节点
 *
 * @example
 * ```tsx
 * render: (props) => <{{pascalName}}App {...props} />
 * ```
 *
 * @remarks
 * 不抛出异常；交互失败时由宿主错误边界承接。
 */
export function {{pascalName}}App(props: PhoneAppRenderProps) {
  const { appId, closeApp, safeAreaInsets } = props;

  return (
    <div
      style={{
        boxSizing: "border-box",
        height: "100%",
        paddingTop: safeAreaInsets.top,
        paddingRight: Math.max(16, safeAreaInsets.right),
        paddingBottom: safeAreaInsets.bottom,
        paddingLeft: Math.max(16, safeAreaInsets.left),
        color: "#e8e8e8",
        background: "#141820",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{{title}}</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.65, fontSize: 12 }}>
          {appId}
        </p>
      </header>

      <main style={{ flex: 1, fontSize: 13, lineHeight: 1.5, opacity: 0.85 }}>
        <p style={{ margin: 0 }}>
          minimal 模板 · <code>{{appId}}</code>
        </p>
      </main>

      <footer>
        <button
          type="button"
          onClick={closeApp}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 8,
            padding: "10px 12px",
            background: "#3dd68c",
            color: "#0b1a12",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          回桌面
        </button>
      </footer>
    </div>
  );
}
