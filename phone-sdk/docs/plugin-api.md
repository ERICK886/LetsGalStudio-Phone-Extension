# 手机软件接入与调用

本文描述当前源码新增的接口；尚未发布新的 npm 版本。现有 `0.5.28` 版本号不代表远端包已经包含这些接口。本仓 CLI 默认引用本地 SDK，独立发布前须为 SDK 分配新版本并同步 CLI 依赖。

## 入口与职责

| 导入入口 | 用途 | 典型导出 |
| --- | --- | --- |
| `@ink-zenly/phone-sdk/host` | 完整手机的运行外壳 | `PhoneExtension`、`PhoneHudExtension`、`ToastExtension` |
| `@ink-zenly/phone-sdk/plugin` | 所有内置及独立软件 | 注册、来源解析、设置桥、导航、角标、安全区 |
| `@ink-zenly/phone-sdk/editor` | 按需复用作者编辑界面 | `PhoneEditorExtension`、字段/素材组件、设置读写辅助函数 |
| `@ink-zenly/phone-sdk` | 保留的兼容入口 | 原有宿主与编辑器导出 |

`/plugin` 不加载宿主 UI 或手机编辑器。注册软件不会生成作者设置，也不会创建或重置玩家存档。业务软件的 `settings`、`saveSchema`、剧情方法仍定义在自己的 Studio 控制器上。

## 一个软件的两个入口

软件需要同时提供 **UI 注册函数** 和 **Studio 控制器导出**。前者让手机找到内页，后者让 Studio 加载设置、方法和存档。仅有其中一个都不完整。

```tsx
// src/apps/acme-notes/index.tsx
import { Extension, extension, type ExtensionContext } from "@avg-studio/sdk";
import { bindPhoneAppSettings, registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { NotesApp } from "./app";

export const PROGRAM_ID = "acme-notes";
declare const __PHONE_EXTENSION_ID__: string; // 构建从 extension.json.id 注入

export function registerAcmeNotesPhoneApp() {
  return registerPhoneApp({
    id: PROGRAM_ID,
    title: "便签",
    render: (props) => <NotesApp {...props} />,
  });
}

@extension({ id: PROGRAM_ID, label: "便签", exposeUI: false })
export class AcmeNotesController extends Extension {
  // settings、saveSchema 和剧情方法在这里定义，打包会保留整个类。
  static onRegister(ctx: ExtensionContext) {
    bindPhoneAppSettings(`${__PHONE_EXTENSION_ID__}/${PROGRAM_ID}`, ctx.settings, ctx.flow.signal);
  }
}
```

```ts
// src/phone-apps.ts
import { registerPhonePlugin } from "@ink-zenly/phone-sdk/plugin";
import { registerAcmeNotesPhoneApp } from "./apps/acme-notes";
declare const __PHONE_EXTENSION_ID__: string;

export const phoneApps = [registerAcmeNotesPhoneApp];
export const disposePhoneApps = registerPhonePlugin({
  extensionId: __PHONE_EXTENSION_ID__,
  apps: phoneApps,
});
```

```ts
// src/index.tsx：独立软件不导出手机宿主
import "./phone-apps";
export { AcmeNotesController } from "./apps/acme-notes";
```

完整手机宿主额外导出 `/host` 的三个模块与 `/editor` 的 `PhoneEditorExtension`。不要在软件自己的控制器里再注册一遍同一个 UI。

## ID、解析与冲突

| 标识 | 示例 | 稳定性要求 |
| --- | --- | --- |
| 扩展包 ID | `acme.phone-tools` | 来自 `extension.json.id`；关系到 Studio 的持久化归属 |
| 程序 ID | `acme-notes` | 与 `@extension.id`、注册 `id` 一致；全局唯一，最长 64 字符 |
| 完整应用引用 | `acme.phone-tools/acme-notes` | 独立软件建议使用；验证来源后匹配程序 |
| 桌面条目 ID | `notes-icon` | 桌面布局自身的稳定键，通过动作指向应用引用 |

`toPhoneAppId` 继续提取程序段；`normalizePhoneAppReference` 保留扩展段。宿主解析桌面动作和导航请求使用后者，避免丢失来源。裸程序 ID 仍可使用。

