# @ink-zenly/phone-sdk

LetsGal 游戏内手机的宿主 SDK。本文对应 **0.5.27**（2026-10-14），包含注册、导航关闭、会话清理和编辑器契约修复。

SDK 提供手机桌面、内页容器、HUD、Toast、作者编辑器与跨 bundle 桥接。聊天、相册、电话等业务内页由扩展工程注册，SDK 不内置这些 APP。

## 1. 入口与架构

| 公开入口 | 用途 | 源码 |
| --- | --- | --- |
| `@ink-zenly/phone-sdk` | 宿主模块、编辑器组件/schema | [src/index.ts](src/index.ts) |
| `@ink-zenly/phone-sdk/plugin` | 内页注册、导航、角标、安全区、诊断及底层宿主桥接 | [src/client/index.ts](src/client/index.ts) |

只从公开入口导入。底层 `installPhoneSdkHost` 目前在 `/plugin` 导出，虽然它由宿主调用。

本包发布 TypeScript/TSX 源码，使用 CSS `?inline` 导入，推荐以 Vite + React 插件构建；不是可以直接在普通 Node.js 环境运行的编译后 SDK。

```text
extension.json → Vite → 扩展入口
                       ├─ 导出宿主四个模块
                       └─ bootstrapPhonePluginApps → registerPhoneApp
PhoneExtension.onRegister → 安装注册表宿主 + 绑定手机模块 ctx
openPhoneApp → 导航 pending → 手机 UI → registration.render
关闭手机 → 隐藏容器 → emitPhoneClosed → 释放关闭等待
```

## 2. 创建完整手机宿主

### 依赖

本仓联调使用 `"@ink-zenly/phone-sdk": "file:phone-sdk"`；独立工程使用 `@ink-zenly/phone-sdk@^0.5.27`。CLI 本地解析本包版本为 `^0.5.27`；已发布 CLI 0.3.7 的兜底版本为 `^0.5.5`，旧脚手架工程请显式更新 SDK 依赖。

宿主需 React 18、React DOM、Studio SDK、Vite 和 React 插件。本包声明 React/React DOM/Studio SDK 为 peerDependencies，声明 `@chakra-ui/react`、`@emotion/react` 为 dependencies；安装宿主时提供这些 peers，编辑器依赖由包管理器安装。独立安装构建应使用打出的 SDK 包验证，不能只依赖本仓根工程的依赖。

开发时 `@avg-studio/sdk` 可以通过本地 `sdk/` 提供，运行时由 Studio 提供，构建应 external。

### 扩展入口

```tsx
// 扩展工程 src/index.tsx
import {
  bootstrapPhonePluginApps, definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerShopPhoneApp } from "./shop";

bootstrapPhonePluginApps(definePhonePluginRegistry(registerShopPhoneApp));

export {
  PhoneExtension, PhoneHudExtension, ToastExtension, PhoneEditorExtension,
} from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
```

| 模块 | 程序 ID | 职责 |
| --- | --- | --- |
| `PhoneExtension`，也是 default | `phone` | 桌面、内页、设置、存档、剧情方法、快捷键 |
| `PhoneHudExtension` | `phone-hud` | 挂载后显示的触屏打开按钮 |
| `ToastExtension` | `phone-toast` | APP 管理等操作提示 |
| `PhoneEditorExtension` | `phone-editor` | 作者编辑器，不作为手机内页注册 |

业务应用有自己的设置/存档/剧情方法时，还须导出相应 Extension 类；registerPhoneApp 不自动导出业务控制器。当前 CLI default/minimal 模板均导出上述四个宿主模块。

### Vite 构建契约

从 extension.json.id 注入 `__PHONE_HOST_EXTENSION_ID__`；未注入会回退官方 ID `ink.zenly.ext-7a9373`，影响快捷键动作前缀及部分 DOM 标识。

```ts
// 合并到 vite.config.ts；extensionJson 为读取的 extension.json
define: {
  __PHONE_HOST_EXTENSION_ID__: JSON.stringify(extensionJson.id),
},
build: {
  lib: { entry: "src/index.tsx", formats: ["es"], fileName: () => "index.mjs" },
  rollupOptions: {
    external: [
      "react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime",
      "@avg-studio/sdk",
    ],
  },
},
```

