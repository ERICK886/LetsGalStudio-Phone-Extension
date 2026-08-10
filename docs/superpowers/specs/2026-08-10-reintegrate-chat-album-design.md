# 设计规格：聊�?/ 相册内页集成回宿主仓

| �?| 内容 |
| --- | --- |
| 日期 | 2026-08-10 |
| 状�?| 待用户审阅规�?|
| 作�?| 池水三两�?|
| 宿主�?| `ink.zenly.ext-7a9373`（目标版�?**1.3.0**�?|
| 相关�?| `app-015abe`（聊天）、`app-cd6ad3`（相册） |

## 1. 背景与目�?

插件工坊要求�?*一个扩展包**即可提供手机宿主 + 聊天内页 + 相册内页（含设置、存档、Fragment 方法），不能再依赖额外安�?`ink.zenly.app-015abe` / `ink.zenly.app-cd6ad3`�?

### 1.1 已确认决�?

| # | 决策 |
| --- | --- |
| D1 | 交付形态：内页 UI 进宿主；设置�?Fragment 方法并入**宿主扩展产品**（非独立包） |
| D2 | 设置与存档：直接挂在宿主设置面板 / 宿主 `defineSave`（字段加前缀避免冲突�?|
| D3 | 代码落点：宿主包装层�?*�?*把聊�?相册业务写进 `phone-sdk` �?`PhoneExtension` |
| D4 | 实现路径：宿主子类包�?`PhoneExtension`（方�?A），显式合并 settings / saveSchema |
| D5 | 独立仓本阶段保留，工坊发行以宿主仓为准；不做旧独立扩展存档自动迁�?|

### 1.2 非目�?

- 不修�?`phone-sdk` 以内嵌聊�?相册业务逻辑
- 不删除或停更 `app-015abe` / `app-cd6ad3`（可继续作参考或日后 `pack`�?
- 不做独立扩展 �?宿主存档的自动数据迁移工�?
- 不改�?`demo-shop` 作为示例内页的存在（可保留）

## 2. 架构

```text
ext-7a9373/
  phone-sdk/                 # 仍为通用 SDK（PhoneExtension / Toast / plugin�?
  src/
    index.tsx                # bootstrap 内页 + export 包装�?
    studio-phone-extension.tsx
    phone-chat/              # �?app-015abe/src 拷贝并适配
    phone-album/             # �?app-cd6ad3/src 拷贝并适配
    demo-shop/               # 示例（保留）
```

### 2.1 包装�?

- 文件：`src/studio-phone-extension.tsx`
- `class StudioPhoneExtension extends PhoneExtension`
- `@extension`�?*继承父类语义**，保持程�?id �?`phone`（与现网手机方法路径兼容�?
- 职责�?
  - 合并 `static settings`（手机原�?+ 聊天分组 + 相册分组�?
  - 合并 `static saveSchema`（preferences / appAvailability + chat.* + album.*�?
  - 增加聊天 / 相册全部 `static �?= method(�?`
  - `onRegister`：先 `PhoneExtension.onRegister`（或 `super` 等价调用），再注册内页、订阅聊�?相册设置、绑定存�?
- **对外导出**：宿�?`src/index.tsx` 将包装类导出为工坊实际加载的手机扩展（可用别�?`PhoneExtension` 指向包装类，避免作者文档大改；需�?README 写明「本�?PhoneExtension = 带聊�?相册的包装类」）

### 2.2 内页注册

- `registerPhoneApp({ id: "phone-chat" })` / `registerPhoneApp({ id: "phone-album" })`
- 经现�?`bootstrapPhonePluginApps(definePhonePluginRegistry(�?)` 注册
- 作者绑�?Phone SDK 应用 ID（phone-sdk �?0.5.5）：
  - `ink.zenly.ext-7a9373/phone-chat`
  - `ink.zenly.ext-7a9373/phone-album`

### 2.3 设置字段命名（前缀�?

避免与手机壳字段撞名。建议约定：

| 来源 | 策略 | 示例 |
| --- | --- | --- |
| 手机�?| 保持 `PhoneExtension` 原字段名 | `openPhoneShortcut`、`apps`、`actions` |
| 聊天 | 前缀 `chat` 或分组命�?| `chatAppTitle`、`chatDefaultFriends`、`chatAttributeFields`�?|
| 相册 | 前缀 `album` | `albumAppTitle`、`albumDefaultAlbums`、`albumDefaultMedia`�?|

