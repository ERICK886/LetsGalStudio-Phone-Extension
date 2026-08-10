# 聊天/相册集成回宿主仓 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将聊天与相册内页（UI + 设置 + 存档 + Fragment 方法）并入宿主扩展包 `ink.zenly.ext-7a9373` 1.3.0，工坊只需启用一个扩展。

**Architecture:** `StudioPhoneExtension extends PhoneExtension` 放在宿主 `src/`；显式合并 settings/saveSchema；业务源码在 `src/phone-chat/`、`src/phone-album/`。`phone-sdk` 仅增加可组合的手机壳 settings/save 工厂（不含聊天/相册业务）。内页仍经 `bootstrapPhonePluginApps` 注册。

**Tech Stack:** TypeScript、React、Vite、`@avg-studio/sdk`、`@ink-zenly/phone-sdk`（file:phone-sdk）、PowerShell

**Spec:** `docs/superpowers/specs/2026-08-10-reintegrate-chat-album-design.md`

## Global Constraints

- 宿主版本 **1.3.0**；扩展包 id 仍为 `ink.zenly.ext-7a9373`
- 程序 id 保持 **`phone`**（包装类不改 `@extension` id）
- Phone SDK 应用 ID：`ink.zenly.ext-7a9373/phone-chat`、`ink.zenly.ext-7a9373/phone-album`
- 聊天/相册 **业务不得** 进入 `phone-sdk/`（仅允许抽出手机壳 settings/save 工厂）
- 设置键前缀：`chat*` / `album*`；存档键前缀：`chat*` / `album*`
- 方法 id 保持原名：`send-friend-messages`、`await-player-reply`、`add-friend`、`remove-friend`、`add-album`、`remove-album`、`add-media`、`remove-media`、`set-media-albums`
- 不做旧独立扩展存档自动迁移；`demo-shop` 保留
- 作者注释：文件头含文件名、作者「池水三两升」、日期、版本；中文详细注释
- 独立仓 `app-015abe` / `app-cd6ad3` 本阶段不删

## File map（目标结构）

```text
phone-sdk/src/host/phone/extension/
  phone-host-schema.ts          # NEW：buildPhoneHostSettingsFields / phoneHostSaveSchema
  phone-extension.tsx           # 改为调用上述工厂
phone-sdk/src/index.ts          # 导出工厂（供宿主合并）

src/phone-chat/                 # 自 app-015abe/src 拷贝后改编（无独立 Extension 入口）
src/phone-album/                # 自 app-cd6ad3/src 拷贝后改编
src/studio-phone-extension.tsx  # NEW：包装类
src/index.tsx                   # bootstrap + export 包装类
package.json / extension.json / README.md / src/README.md
```

---

### Task 1: phone-sdk 抽出可合并的手机壳 schema 工厂

**Files:**
- Create: `phone-sdk/src/host/phone/extension/phone-host-schema.ts`
- Modify: `phone-sdk/src/host/phone/extension/phone-extension.tsx`（settings / saveSchema 改用工厂）
- Modify: `phone-sdk/src/index.ts`（导出工厂）

**Interfaces:**
- Produces:
  - `buildPhoneHostSettingsFields(s: SettingsBuilder): Record<string, unknown>`（实际类型与现有 `settings((s)=>…)` 内对象一致）
  - `phoneHostSaveSchema: { preferences: …; appAvailability: … }`（与现有 `defineSave` 字段一致）

- [ ] **Step 1: 新建 `phone-host-schema.ts`**

将 `PhoneExtension.static.settings` 回调体内的**整个对象字面量**原样移入：

```ts
/**
 * @file phone-host-schema.ts
 * @description 手机壳设置 / 存档字段工厂，供 PhoneExtension 与宿主包装类显式合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.5
 */
export function buildPhoneHostSettingsFields(s: /* 与 settings 回调参数同型 */) {
  return {
    phoneTitle: s.string("手机标题").default("手机"),
    // …其余字段与迁移前 phone-extension.tsx 中 settings 回调完全一致，一字不改…
  };
}

export const phoneHostSaveSchema = {
  preferences: { /* 与现网一致 */ },
  appAvailability: { /* 与现网一致 */ },
} as const;
```

- [ ] **Step 2: 改 `PhoneExtension` 使用工厂**

```ts
static settings = settings((s) => buildPhoneHostSettingsFields(s));
static saveSchema = defineSave({ ...phoneHostSaveSchema });
```

- [ ] **Step 3: 从 `phone-sdk/src/index.ts` 导出**

```ts
export { buildPhoneHostSettingsFields, phoneHostSaveSchema } from "./host/phone/extension/phone-host-schema";
```