```ts
const result = parsePhoneAppRegistration(candidate);
if (!result.app) console.error(result.issues); // path + message
const lookup = resolvePhoneAppReference("acme.phone-tools/acme-notes", listRegisteredPhoneApps());
// status: ready | invalid | missing | owner-mismatch
```

无来源的旧插件仍允许通过完整引用按程序段匹配，`legacy: true` 表示走了这条兼容路径。不同已知来源注册相同程序 ID 时保留先注册的软件并警告；此版本没有引入同名程序的多命名空间并存。

## 注册与清理

- `registerPhoneApp` 先规范化，再入队或交给宿主，返回只清理此次注册的幂等函数。
- `registerPhonePlugin` 为旧式注册函数提供同一个 `extensionId` 来源，隔离单个注册函数的异常，并在宿主重装时重新登记。
- 注册函数必须同步执行；异步准备完资源后再调用注册 API，不能依赖跨 `await` 的注册作用域。
- 同一个扩展 ID 的新插件注册替换旧插件；旧清理函数不能删除新实例。
- `disposePhoneApps()` 解除该插件的重注册钩子及其拥有的软件。应由实际集成层在插件停用/HMR 销毁时调用；导出此函数本身不代表所有 Studio 版本会自动调用它。
- 原 `bootstrapPhonePluginApps`、`definePhonePluginRegistry` 和直接注册方式仍保留；旧 bootstrap 的清理只取消回调，不等价于完整插件清理。

## 设置与编辑器

`settings.cross` 在当前 Studio 实现中只跨同一个扩展包的模块。独立软件必须用自己的 `ctx.settings` 调用 `bindPhoneAppSettings`；不得把完整引用直接传给 `settings.cross` 来假定它能跨包。

设置桥不复制、不缓存默认值、不触发迁移。只把读写和订阅交给原 SettingsAPI；`false`、`0`、空串与数组保持原类型。清理按上下文所有权进行，旧 Preview 退出不会移除新桥。独立软件未绑定时，公共编辑器的读操作返回缺失值，写操作返回 `false`，避免写错宿主设置。

```ts
registerPhoneApp({
  id: PROGRAM_ID,
  render,
  styleEditor: {
    label: "便签", settingsModuleId: PROGRAM_ID,
    contentItems: [{ id: "caption", group: "文案", label: "标题", fieldType: "string", defaultValue: "便签" }],
    pages: [{ id: "copy", label: "文案", contentItemIds: ["caption"], preview: "placeholder" }],
  },
});
```

字段支持 `string/color/enum/asset/shortcut/boolean/number/character`，素材支持 `image/audio/video/any`；可用 `settingKey` 与 `settingsModuleId` 指向既有设置。页面支持 `desktop/chat/phone-call/placeholder` 预览。复杂数组或自定义布局通过 `resolveCustomPanes` 返回三栏组件，不使用某个内置页面 ID 冒充内置软件。

字段缺省值仅用于编辑器显示；对应 Studio `settings` 定义仍须由软件提供。布尔与数字由写入层转换回对应类型。非法可选项会被忽略，`parsePhoneAppRegistration().issues` 提供诊断。历史聊天预览/数组页适配保留在 SDK 内作为兼容层；当前聊天字段 schema 由聊天软件自己的 `editor/` 维护。

## 导航与运行时

```ts
const result = await openPhoneApp({ appId: "acme.phone-tools/acme-notes", waitUntil: "none" });
// opened | blocked | unavailable | invalid | failed
await closePhoneApp({ animated: true });
```

`opened` 表示已接受打开请求，不保证 React 内页已绘制。`waitUntil: "close"` 等待手机关闭；它不是“等待某个业务任务完成”。UI 中 `closeApp` 回桌面、`closePhone` 关闭手机。业务需要读写自己的存档时用自己的控制器上下文，不借用手机外壳上下文。

应用 `render` 接收程序 ID、安全区与关闭回调；导航 payload 从 `getLatestPhoneNavigate` / `subscribePhoneNavigate` 读取，用 `matchesPhoneAppReference(request.appId, PROGRAM_ID, EXTENSION_ID)` 匹配本软件，消费后按请求 `seq` 清理。角标、导航 pending、关闭锁与设置桥都是内存状态，不是玩家存档。