运行�?`readAuthorSettings` �?`ctx.settings` �?*带前缀**的键；拷贝代码时改映射，不改 UI 文案�?

### 2.4 存档字段

合并进宿�?`defineSave`�?

- 保留：`preferences`、`appAvailability`（shared�?
- 聊天（slot）：`friendsExtra`、`friendsRemoved`、`threads`、`pendingReplies`（可�?`chat` 前缀若与未来字段冲突；首版若无冲突可用原名，规格推荐 **�?`chat` 前缀** 以利辨识，如 `chatThreads`�?
- 相册：原 slot / shared 字段同样�?`album` 前缀后合�?

`bindChatSave` / `bindAlbumSave` 改为绑定宿主 `this.save` 上的对应字段�?

### 2.5 Fragment 方法

方法 ID **保持**独立扩展时的 id（降低剧本改写成本）�?

**聊天�?* `send-friend-messages`、`await-player-reply`、`add-friend`、`remove-friend`  
**相册�?* `add-album`、`remove-album`、`add-media`、`remove-media`、`set-media-albums`

Studio 方法�?target 形态变为挂在宿主程�?`phone` 下（具体路径�?Studio 扫描 `@extension({ id: "phone" })` 为准），不再使用 `ink.zenly.app-015abe/…`�?

内联卡片（`studio/chat-inline-cards.ts`、`album-inline-cards.ts`）随源码迁入，并改为匹配**宿主�?id** + 方法 id�?

## 3. 源码迁移步骤（逻辑�?

1. �?`app-015abe/src/**` 拷入 `ext-7a9373/src/phone-chat/`（调�?import 路径、`EXTENSION_ID` �?宿主�?id�?
2. �?`app-cd6ad3/src/**` 拷入 `ext-7a9373/src/phone-album/`
3. 去掉两侧独立的「整�?Extension 入口」职责：�?`ChatController` / `PhoneAlbumExtension` �?settings/methods/save **搬到** `StudioPhoneExtension`；原文件可改为只导出 `register*PhoneApp` + runtime/domain/ui
4. 更新 `src/index.tsx` 导出包装类与 Toast
5. 更新 README / `src/README.md` / 自检清单；版�?**1.3.0**
6. `npm run build` 验证；Preview 挂载手机 �?打开聊天/相册 �?跑各方法�?

## 4. 兼容性与迁移说明（文档）

| 旧（独立包） | 新（宿主一体） |
| --- | --- |
| 启用宿主 + 聊天�?+ 相册�?| 只启�?`ink.zenly.ext-7a9373` |
| `phoneAppId = ink.zenly.app-015abe/phone-chat` | `ink.zenly.ext-7a9373/phone-chat` |
| `phoneAppId = ink.zenly.app-cd6ad3/phone-album` | `ink.zenly.ext-7a9373/phone-album` |
| 方法 target 在独立扩展下 | 改到宿主 `phone` 程序下同名方�?|
| 独立扩展存档 | **不自动迁�?*；新开档或手动重配 |

## 5. 风险与缓�?

| 风险 | 缓解 |
| --- | --- |
| 子类 `settings` / `saveSchema` 覆盖父类导致手机设置丢失 | 显式合并对象/builder，合并后做一次设置面板冒�?|
| 字段前缀改动导致内页读设置为�?| 单一 `readAuthorSettings` 映射表；单测�?Preview 断言默认�?|
| 内联卡片仍匹配旧 extension id | 卡片解析改为宿主 `extension.json.id` |
| bundle 体积增大 | 可接受（工坊单包要求）；必要时后续再�?optional |

## 6. 验收标准

- [ ] 仅启用本宿主扩展即可：挂载手机、桌面打开聊天/相册内页
- [ ] 宿主设置可见手机 + 聊天 + 相册配置项，保存后内页生�?
- [ ] 聊天/相册 Fragment 方法在剧本可调用且行为与独立包一致（含必须回复、角标等�?
- [ ] Phone SDK 应用 ID 使用 `ink.zenly.ext-7a9373/phone-chat|phone-album`
- [ ] `phone-sdk` 包内无聊�?相册业务源码
- [ ] `npm run build` 成功；版本号 1.3.0 与文档一�?

## 7. 后续（本规格之外�?

- 独立�?README 标注「推荐使用宿主一体发行�?
- 可选：存档迁移脚本
- GitHub 推送（网络恢复后）�?npm 发宿主无关（宿主 private�?