宿主和独立内页均将所用 phone-sdk API 打进自己的 bundle。共享状态通过 `globalThis.__LetsGalPhoneSdk__` 桥接，不要求将 phone-sdk external。`__PHONE_PLUGIN_DEV__` 为可选诊断标记，不代替注册。

## 3. ID 与内页接入

区分扩展包 ID、程序 ID、手机桌面目录条目 ID：

```text
extension.json.id = com.acme.mobile
业务 @extension.id = shop = registerPhoneApp.id
桌面 catalogApps.id = shop-icon
defaultActionId → inPhoneAppActions.id → phoneAppId = shop
```

程序 ID 应符合 `^[a-z][a-z0-9-]*$`，与业务 @extension.id 对齐。作者可以填写 `扩展ID/程序ID`，SDK 取程序段查找。**完整路径没有命名空间隔离**：不同扩展使用同一程序 ID 会覆盖彼此，第三方应使用足够唯一的程序 ID。

```tsx
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

export function registerShopPhoneApp(): void {
  registerPhoneApp({
    id: "shop", title: "商店", description: "商品列表",
    render: ({ closeApp, closePhone, safeAreaInsets }) => (
      <div style={{
        paddingTop: safeAreaInsets.top, paddingRight: safeAreaInsets.right,
        paddingBottom: safeAreaInsets.bottom, paddingLeft: safeAreaInsets.left,
      }}>
        <button type="button" onClick={closeApp}>回桌面</button>
        <button type="button" onClick={closePhone}>关闭手机</button>
      </div>
    ),
  });
}
```

同包宿主使用根入口 bootstrap 清单。独立扩展通常在自身 Extension.onRegister 中注册，并在卸载生命周期调用 unregisterPhoneApp。注册和订阅均应有明确清理归属。

宿主未就绪时注册排队，同 ID 注册覆盖。getRegisteredPhoneApp 在安装前返回 undefined，listRegisteredPhoneApps 此时返回队列。安装按同 ID 的最后一次操作生效，支持“注册 → 注销 → 再注册”。

PhoneAppRenderProps 包含 appId、closeApp、closePhone、safeAreaInsets。closeApp 回桌面，closePhone 关外壳，均为 `() => void`，不能据返回值确认异步隐藏完成。安全区为 CSS 像素，宿主也提供 `--phone-safe-top/right/bottom/left` CSS 变量。

## 4. 打开、payload 与关闭

```ts
import { openPhoneApp } from "@ink-zenly/phone-sdk/plugin";

const result = await openPhoneApp({
  appId: "shop", waitUntil: "none", position: "bottom-right",
  payload: { itemId: "item-1" },
});
if (result !== "opened") console.warn("打开请求未成功", result);
```

| 参数 | 契约 |
| --- | --- |
| appId | 程序 ID；客户端仅检查空值，宿主 UI 再查询注册表 |
| waitUntil | 默认 close，等待整部手机关闭或 flow abort；none 在请求发出后返回 |
| position | 单次临时方位：top-left/top-center/top-right/bottom-left/bottom-center/bottom-right/center |
| payload | Record<string, unknown>，通过导航 pending 传递，不在 render props 中 |

返回值为 opened/blocked/unavailable/invalid/failed：空 ID 是 invalid，无导航控制器是 unavailable，剧情消息占用是 blocked，可被等待流程捕获的显示失败是 failed。旧宿主返回 void 时兼容为 opened。

**opened 不保证内页成功渲染或业务准备完成。** 未注册应用由 UI 提示；none 不等待后续异步 show 失败；close 被 flow abort 释放时也可能返回 opened。需要业务确认时，应由业务应用提供确认机制。

程序化打开会激活手机，无需先 mount-phone；快捷键/HUD 打开需要已经挂载。关闭 UI 不等于卸载手机能力。

### 消费 payload

```ts
import {
  subscribePhoneNavigate, clearPhoneNavigatePending, toPhoneAppId,
} from "@ink-zenly/phone-sdk/plugin";

const off = subscribePhoneNavigate((request) => {
  if (toPhoneAppId(request.appId) !== "shop") return;
  handleShopLaunch(request.payload); // 业务自己实现
  clearPhoneNavigatePending(request.seq);
});
// 应用卸载时 off()。
```

总线仅保留最新 pending，新订阅会同步回放。按 seq 清理可防止误删后来的请求。当前监听器异常未隔离，回调应处理自身错误。seq 是去重序号，不是应用会话 ID。

### 关闭与关闭锁