- [ ] **Step 4: 构建冒烟**

Run: `cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373; npm run build`  
Expected: 成功（行为与改前相同）

- [ ] **Step 5: Commit**

```powershell
git add phone-sdk/src/host/phone/extension/phone-host-schema.ts phone-sdk/src/host/phone/extension/phone-extension.tsx phone-sdk/src/index.ts
git commit -m "refactor(phone-sdk): 抽出手机壳 settings/save 工厂供宿主合并"
```

---

### Task 2: 拷贝并落地 `src/phone-chat/`（模块化，去掉独立 Extension）

**Files:**
- Create: `src/phone-chat/**`（从 `C:\Users\20231\Documents\AVG-Extensions\app-015abe\src\**` 拷贝）
- Delete after adapt: 独立入口职责（见 Step 3）
- Modify: `src/phone-chat/constants.ts`、`runtime/settings.ts`、`runtime/store.ts`、`studio/chat-inline-cards.ts`

**Interfaces:**
- Produces:
  - `EXTENSION_ID = "ink.zenly.ext-7a9373"`
  - `PROGRAM_ID = "phone-chat"`
  - `registerChatPhoneApp(): void`
  - `readAuthorSettings(ctx)` 读取 **`chat*` 前缀** 设置键
  - `ChatSaveMap` 逻辑字段不变；`bindChatSave` 通过适配器读写 **`chat*` 存档键**
  - 导出方法实现函数供 Task 4 挂 `method()`（从原 `index.tsx` 抽出 `executeSendFriendMessages` 等，或保留 `runtime/actions.ts` + 薄 `methods.ts`）

- [ ] **Step 1: 拷贝源码**

```powershell
$src = "C:\Users\20231\Documents\AVG-Extensions\app-015abe\src"
$dst = "C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\src\phone-chat"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst
```

- [ ] **Step 2: 改 `constants.ts`**

```ts
export const EXTENSION_ID = "ink.zenly.ext-7a9373";
export const PROGRAM_ID = "phone-chat";
/** 宿主设置里 Phone SDK 应用 ID 完整路径 */
export const PHONE_APP_REF = `${EXTENSION_ID}/${PROGRAM_ID}`;
```

- [ ] **Step 3: 拆掉独立 `ChatController` 入口**

- 删除或大幅改写 `src/phone-chat/index.tsx`：不再 `export class ChatController`，改为：

```ts
export { registerChatPhoneApp } from "./ui/register";
export { PROGRAM_ID, EXTENSION_ID, PHONE_APP_REF } from "./constants";
// 再导出 Task 4 需要的 prepareRuntime / execute* / method 用到的 schema 字段构建函数
```

- 将原 `static settings` 字段定义挪到 `src/phone-chat/settings-fields.ts`：

```ts
/** 返回带 chat 前缀的设置字段，供 StudioPhoneExtension 合并 */
export function buildChatSettingsFields(s: /* settings 回调 s */) {
  return {
    chatAppTitle: s.string("应用标题").default("聊天"),
    chatChatsTabLabel: s.string("聊天 Tab 名称").default("聊天"),
    chatFriendsTabLabel: s.string("好友 Tab 名称").default("好友"),
    chatEmptyChatsHint: s.string("聊天列表空提示").default("暂无聊天，剧情推送消息后会出现在这里"),
    chatEmptyFriendsHint: s.string("好友列表空提示").default("暂无好友，请在扩展设置添加默认好友或用方法添加"),
    chatDefaultFriends: s.array("默认好友", (item) => ({
      characterId: item.character("角色"),
    }))
      .itemDefault({ characterId: "" })
      .maxItems(80)
      .addLabel("添加默认好友")
      .emptyHint("未配置时好友列表为空，可用「添加好友」方法动态加入。")
      .describe("开局出现在好友与可聊名单中的角色。名字与立绘读角色资产；详情属性值读变量。"),
    chatAttributeFields: s.array("好友详情属性槽", (item) => ({
      id: item.string("槽位 ID").default("mood"),
      label: item.string("显示名称").default("心情"),
      variableKey: item.string("变量名").default("friend.{characterId}.mood")
        .describe("支持占位 {characterId}，运行时替换为好友角色 ID 后 ctx.variables.get。"),
    }))
      .itemDefault({ id: "mood", label: "心情", variableKey: "friend.{characterId}.mood" })
      .maxItems(40)
      .addLabel("添加属性行")
      .emptyHint("不配置则详情页只显示头像与名字。")
      .describe("仅声明显示哪些行与显示名；具体值完全由变量决定，不在此填写。"),
  };
}
```

