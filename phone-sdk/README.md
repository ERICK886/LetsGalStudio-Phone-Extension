# @ink-zenly/phone-sdk

LetsGal「自定义手机扩展」专用 SDK。第三方扩展通过它注册可在**手机屏幕内部**显示的应用界面；作者在手机扩展设置里把应用图标绑定到已注册的 `phoneAppId`。

## 安装

在第三方扩展的 `package.json` 中：

```json
{
  "dependencies": {
    "@ink-zenly/phone-sdk": "file:../path-to/ext-7a9373/phone-sdk"
  }
}
```

构建时请将 `@ink-zenly/phone-sdk` 打进自己的 bundle（仅 external `react` / `@avg-studio/sdk`），通过 `globalThis` 与手机宿主通信。

## 注册约定（重要）

**`registerPhoneApp({ id })` 推荐直接使用本扩展 `extension.json` 的 `id`，不要在源码里再手写一份短 id。**

作者设置里的 `phoneAppId` 必须与该值完全一致。

```tsx
import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk";
import extensionManifest from "../extension.json";

@extension({ id: "shop-controller", label: "商店控制器", exposeUI: false })
export class ShopController extends Extension {
  static onRegister() {
    registerPhoneApp({
      // 与 extension.json 的 id 一致，例如 ink.zenly.ext-shop
      id: extensionManifest.id,
      title: extensionManifest.name,
      render: ({ closeApp, safeAreaInsets }) => (
        <div style={{ paddingTop: safeAreaInsets.top, color: "#fff" }}>
          <h2>商店</h2>
          <button type="button" onClick={closeApp}>回桌面</button>
        </div>
      ),
    });
  }
}
```

`id` 规则：小写字母 / 数字 / 点 / 连字符；支持短名（`shop`）或 reverse-DNS（`ink.zenly.ext-shop`）。

## 作者配置

1. 启用「自定义手机扩展」。
2. 设置 →「动作 · 手机内部应用」→ 填写动作 ID，并将 `phoneAppId` 设为第三方 `extension.json` 的 `id`。
3. 「手机应用目录」中某图标的「默认动作 ID」填该动作 ID。

玩家点击图标后，手机会保持打开并在屏幕内渲染你的 `render`；底部 Home 返回桌面。

## 安全区（刘海 / Home）

- **应用层必须全屏覆盖**手机屏幕（`width/height: 100%`），背景可以画到状态栏底下。
- **`safeAreaInsets.top` = 状态栏高度**（`offsetHeight`）；底部为 Home 条高度。
- 标题、按钮等可读/可点内容应加 `paddingTop: safeAreaInsets.top`（以及 bottom），不要把整块背景也缩进。

```tsx
registerPhoneApp({
  id: extensionManifest.id,
  render: ({ safeAreaInsets, closeApp }) => (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "#123" }} />
      <div
        style={{
          position: "relative",
          height: "100%",
          boxSizing: "border-box",
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom,
          paddingLeft: safeAreaInsets.left,
          paddingRight: safeAreaInsets.right,
        }}
      >
        <button type="button" onClick={closeApp}>回桌面</button>
      </div>
    </div>
  ),
});
```

## 示例扩展

仓库旁有独立示例扩展 `AVG-Extensions/ext-phone-snake`（贪吃蛇），用于验证跨扩展接入。其 Phone SDK id 即 `extension.json` 的 `ink.zenly.ext-phone-snake`。