```ts
import { closePhoneApp, acquirePhoneCloseLock } from "@ink-zenly/phone-sdk/plugin";
const release = acquirePhoneCloseLock();
try {
  await requiredInteraction(); // 业务自己实现
} finally {
  release();
}
await closePhoneApp({ animated: false });
```

- closePhoneApp 默认播放关闭动画；animated:false 直接请求隐藏；无导航宿主立即返回。
- 有关闭锁时普通关闭直接返回；void 结果不能区分关闭完成和被锁拦截。
- force:true 清除所有锁，仅用于强制交互完成后的宿主收尾；普通内页不应设置。
- 多个锁需逐个释放，释放函数幂等。锁监听器逐个隔离异常；单个回调失败不会阻断令牌返回或后续通知。
- 动画关闭等待异步隐藏完成；动画尚未结束便卸载时拒绝该次关闭 Promise，调用方不得继续依赖关闭成功的剧情。隐藏失败同样 reject。无动画关闭等待隐藏完成；unmount-phone 通知对应会话的关闭等待者。
- waitForPhoneClosed(signal?) 等待下一次通知；在关闭之后调用不会立即完成。emitPhoneClosed 清 pending、唤醒当前全部 waiter，不按应用/Preview 区分。

## 5. 作者编辑器 schema

```ts
// registerPhoneApp 的 styleEditor 属性
styleEditor: {
  label: "商店", icon: "store", order: 100, settingsModuleId: "shop",
  contentItems: [{
    id: "title", group: "文案", label: "标题",
    fieldType: "string", defaultValue: "商店",
  }],
  pages: [{
    id: "shop-copy", label: "文案", order: 10,
    contentItemIds: ["title"], preview: "placeholder",
  }],
},
```

省略 styleEditor 不显示分区；提供对象默认启用，enabled:false 禁用。settingsModuleId 默认为应用 ID，字段可单独覆盖。对应键必须在业务模块 settings 中定义；编辑器 schema 不自动创建 settings 或存档。

字段规则：

- 必填 id/group/label/fieldType/defaultValue；defaultValue 一律字符串，boolean 用 true/false 字符串。
- settingKey 默认等于 id；settingsModuleId 覆盖分区；allowEmpty 保留空串。
- 支持 string/color/enum/asset/shortcut/boolean/number/character；string 可 multiline，enum 用 enumOptions。
- assetKind 支持 image/audio/video/any，省略按图片；音频显示标识与试听控件。
- number 可 min/max/正数 step；通用编辑器写入真实 number 并限制边界。
- dependsOn:{contentItemId,equals} 控制是否可编辑。
- character 在注册时保留，并交给角色选择控件渲染。

pages 支持 ready/comingSoon，contentItemIds 引用分区字段。preview 支持 desktop/chat/phone-call/placeholder，注册与通用预览分支保持一致。仅使用自定义面板的页面可以省略 contentItems。

resolveCustomPanes({pageId,values,revision,bump}) 返回 {left,center,right} 或 null，null 回落通用界面。values 为字符串快照，写入成功调用 bump。数组类业务配置可自定义三栏并使用业务 settings bridge。

注册限制：字段最多 80 项，页面最多 40 项，页面引用最多 80 项，枚举选项最多 40 项；缺失必要字段或不支持类型被过滤，超长文本截断。

## 6. main 公开 API 清单

| 分类 | 导出 |
| --- | --- |
| 宿主模块 | PhoneExtension、PhoneHudExtension、ToastExtension、PhoneEditorExtension、default |
| settings/save | buildPhoneHostSettingsFields、phoneHostSaveSchema |
| 手机 schema | PHONE_HOST_EDITOR_SCHEMA、PHONE_HOST_CONTENT_ITEMS、contentItemSettingKey、defaultEditorPageId、getSectionContentItem、resolveEditorPage、resolvePageContentItems、sortEditorPages |
| 聊天 schema | CHAT_APP_EDITOR_SCHEMA、CHAT_APP_CONTENT_ITEMS、CHAT_APP_EDITOR_PAGES、CHAT_SETTINGS_MODULE_ID、PHONE_SETTINGS_MODULE_ID；仅编辑描述，不安装聊天 APP |
| 分区解析 | resolveEditorSectionSchema、placeholderSectionSchema、buildSectionSchemaFromStyleEditor |
| 编辑器组件 | AssetUriField、AssetUriThumb、CharacterAssetSelect、EnumSelect、PhoneContentList、PhonePropertyPanel、PhoneCallPreview、PhonePreviewStatusBar、PhonePreviewStatusIcons |
| 枚举工具 | filterEnumOptions、mergeOrphanOption、resolveEnumLabel |
| 主题 | useTheme、ThemeProvider、FONT_SIZE_DEFAULT |
| 设置桥接 | readModuleSetting、writeModuleSetting、readPhoneAppearanceValues；读失败 undefined，写失败 false |
| 素材工具 | firstGlyph、resolveAssetUrl |