- 将原 `saveSchema` 挪到 `src/phone-chat/save-fields.ts`：

```ts
export const chatSaveSchemaFields = {
  chatFriendsExtra: { type: "list", persistence: "slot", default: [] as string[], label: "动态添加的好友" },
  chatFriendsRemoved: { type: "list", persistence: "slot", default: [] as string[], label: "动态隐藏的好友" },
  chatThreads: { type: "list", persistence: "slot", default: [] as ChatThread[], label: "聊天会话线程" },
  chatPendingReplies: { type: "list", persistence: "slot", default: [] as ChatPendingReplies[], label: "当前可选玩家回复" },
};
```

- [ ] **Step 4: 改 `runtime/settings.ts` 读前缀键**

```ts
// readAuthorSettings 内：
ctx.settings.get("chatDefaultFriends")
ctx.settings.get("chatAttributeFields")
ctx.settings.get("chatAppTitle")
ctx.settings.get("chatChatsTabLabel")
ctx.settings.get("chatFriendsTabLabel")
ctx.settings.get("chatEmptyChatsHint")
ctx.settings.get("chatEmptyFriendsHint")
```

订阅列表（供包装类 onRegister）导出常量：

```ts
export const CHAT_SETTINGS_KEYS = [
  "chatDefaultFriends",
  "chatAttributeFields",
  "chatAppTitle",
  "chatChatsTabLabel",
  "chatFriendsTabLabel",
  "chatEmptyChatsHint",
  "chatEmptyFriendsHint",
] as const;
```

- [ ] **Step 5: 改 `runtime/store.ts` 适配前缀存档键**

在 `bindChatSave` / 读写中，将 API 字段映射为：

| 逻辑名 | 存档键 |
| --- | --- |
| friendsExtra | chatFriendsExtra |
| friendsRemoved | chatFriendsRemoved |
| threads | chatThreads |
| pendingReplies | chatPendingReplies |

实现方式：在 `bindChatSave` 外包一层代理，或改 `ChatSaveMap` 为前缀键并全局替换读写。任选一种，保证类型与 `defineSave` 一致。

- [ ] **Step 6: 改 `studio/chat-inline-cards.ts`**

- `EXTENSION_ID` 已指向宿主包；方法匹配改为识别宿主包 id + 方法 id（去掉对 `ink.zenly.app-015abe` 的硬编码）。

- [ ] **Step 7: 抽出 method 挂载用模块 `src/phone-chat/methods.ts`**

把原 `ChatController` 上四个 `static … = method({…})` 的配置与 run 实现迁到可被包装类引用的工厂，例如：

```ts
export function attachChatMethods(Target: typeof Extension): void {
  // 不可运行时 attach；改为导出四个 method() 结果供类体赋值
}
```

更稳妥（推荐）：导出四个已构造好的 method 描述，供 Task 4：

```ts
export const chatSendFriendMessagesMethod = method({ id: "send-friend-messages", /* 与原文件一致 */ });
// await-player-reply / add-friend / remove-friend 同理
```

注意：`method()` 的 `run` 里 `this.save` 绑定的是**包装类**实例 save，须调用 `bindChatSave(this.save)`。

- [ ] **Step 8: Commit**

```powershell
git add src/phone-chat
git commit -m "feat(host): 迁入 phone-chat 模块并适配宿主包 id 与字段前缀"
```

---

### Task 3: 拷贝并落地 `src/phone-album/`

**Files:**
- Create: `src/phone-album/**`（从 `C:\Users\20231\Documents\AVG-Extensions\app-cd6ad3\src\**`）
- Modify: `constants.ts`、`runtime/settings.ts`、`runtime/store.ts`、`studio/album-inline-cards.ts`
- Create: `settings-fields.ts`、`save-fields.ts`、`methods.ts`（模式同 Task 2）

**Interfaces:**
- Produces: `registerPhoneAlbumPhoneApp`、`buildAlbumSettingsFields`、`albumSaveSchemaFields`、五个 method 导出、`ALBUM_SETTINGS_KEYS`

- [ ] **Step 1: 拷贝**

```powershell
$src = "C:\Users\20231\Documents\AVG-Extensions\app-cd6ad3\src"
$dst = "C:\Users\20231\Documents\AVG-Extensions\ext-7a9373\src\phone-album"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Recurse -Force "$src\*" $dst
```

- [ ] **Step 2: `constants.ts`**

```ts
export const EXTENSION_ID = "ink.zenly.ext-7a9373";
export const PROGRAM_ID = "phone-album";
export const PHONE_APP_REF = `${EXTENSION_ID}/${PROGRAM_ID}`;
```

- [ ] **Step 3: settings 前缀**

