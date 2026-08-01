/**
 * @file app.tsx
 * @description 开发预览用「示例商店」手机内页 UI。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";

/**
 * 示例商店内页。
 *
 * 用于验证 `src/<app-id>` 内页链路；也可迁出到独立 Studio 扩展。
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
 * render: (props) => <DemoShopApp {...props} />
 * ```
 *
 * @remarks
 * 不抛出异常；交互失败时由宿主错误边界承接。
 */
export function DemoShopApp(props: PhoneAppRenderProps) {
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
        color: "#f5f5f5",
        background:
          "linear-gradient(160deg, #1a2332 0%, #0f1419 55%, #1b2a22 100%)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>示例商店</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.72, fontSize: 13 }}>
          程序 ID：{appId}
        </p>
      </header>

      <main style={{ flex: 1, fontSize: 14, lineHeight: 1.55, opacity: 0.9 }}>
        <p style={{ margin: 0 }}>
          这是 <code>src/demo-shop</code> 内页示例。
          请在扩展设置中配置「动作 · 手机内部应用」，
          将 <code>phoneAppId</code> 填为 <code>demo-shop</code> 后即可点开。
        </p>
      </main>

      <footer>
        <button
          type="button"
          onClick={closeApp}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 10,
            padding: "12px 14px",
            background: "#3dd68c",
            color: "#0b1a12",
            fontWeight: 650,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          回桌面
        </button>
      </footer>
    </div>
  );
}