main 类型：EnumSelectProps、EnumSelectOption、ThemeContextValue、PhoneCallPreviewProps、PhonePreviewStatusBarProps、PhonePreviewStylePreset，以及 PhoneEditorContentItemSchema、PhoneEditorCustomPanes、PhoneEditorEnumOption、PhoneEditorFieldType、PhoneEditorPageSchema、PhoneEditorSectionSchema、ResolvePhoneEditorCustomPanes。

PhoneExtension 已绑定宿主 settings/save；仅复用 buildPhoneHostSettingsFields/phoneHostSaveSchema 不会安装运行时。

### 宿主剧情方法

| 方法 ID | 常规执行 | 即时执行 / skip |
| --- | --- | --- |
| mount-phone | 激活，不自动打开 | 同样激活 |
| unmount-phone | 禁用、关 UI、释放剧情消息 | 同样禁用 |
| manage-installed-apps | 安装/删除目录 APP，每块最多 8 个，可提示 | 改状态，不提示 |
| manage-app-enabled-state | 禁用/解禁 APP，每块最多 8 个，可提示 | 改状态，不提示 |
| show-message | 每块最多 8 条，等待推进，可接续/撤回 | 不展示消息 |

preferences/appAvailability 为 shared 存档列表。phoneMounted 是运行状态；注册、角标、pending、关闭锁、安全区均为内存桥接状态。内页业务数据归属各自模块。

## 7. plugin 公开 API 清单

| 分类 | 导出 |
| --- | --- |
| 注册 | registerPhoneApp、unregisterPhoneApp、getRegisteredPhoneApp、listRegisteredPhoneApps、subscribePhoneAppRegistry、notifyPhoneAppRegistryChanged |
| 打开关闭 | openPhoneApp、closePhoneApp |
| 关闭锁 | acquirePhoneCloseLock、isPhoneCloseLocked、subscribePhoneCloseLock |
| 角标 | setPhoneAppBadge、clearPhoneAppBadge、getPhoneAppBadge、getPhoneAppBadges、subscribePhoneAppBadges、formatPhoneAppBadgeLabel |
| 导航 | publishPhoneNavigate、subscribePhoneNavigate、getLatestPhoneNavigate、clearPhoneNavigatePending、emitPhoneClosed、waitForPhoneClosed |
| 安全区 | EMPTY_PHONE_SAFE_AREA、getPhoneSafeAreaInsets、normalizePhoneSafeAreaInsets、publishPhoneSafeAreaInsets |
| ID | formatStudioProgramRef、isPhoneAppId、isStudioProgramRefPath、parseStudioProgramRef、toPhoneAppId、toStudioProgramRefPath |
| 宿主桥接 | getPhoneSdkHost、installPhoneSdkHost、PHONE_SDK_GLOBAL_KEY、getPhoneSdkAppsRegistry、getPhoneSdkSlot |
| 引导 | addPhonePluginApp、clearPhonePluginApps、definePhonePluginRegistry、registerAllPhonePluginApps、bootstrapPhonePluginApps |
| 调试 | PHONE_SDK_DEBUG_FLAG_KEY、PHONE_SDK_DEBUG_PREFIX、createDebugPhoneAppRenderProps、isPhoneSdkDebugEnabled、phoneSdkDebug、phoneSdkDebugWarn |
| 诊断 | PHONE_SDK_DIAG_FLAG_KEY、PHONE_SDK_DIAG_PREFIX、capturePhoneSdkDiagSnapshot、diagnosePhoneAppLookup、isPhoneSdkDiagEnabled、phoneSdkDiag、phoneSdkDiagWarn |