| 旧键 | 新键 |
| --- | --- |
| appTitle | albumAppTitle |
| allAlbumsLabel | albumAllAlbumsLabel |
| emptyAlbumHint | albumEmptyAlbumHint |
| defaultAlbums | albumDefaultAlbums |
| defaultMedia | albumDefaultMedia |

`buildAlbumSettingsFields(s)` 文案保持中文原样。

- [ ] **Step 4: save 前缀**

| 旧键 | 新键 |
| --- | --- |
| albumsExtra | albumAlbumsExtra |
| albumsRemoved | albumAlbumsRemoved |
| albumsMeta | albumAlbumsMeta |
| media | albumMedia |
| albumMedia | albumMediaLinks |
| mediaRemoved | albumMediaRemoved |
| cameraMedia | albumCameraMedia |
| cameraAlbumMedia | albumCameraAlbumMedia |
| cameraAlbumsMeta | albumCameraAlbumsMeta |

注意：旧键 `albumMedia` 与新键 `albumMedia`（原 `media`）易混——**原 `media` → `albumMedia`，原 `albumMedia` → `albumMediaLinks`**，并同步改 `store.ts` 全部读写。

- [ ] **Step 5: 去掉独立 `PhoneAlbumExtension` 类；抽出五个 method 到 `methods.ts`**

- [ ] **Step 6: 内联卡片改宿主包 id**

- [ ] **Step 7: Commit**

```powershell
git add src/phone-album
git commit -m "feat(host): 迁入 phone-album 模块并适配宿主包 id 与字段前缀"
```

---

### Task 4: `StudioPhoneExtension` 包装类 + 入口导出

**Files:**
- Create: `src/studio-phone-extension.tsx`
- Modify: `src/index.tsx`

**Interfaces:**
- Consumes: Task 1–3 全部工厂与 method、`registerChatPhoneApp`、`registerPhoneAlbumPhoneApp`、`CHAT_SETTINGS_KEYS`、`ALBUM_SETTINGS_KEYS`
- Produces: `StudioPhoneExtension`；`src/index.tsx` 将其导出为 `PhoneExtension`（并 `export default`）

- [ ] **Step 1: 写 `studio-phone-extension.tsx`**

```tsx
/**
 * @file studio-phone-extension.tsx
 * @description 工坊用手机扩展包装类：PhoneExtension + 聊天/相册设置、存档与方法。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 1.3.0
 */
import {
  defineSave,
  extension,
  settings,
  type ExtensionContext,
} from "@avg-studio/sdk";
import {
  PhoneExtension,
  buildPhoneHostSettingsFields,
  phoneHostSaveSchema,
} from "@ink-zenly/phone-sdk";
import { buildChatSettingsFields } from "./phone-chat/settings-fields";
import { chatSaveSchemaFields } from "./phone-chat/save-fields";
import { CHAT_SETTINGS_KEYS, readAuthorSettings as readChatSettings, cacheAuthorSettings as cacheChatSettings } from "./phone-chat/runtime/settings";
import { registerChatPhoneApp } from "./phone-chat/ui/register";
// album 同理 import…
import {
  chatSendFriendMessagesMethod,
  chatAwaitPlayerReplyMethod,
  chatAddFriendMethod,
  chatRemoveFriendMethod,
} from "./phone-chat/methods";
// album methods…

@extension({ id: "phone", label: "手机", category: "游戏系统" })
export class StudioPhoneExtension extends PhoneExtension {
  static settings = settings((s) => ({
    ...buildPhoneHostSettingsFields(s),
    ...buildChatSettingsFields(s),
    ...buildAlbumSettingsFields(s),
  }));

  static saveSchema = defineSave({
    ...phoneHostSaveSchema,
    ...chatSaveSchemaFields,
    ...albumSaveSchemaFields,
  });

  static sendFriendMessages = chatSendFriendMessagesMethod;
  static awaitPlayerReply = chatAwaitPlayerReplyMethod;
  static addFriend = chatAddFriendMethod;
  static removeFriend = chatRemoveFriendMethod;
  static addAlbum = albumAddAlbumMethod;
  static removeAlbum = albumRemoveAlbumMethod;
  static addMedia = albumAddMediaMethod;
  static removeMedia = albumRemoveMediaMethod;
  static setMediaAlbums = albumSetMediaAlbumsMethod;

  static onRegister(ctx: ExtensionContext): void {
    PhoneExtension.onRegister(ctx);
    cacheChatSettings(readChatSettings(ctx));
    cacheAlbumSettings(readAlbumSettings(ctx));
    for (const key of CHAT_SETTINGS_KEYS) {
      ctx.settings.subscribe(key, () => cacheChatSettings(readChatSettings(ctx)));
    }
    for (const key of ALBUM_SETTINGS_KEYS) {
      ctx.settings.subscribe(key, () => cacheAlbumSettings(readAlbumSettings(ctx)));
    }
    // 内页注册也可仅依赖 bootstrap；此处不重复 register，除非独立包曾在 onRegister 注册。
  }
}
```

