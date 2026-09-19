# @ink-zenly/phone-sdk

LetsGal「自定义手机扩展」SDK，分两个入口：

| 入口 | 用途 | 内部目录 |
|------|------|----------|
| `@ink-zenly/phone-sdk`（**main**） | 宿主：`PhoneExtension` / `ToastExtension` / Studio | `src/host/` |
| `@ink-zenly/phone-sdk/plugin` | 内页客户端：`registerPhoneApp`、引导注册等 | `src/client/` |

对外路径仍为 `/plugin`；内部已语义化为 `client/`（runtime / debug / bootstrap）与 `host/`（phone / toast / studio）。

本仓库内页示例写在扩展侧 `src/<app-id>/`，由 `src/index.tsx` 调用 `bootstrapPhonePluginApps`。

## 内部结构

```text
phone-sdk/src/
├── index.ts                 # main 导出宿主
├── client/                  # → @ink-zenly/phone-sdk/plugin
│   ├── runtime/             # 槽位、注册、安全区、app-id
│   ├── debug/               # debug / diag
│   └── bootstrap/           # 清单容器 + 引导钩子
└── host/
    ├── phone/
    │   ├── catalog/         # 目录解析（可复用模块）
    │   ├── runtime/         # 安装宿主
    │   ├── extension/
    │   └── ui/              # UI 拆分：constants / in-phone-app / content …
    ├── toast/
    └── studio/
```

## 应用 ID 约定（重要）

Studio 以 **`扩展ID/程序ID`** 标识程序。  
`registerPhoneApp({ id })` 必须等于**程序 ID**（与 `@extension({ id })` 一致）。

作者在「动作 · 手机内部应用」填写的 `phoneAppId`：
- **宿主内置内页**：只填**程序 ID**（如 `phone-chat`）
- **跨扩展第三方内页**：可填完整 `扩展ID/程序ID`（宿主会规约为程序 ID 查找注册表）

## 安装

```json
{
  "dependencies": {
    "@ink-zenly/phone-sdk": "file:../path-to/ext-7a9373/phone-sdk"
  }
}
```

- 做**内页应用**：`import … from "@ink-zenly/phone-sdk/plugin"`，打进自己的 bundle（external `react` / `@avg-studio/sdk`）。
- 做**手机宿主**：使用包 main。

## 内页注册示例

```tsx
import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

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

## 桌面角标（≥ 0.5.4）

内页可设置桌面图标红点或数字（**仅内存**，不写存档）：

```ts
import { setPhoneAppBadge, clearPhoneAppBadge } from "@ink-zenly/phone-sdk/plugin";

setPhoneAppBadge("chat", { mode: "dot" });
setPhoneAppBadge("chat", { mode: "count", count: 3 }); // >99 → 99+
clearPhoneAppBadge("chat");
```

打开该内页时宿主自动 clear；内页仍可再 `set`。

## 程序化关闭手机

调用方可以选择关闭手机时是否播放宿主动画；省略选项时保持原有动画：

```ts
import { closePhoneApp } from "@ink-zenly/phone-sdk/plugin";

await closePhoneApp();                    // 默认：播放宿主关闭动画
await closePhoneApp({ animated: false }); // 立即关闭，不播放动画
```

`force` 仅供已经完成不可跳过交互的宿主流程绕过遗留关闭锁；普通内页不应设置。

## 扩展入口引导（本仓库）

```ts
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(registerDemoShopPhoneApp),
);
```
