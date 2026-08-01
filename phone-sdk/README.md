# @ink-zenly/phone-sdk

LetsGal「自定义手机扩展」专用 SDK。第三方扩展通过它注册可在**手机屏幕内部**显示的应用界面。

## 应用 ID 约定（重要）

Studio 以 **`扩展ID/程序ID`** 标识程序，例如：

`ink.zenly.ext-phone-snake/phone-snake`

- **扩展 ID**：`extension.json` 的 `id`
- **程序 ID**：`@extension({ id })` 的 id

**Phone SDK 的 `registerPhoneApp({ id })` 必须等于程序 ID**（上例为 `phone-snake`），与 `@extension({ id })` 保持同一常量，不要另写一份。

一个扩展可以有多个程序模块 → 每个模块各自 `registerPhoneApp`，即可在一部手机里挂多个内页 app。

作者设置里的 `phoneAppId`：

- 推荐填程序 ID：`phone-snake`
- 也可填 Studio 完整引用：`ink.zenly.ext-phone-snake/phone-snake`（SDK/宿主会自动取程序段）

辅助 API：

```ts
import {
  formatStudioProgramRef,
  toPhoneAppId,
  parseStudioProgramRef,
} from "@ink-zenly/phone-sdk";

formatStudioProgramRef("ink.zenly.ext-phone-snake", "phone-snake");
// → "ink.zenly.ext-phone-snake/phone-snake"

toPhoneAppId("ink.zenly.ext-phone-snake/phone-snake");
// → "phone-snake"
```

## 安装

```json
{
  "dependencies": {
    "@ink-zenly/phone-sdk": "file:../path-to/ext-7a9373/phone-sdk"
  }
}
```

构建时请将 `@ink-zenly/phone-sdk` 打进自己的 bundle（仅 external `react` / `@avg-studio/sdk`）。

## 注册示例

```tsx
import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk";

/** 与 @extension({ id })、registerPhoneApp({ id })、作者 phoneAppId 共用 */
const PROGRAM_ID = "shop";

@extension({ id: PROGRAM_ID, label: "商店", exposeUI: false })
export class ShopController extends Extension {
  static onRegister() {
    registerPhoneApp({
      id: PROGRAM_ID,
      title: "商店",
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

## 作者配置

1. 启用「自定义手机扩展」。
2. 设置 →「动作 · 手机内部应用」→ `phoneAppId` 填程序 ID（如 `shop`）。
3. 「手机应用目录」中绑定该动作 ID。

## 安全区（刘海 / Home）

- 应用层全屏覆盖；可读内容使用 `safeAreaInsets.top/bottom`。
- `safeAreaInsets.top` = 状态栏高度。

## 示例扩展

`AVG-Extensions/ext-phone-snake`：Studio 引用 `ink.zenly.ext-phone-snake/phone-snake`，Phone SDK id = `phone-snake`。