说明：

- 若 `...buildPhoneHostSettingsFields(s)` 的 TypeScript 展开因 builder 链式类型失败，改为显式 `Object.assign` 或双重断言，但**运行时必须包含全部手机壳字段**。
- `@extension` 与父类同 id `phone`：若 Studio 因重复装饰报错，改为**不**在子类重复 `@extension`，仅 `export class StudioPhoneExtension extends PhoneExtension`，并确认 Studio 扫描到子类方法；以 Preview 能列出新方法为准（实现时二选一，优先「子类保留同 id 装饰」）。

- [ ] **Step 2: 改 `src/index.tsx`**

```tsx
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";
import { registerChatPhoneApp } from "./phone-chat/ui/register";
import { registerPhoneAlbumPhoneApp } from "./phone-album/ui/register";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp,
    registerChatPhoneApp,
    registerPhoneAlbumPhoneApp,
  ),
);

export { StudioPhoneExtension as PhoneExtension } from "./studio-phone-extension";
export { default } from "./studio-phone-extension";
export { ToastExtension } from "@ink-zenly/phone-sdk";
```

并保证 `studio-phone-extension.tsx` 有 `export default StudioPhoneExtension`。

- [ ] **Step 3: `npm run build`**

Expected: 成功；若类型错误，先修合并类型再提交。

- [ ] **Step 4: Commit**

```powershell
git add src/studio-phone-extension.tsx src/index.tsx
git commit -m "feat(host): StudioPhoneExtension 合并聊天/相册设置方法并切换入口"
```

---

### Task 5: 版本号与文档

**Files:**
- Modify: `package.json`、`extension.json` → `1.3.0`
- Modify: `README.md`、`src/README.md`（能力说明、phoneAppId、自检清单、更新日志）
- Modify: spec 状态改为「已实施」可选

- [ ] **Step 1: 升版本**

```json
"version": "1.3.0"
```

（`package.json` 与 `extension.json` 同步）

- [ ] **Step 2: README 要点（必须写入）**

- 本扩展**内置**聊天（`phone-chat`）与相册（`phone-album`），工坊只需启用本包  
- Phone SDK 应用 ID：`ink.zenly.ext-7a9373/phone-chat`、`ink.zenly.ext-7a9373/phone-album`  
- 本仓导出的 `PhoneExtension` = `StudioPhoneExtension`（含业务）  
- 迁移表：旧独立包 id → 新绑定（见规格 §4）  
- 更新日志 **1.3.0** 条目  

- [ ] **Step 3: 最终 build**

```powershell
cd C:\Users\20231\Documents\AVG-Extensions\ext-7a9373
npm run build
```

Expected: `dist/index.mjs` 生成成功  

- [ ] **Step 4: Commit**

```powershell
git add package.json extension.json README.md src/README.md
git commit -m "release: 扩展 1.3.0 — 内置聊天与相册内页"
```

---

### Task 6: 手工验收清单（执行者勾选）

- [ ] 仅启用 `ink.zenly.ext-7a9373`：挂载手机 → 桌面可打开聊天/相册  
- [ ] 设置面板可见手机壳 + 聊天 + 相册项；改标题后内页生效  
- [ ] 剧本调用全部 4+5 个方法，行为正常（含必须回复、角标）  
- [ ] `phone-sdk/` 下无 `phone-chat` / `phone-album` 业务目录  
- [ ] `rg "ink.zenly.app-015abe|ink.zenly.app-cd6ad3" src` 无残留错误引用（文档迁移说明除外）

---

## Spec coverage（自检）

| 规格项 | 任务 |
| --- | --- |
| D1–D5 决策 | Task 2–5 |
| 包装类合并 settings/save/methods | Task 1 + 4 |
| 内页 bootstrap 注册 | Task 4 |
| phoneAppId 宿主路径 | Task 2–3 constants + Task 5 文档 |
| 方法 id 保持 | Task 2–3 methods |
| 不做存档迁移 / 不删独立仓 | 全局约束 |
| 验收标准 | Task 5–6 |
| SDK 无业务 | Task 1 仅工厂 |

## Placeholder scan

无 TBD；存档键 `albumMedia` vs `albumMediaLinks` 已在 Task 3 Step 4 写明。