plugin 类型：ClosePhoneAppOptions、NavigateRequest、OpenPhoneAppOptions、OpenPhoneAppResult、OpenPhoneAppWaitUntil、PhoneAppBadge、PhoneAppRegistration、PhoneAppRenderProps、PhoneAppStyleEditorMeta、PhoneNavigationController、PhoneSafeAreaInsets、PhoneSdkGlobalSlot、PhoneSdkHost、PhoneSdkRenderPropsAccessReport、StudioProgramRef、PhoneSdkDiagSnapshot、PhonePluginAppRegistrar，以及上述七个 PhoneEditor 类型。

OpenPhoneAppPosition 已从 `/plugin` 公开导出，也可用 `NonNullable<OpenPhoneAppOptions["position"]>`。

### 角标

```ts
import { setPhoneAppBadge, clearPhoneAppBadge } from "@ink-zenly/phone-sdk/plugin";
setPhoneAppBadge("shop", { mode: "dot" });
setPhoneAppBadge("shop", { mode: "count", count: 3 });
clearPhoneAppBadge("shop");
```

角标仅内存保存，无需先注册。数字超过 99 显示 99+，小于 1/非有限值清除；成功进入内页宿主自动清除，业务可按未读数据重新设置。

### 自定义底层宿主

PhoneSdkHost 实现 registerApp/unregisterApp/getApp/listApps；installPhoneSdkHost(host) 返回只解除 host 引用的 dispose，不清注册表或解绑导航。只安装注册表不够让 openPhoneApp 生效，还需 slot.navigation 的 PhoneNavigationController；标准 PhoneExtension 自动绑定，自定义宿主自行负责 ctx、通知、abort、清理。

当前没有成对的公开导航安装/卸载辅助函数。同一 globalThis 共享 host/navigation/pending/关闭锁，未提供宿主实例、Preview 或版本协商隔离。标准 onRegister 已成对清理 host/navigation，旧绑定卸载不会删除新绑定；显示失败、解绑或 abort 均清理本次关闭等待。

## 8. 调试与验收

```js
// 对应 Preview 控制台，默认均关闭；调试结束改回 false
globalThis.__LetsGalPhoneSdkDebug__ = true;
globalThis.__LetsGalPhoneSdkDiag__ = true;
```

检查顺序：manifest/模块导出 → 注册清单/队列 → 手机模块导航 ctx → pending/payload → 实际 UI 可见/交互 → 关闭通知 → 剧情继续。

- 程序 Preview 用于外观；快捷键、HUD、剧情消息、来电、Fragment 用剧本 Preview。
- 覆盖打开/深开/回桌面/关闭、锁、多次挂卸载、flow abort、显示失败、动画中途卸载。
- 独立宿主在只声明自身依赖的新工程安装构建，不能靠本仓根依赖验收发布包。
- 测试、类型检查、构建和实际宿主各自验证；构建通过不代表其他项通过。

当前没有统一 test script。已安装 CLI 的 tsx 时，在仓库根目录：

```powershell
$sdkTests = @(rg --files phone-sdk src -g '*.test.ts')
node --import ./cli/node_modules/tsx/dist/loader.mjs --test @sdkTests
node ./node_modules/typescript/bin/tsc --noEmit
pnpm run build
```

0.5.27 包含注册顺序、锁/导航监听器异常隔离、schema 规范化、绑定清理与关闭等待修复，并公开 OpenPhoneAppPosition。仓库 CLI 模板已补齐宿主四模块导出。Studio SDK 合同完整性与真实剧本 Preview 验证仍未完成；全局桥仍采用单活动导航宿主，不承诺并行独立手机实例或版本协商。

### 引导回调的归属

`bootstrapPhonePluginApps(registerAll, owner?)` 立即注册，并返回幂等的回调注销函数。多个 bundle 的回调可以共存；传入稳定的扩展包 ID 可在热重载时替换同一归属的旧回调。旧注销函数不会移除新回调。注销回调不等于注销应用，应用仍需调用 unregisterPhoneApp。

导航的 publishPhoneNavigate(request, owner?)、waitForPhoneClosed(signal?, owner?)、emitPhoneClosed(owner?) 可带同一会话标识；标准宿主使用 flow.signal，避免旧会话关闭误清新 pending 或唤醒新等待。无 owner 的旧调用保留广播兼容语义。

聊天 schema 由应用注册声明，SDK 不再优先覆盖它；兼容的聊天数组页与桌面目录页适配器仅在所属分区生效，自定义面板优先。已有聊天编辑器导出继续保留，尚未拆成独立 editor 包。
