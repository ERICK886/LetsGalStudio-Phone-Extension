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
`registerPhoneApp({ id })` 必须等于程序 ID（与 `@extension({ id })` 一致）。

作者设置里的 `phoneAppId` 可填程序 ID，或完整 `扩展ID/程序ID`。

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
