# LetsGal Studio 自定义手机扩展
> 扩展包 ID：`ink.zenly.ext-7a9373`（见 `extension.json` → `id`）｜ 程序 UI 模块：`phone`、`phone-toast`  
> 扩展版本：`0.2.0` ｜ `@ink-zenly/phone-sdk`：`0.4.4` ｜ `@ink-zenly/create-phone-app`：`0.3.2`  
> 要求 LetsGal Studio SDK：`>=1.9.0`

这是一个由剧情挂载、供玩家在游戏中打开的手机扩展。它提供四列 APP 桌面、作者可配置的安全启动动作、玩家个性化、剧情控制的 APP 安装与可用状态、逐条推进的聊天消息，以及独立、非阻塞、可堆叠的 Toast 通知 UI。

宿主实现位于 `@ink-zenly/phone-sdk`；本仓库 `src/` 负责扩展入口与 `src/<app-id>/` 内页。  
本 README 是当前版本使用说明，以 `extension.json`、`phone-sdk/` 与 `src/` 为准。历史方案文档如与本文冲突，请以本文为准。

## 目录
1. [能力范围与限制](#1-能力范围与限制)
2. [安装、构建与重载](#2-安装构建与重载)
3. [五分钟完成第一个手机](#3-五分钟完成第一个手机)
4. [运行生命周期与打开方式](#4-运行生命周期与打开方式)
5. [作者设置：外观、动作和 APP](#5-作者设置外观动作和-app)
6. [剧情管理 APP 与 Toast 通知](#6-剧情管理-app-与-toast-通知)
7. [玩家个性化与 shared 存档](#7-玩家个性化与-shared-存档)
8. [聊天角色预设与头像](#8-聊天角色预设与头像)
9. [`show-message` 聊天消息](#9-show-message-聊天消息)
10. [Preview、缓存与多预览隔离](#10-preview缓存与多预览隔离)
11. [调试、验收与常见问题](#11-调试验收与常见问题)
12. [源码结构](#12-源码结构)
13. [内页应用完整开发流程](#13-内页应用完整开发流程)
14. [脚手架 create-phone-app 命令速查](#14-脚手架-create-phone-app-命令速查)
15. [宿主扩展包 id 注入（phone-sdk ≥ 0.4.0）](#15-宿主扩展包-id-注入phone-sdk--040)

## 1. 能力范围与限制
### 已提供的能力
- 苹果手机（iPhone）与安卓手机两套外壳预设。
- 四列 APP 桌面；支持键盘、鼠标和语义快捷键打开。
- 作者配置的程序 UI、可视化 UI、内置系统界面、快速存档/读档/全屏等安全动作。
- **手机内部应用（Phone SDK）**：第三方通过 `@ink-zenly/phone-sdk` 注册界面，点击后在手机屏幕内打开（不关手机）；底部 Home 回桌面。
- APP 的默认排序、默认预装、默认可用、锁定玩家编辑，以及剧情中的安装、删除、禁用、解禁。
- 已安装但被禁用的 APP 仍保留在桌面，图标与名称变暗且不能启动；只有删除才会移出桌面。
- APP 管理方法可选显示 Toast：支持九宫格位置、上下堆叠、独立入场/退场动画和自动消失；剧情快进或跳过时不显示。
- 玩家修改非锁定 APP 的名称、图标和动作绑定；作者可分别控制背景和图标上传权限。
- 资产角色聊天头像、消息状态、消息组接续、每个消息组单独指定的聊天背景。
- 聊天角色预设可选气泡样式（字号、文字/名称/对话框颜色、自定义 CSS）；未填字段使用默认外观，填写 `customCss` 时其声明优先于结构化字段。
- 所有玩家偏好与剧情 APP 状态写入扩展的 `shared` 存档。

### 当前不提供的能力
- 玩家不能长按、拖动或重排桌面图标；排序只由作者设置中的“默认排序”决定。
- 聊天气泡不支持自定义显示名；名称仍取自资产角色，但可在预设或 `show-message` 中隐藏头像/名称。
- `show-message` 的聊天角色预设和 APP 管理方法不能根据设置动态生成真正的下拉选项；需要填写稳定 ID。
- Toast 的显示时长当前固定为约 2.6 秒；Inspector 可配置位置、堆叠方向和入退场动画，但不能逐块修改时长。
- 扩展不会执行任意 JavaScript、任意 URL 或终端命令。动作只能使用扩展允许的目标类型。
- 消息背景只在消息模式临时显示，不会被保存为普通手机背景。

## 2. 安装、构建与重载
### 环境要求
- Node.js
- pnpm
- 版本不低于 `1.9.0` 的 LetsGal Studio SDK

### 首次安装
在扩展根目录运行：
```powershell
pnpm install
npx tsc --noEmit
pnpm run build
```

Studio 从 `extension.json` 中配置的 `dist/index.mjs` 加载扩展。`pnpm run build` 会生成该文件。

根目录 `vite.config.ts` 会读取 `extension.json` 的 `id`，并通过 Vite `define` 注入 `__PHONE_HOST_EXTENSION_ID__`，供 phone-sdk 生成「打开手机」动作名与 DOM `data-*`（详见 [§15](#15-宿主扩展包-id-注入phone-sdk--040)）。

### 日常开发
需要持续编译时，可在自己的终端运行：
```powershell
pnpm run watch
```

修改 TypeScript、CSS、扩展设置或方法 schema 后，按以下顺序处理：
1. 执行 `pnpm run build`。
2. 在 Studio 中重载扩展；必要时重启 Preview。
3. 再检查扩展设置、方法表单和程序 Preview。

Studio 可能缓存静态 schema。若仍见到旧字段，例如旧版角色/立绘字段，说明缓存尚未刷新；不要依据旧表单继续配置新剧情。不要修改 `sdk/` 目录。

## 3. 五分钟完成第一个手机
以下步骤可验证从挂载、打开桌面到调用系统设置的完整流程。

### 第一步：配置一个系统界面动作
在扩展设置的 **动作 · 内置系统界面** 中新增一行：

| 字段 | 示例 |
| --- | --- |
| ID | `open-settings` |
| 名称 | `设置` |
| 系统界面 | `设置界面` |
| 说明 | `打开游戏设置` |

ID 建议只使用小写字母、数字和连字符，例如 `open-settings`、`phone-mail`。同一分组内 ID 必须唯一，也应避免与其他动作分组重复。

### 第二步：建立一个桌面 APP
在 **手机应用目录** 中新增一行：

| 字段 | 示例 |
| --- | --- |
| 应用 ID | `settings-app` |
| 应用名称 | `设置` |
| 应用图标 | 选择一张图片素材（可选） |
| 默认排序 | `10` |
| 游戏开始默认预装 | 开启 |
| 作者默认可用 | 开启 |
| 锁定玩家编辑 | 按需要选择 |
| 默认动作 ID | `open-settings` |

保存后，`默认动作 ID` 必须与第一步中的动作 ID 完全相同。

### 第三步：在剧情中挂载
在游戏开始后、允许玩家使用手机的位置添加 **调用扩展方法 → 挂载手机**：
```text
mount-phone
```

此方法不会自动弹出手机，只会启用手机能力。

### 第四步：在游戏 Preview 验证
运行**剧本 Preview**后，按默认快捷键 `ArrowUp` 打开手机。选择“设置”APP，再按 `Enter`、`Space` 或鼠标点击，应该能打开 Studio 的设置界面。

若没有配置任何有效 APP，扩展会使用内置的存档、读档、设置、历史、鉴赏和快捷工具 APP，便于先验证 UI 是否正常显示。

## 4. 运行生命周期与打开方式
### 生命周期
手机的可用状态只属于当前游戏/Preview 运行时，不会写入存档。建议在每个会进入游戏流程的起点重新调用挂载方法。

```text
游戏开始或允许使用手机的位置
  └─ 挂载手机（mount-phone）
       ├─ 玩家可按快捷键打开普通手机
       ├─ 剧情可调用显示手机消息（show-message）
       ├─ 剧情可管理已配置 APP
       └─ 不再允许使用时卸载手机（unmount-phone）
```

| 方法 | 固定 ID | 正常播放 | 即时执行 / 快进 / 跳过 |
| --- | --- | --- | --- |
| 挂载手机 | `mount-phone` | 启用手机，不自动显示 UI。 | 同样启用。 |
| 卸载手机 | `unmount-phone` | 关闭普通/消息手机、结束等待并禁用功能。 | 同样卸载。 |
| 添加或删除手机 APP | `manage-installed-apps` | 修改 shared 安装状态；开启通知时显示 Toast。 | 修改状态，但不显示 Toast。 |
| 禁用或解禁手机 APP | `manage-app-enabled-state` | 修改 shared 可用状态；开启通知时显示 Toast。 | 修改状态，但不显示 Toast。 |
| 显示手机消息 | `show-message` | 显示消息并等待玩家逐条确认。 | 不显示、不等待。 |

`unmount-phone` 不会删除背景、图标、颜色、名称、动作绑定或 APP 剧情状态；再次 `mount-phone` 后，已有 shared 数据仍会生效。

### 普通手机的操作方式
| 输入 | 行为 |
| --- | --- |
| 配置的打开手机快捷键（默认 `ArrowUp`） | 未打开时：打开手机。打开后：若实际按键为 `ArrowUp`，则在网格中向上移动焦点。 |
| `ArrowDown` / `ArrowLeft` / `ArrowRight` | 在四列桌面中移动焦点。 |
| `Enter` / `Space` | 启动当前聚焦的 APP。 |
| 鼠标悬停 | 将焦点切到悬停 APP。 |
| 鼠标点击 | 启动对应 APP。 |
| `Escape`、关闭按钮、外部遮罩 | 关闭普通手机。 |

打开手机的语义动作 ID 为 **`<扩展包 id>.open-phone`**，其中扩展包 id 来自宿主工程的 `extension.json` → `id`（经构建注入）。本仓库当前为：

```text
ink.zenly.ext-7a9373.open-phone
```

若使用脚手架生成的其它宿主，动作名为 **`<你指定的 extension-id>.open-phone`**（例如 `com.acme.my-phone.open-phone`），请按该工程 `extension.json.id` 配置 Studio「输入按键」。

默认按键来自扩展设置的「打开手机快捷键」，默认值为 `ArrowUp`；可填写 `ArrowUp`、`KeyP`、`Ctrl+KeyP`、`F5` 等 SDK 支持的快捷键格式。作者也可在 Studio 的**输入按键**配置中为该语义动作重映射：玩家级输入映射优先于作者级映射，作者级映射优先于扩展设置的默认键。手机未挂载、消息手机正在显示、普通手机已显示或 UI 正在打开时，打开动作会被安全忽略。

## 5. 作者设置：外观、动作和 APP
### 5.1 外观设置
| 设置 | 用途与建议 |
| --- | --- |
| 手机标题 | 普通手机顶部标题，默认“手机”。消息模式标题固定为“消息”。 |
| 打开手机快捷键 | 打开普通手机的扩展默认键，默认 `ArrowUp`。可使用 `KeyP`、`Ctrl+KeyP`、`F5` 等 SDK 支持的格式；修改后会立即更新默认键。Studio「输入按键」中对 **`<扩展包 id>.open-phone`**（本仓即 `ink.zenly.ext-7a9373.open-phone`）的映射优先级更高。 |
| 手机样式预设 | `苹果手机（iPhone）` 为默认值，使用动态岛样式；`安卓手机（Android）` 使用听筒开孔和更紧凑圆角。预设不会覆盖下方颜色和背景。 |
| 手机弹出位置 | 控制普通手机在视口中的位置与滑入/滑出方向；可选左上、中上、右上、左下、中下、右下、中部。 |
| 默认背景色 | 没有图片和 CSS 背景时使用的底色，例如 `#172036`。 |
| 默认背景图 | 作者默认壁纸。 |
| 默认 CSS 背景值 | 一个安全的 CSS `background` 值，例如 `linear-gradient(135deg, #182848, #4b6cb7)`。 |
| 默认强调色 | 控制焦点、我方消息气泡等强调色。 |
| 默认外壳颜色 | 控制手机外壳颜色。 |

CSS 背景只能是单个背景值：不能包含 `url()`、`;`、`{}` 或 `@` 规则。若 CSS 无效，扩展会回退到背景图或背景色。

### 5.2 先创建动作，再绑定 APP
一个 APP 只能通过“默认动作 ID”引用已存在的动作。推荐先配置动作，再配置 APP。当前设置表单提供四种作者动作分组：

| 分组 | 适用场景 | 关键引用格式 |
| --- | --- | --- |
| 动作 · 程序 UI | 打开程序 UI。 | 本扩展填 `ui-id`；跨扩展填 `extension-id/ui-id`；都不要加 `@`。 |
| 动作 · 可视化 UI | 打开项目或扩展的可视化 UI。 | 项目 UI 填 `ui-name`；扩展 UI 填 `@extension-id/ui-name`。可指定是否模态。 |
| 动作 · 内置系统界面 | 打开标题、工具栏、存档、读档、设置、历史或鉴赏。 | 从下拉框选择系统槽位。 |
| 动作 · 手机内部方法 | 直接执行预置安全命令。 | 只能选择快速存档、快速读档或切换全屏。 |
| 动作 · 手机内部应用 | 在手机屏幕内打开第三方 Phone SDK 应用。 | 填写与 `registerPhoneApp({ id })` 一致的应用 ID；不关闭手机。 |

每个动作都有 **ID、名称、说明**。ID 是稳定引用，不建议在项目发布后随意改名；改名后，已绑定的 APP 和玩家历史绑定都不会自动迁移。

> 扩展运行时只使用受限目标。它不会执行任意脚本或命令。若需从手机触发另一个扩展方法，应创建一个 Fragment，在其中放置正式的“调用扩展方法”块，再把该 Fragment 作为目标适配调用；SDK 不支持按字符串直接执行另一扩展方法。

### 5.3 配置 APP 目录
**手机应用目录**每行代表一个作者定义的 APP，最多 40 个。字段含义如下：

| 字段 | 作用 |
| --- | --- |
| 应用 ID | 稳定且唯一的 APP 标识；用于剧情 APP 管理方法。建议 kebab-case。 |
| 应用名称 | 默认显示名称，最多 24 个字符。 |
| 应用图标 | 作者默认图标；玩家有权限时可覆盖。 |
| 默认排序 | `0`～`9999` 的整数；数字越小越靠前，相同数值保持设置表格行顺序。 |
| 游戏开始默认预装 | 新游戏默认是否安装此 APP。关闭后，需剧情“添加到手机”才会出现。 |
| 作者默认可用 | 已安装 APP 的初始交互状态。关闭后仍显示暗化图标，需剧情“解禁 APP”才能恢复启动。 |
| 锁定玩家编辑 | 开启后，玩家不能修改该 APP 的名称、图标或动作绑定。 |
| 默认动作 ID | 必须引用一个已配置的动作 ID。无效引用会导致该 APP 不进入桌面解析结果。 |

作者顺序始终优先：玩家不能拖拽图标，剧情安装、删除、禁用、解禁也不会改变排序。

### 5.4 内置目录回退
没有有效的作者 APP 目录时，扩展会回退到内置目录：存档、读档、设置、历史、鉴赏和快捷工具。作者使用同 ID 创建动作时可覆盖相应内置动作。该回退仅为保证手机可用，不应代替正式项目配置。

## 6. 剧情管理 APP 与 Toast 通知
APP 的安装状态与可用状态彼此独立：**删除**会把 APP 从桌面移除；**禁用**会保留已安装图标，但图标和名称变暗、不可启动。作者设置提供新游戏默认值，剧情方法把覆盖值写入 `appAvailability` shared 存档。

| 状态 | 作者设置字段 | 剧情方法 | 效果 |
| --- | --- | --- | --- |
| 已安装 | 游戏开始默认预装 | 添加或删除手机 APP | 决定 APP 是否属于玩家手机；删除后不显示。 |
| 可用 | 作者默认可用 | 禁用或解禁手机 APP | 禁用后仍显示暗化图标；解禁后恢复亮度和交互。 |

### 6.1 添加或删除手机 APP
1. 在 Fragment 中选择 **调用扩展方法 → 添加或删除手机 APP**。
2. `操作`选择“添加到手机”或“从手机删除”。
3. 在第 1～8 个 APP ID 中填写“手机应用目录”的应用 ID。
4. 运行到该 Block 时才修改状态；未知 ID 会被忽略并写入调试日志。

删除 APP 不会清除玩家保存的名称、图标或动作绑定；之后重新安装时这些偏好仍可恢复。若不希望 APP 在剧情安装前出现，请关闭该目录项的“游戏开始默认预装”，并使用新存档测试或先执行一次删除。

### 6.2 禁用或解禁手机 APP
1. 在 Fragment 中选择 **调用扩展方法 → 禁用或解禁手机 APP**。
2. `操作`选择“禁用 APP”或“解禁 APP”。
3. 填写第 1～8 个 APP ID。

禁用不等于删除：禁用后 APP 仍保留在桌面，但图标和名称变暗，点击不会启动目标；解禁后恢复正常。解禁不会重新安装此前已删除的 APP。两个 APP 管理方法可在手机未挂载时执行，玩家下次打开手机即可看到结果。

### 6.3 可选 Toast 通知
两个 APP 管理方法都可在 Inspector 开启 **显示 Toast 通知**。Toast 由独立程序 UI `phone-toast` 渲染，不依赖普通手机是否打开，不拦截鼠标，也不会阻塞剧情。

| Inspector 字段 | 默认值 | 说明 |
| --- | --- | --- |
| 显示 Toast 通知 | 关闭 | 开启后，正常剧情运行到此 Block 时显示操作结果。 |
| Toast 位置 | 中上 | 左上、中上、右上、左中、中部、右中、左下、中下、右下。 |
| Toast 入场动画 | 滑入 `slide-in` | 淡入、缩入、滑入、弹入。 |
| Toast 退场动画 | 滑出 `slide-out` | 淡出、缩出、滑出、弹出。 |
| 后续 Toast 显示于 | 下方 | 同一位置连续通知时，新 Toast 插入前一条的上方或下方。 |

Toast 文案使用“手机应用目录”中的**应用名称**，例如 `APP「设置界面」已添加到手机`；仅在目录名称无法解析时回退到应用 ID。一次操作多个 APP 时显示数量摘要。每条 Toast 独立计时，显示约 2.6 秒后先播放退场动画，再从队列移除。

为避免快进时大量通知遮挡界面：
- 正常 `run`：按 Inspector 设置显示 Toast。
- `runImmediately` / 快进：仍更新 APP 状态，但不显示 Toast。
- `skip` / 跳过：仍更新 APP 状态，但不显示 Toast。

编辑器内联卡会摘要显示 APP 操作、数量，以及 `Toast：显示/不显示`、位置、入场、退场和后续堆叠方向。所有参数仍以 Inspector 中保存的值为准。

## 7. 玩家个性化与 shared 存档
### 作者控制开关
| 开关 | 行为 |
| --- | --- |
| 允许玩家个性化手机 | 总开关。关闭后隐藏手机右上角齿轮，并忽略所有玩家覆盖；存档数据不会删除。 |
| 允许玩家更换背景 | 仅在总开关开启时生效，控制玩家是否可上传背景。 |
| 允许玩家更换图标 | 仅在总开关开启时生效，控制玩家是否可为非锁定 APP 上传图标。 |

### 玩家可以修改什么
在普通手机右上角打开齿轮后，玩家可按作者权限进行以下操作：
- 上传壁纸、填写安全 CSS 背景、选择强调色和外壳色。
- 修改非锁定 APP 的名称和图标。
- 为非锁定 APP 选择已存在的动作绑定。
- 恢复作者默认外观和 APP 配置。

背景图片只接受 PNG、JPEG、WebP，最大 2 MB；图标最大 512 KB。图片与偏好保存在 `preferences` shared save 中，跨普通存档槽位存在。剧情 APP 安装/可用状态则单独保存在 `appAvailability` shared save 中。

玩家不能通过个性化执行任意代码、加入任意动作或移动图标位置。旧版存档里如有图标排序数据，当前版本会忽略并清空该排序。

## 8. 聊天角色预设与头像
`show-message` 不直接选择角色或立绘，而是引用作者先创建的“聊天角色预设”。这样同一角色可在多处剧情中重复使用一致头像配置。

### 第一步：可选地建立头像素材库
在 **聊天头像素材库** 中添加自定义图片：
1. 填写唯一的“素材 ID”，例如 `mika-chat`。
2. 为“头像素材”选择图片。
3. 记住素材 ID，稍后填写到角色预设中。

仅当角色预设的头像来源选择“扩展素材库”时才需要此步骤。素材库最多 80 项。

### 第二步：建立聊天角色预设
在 **聊天角色预设** 中添加一行：

| 字段 | 说明 |
| --- | --- |
| 预设 ID | 在 `show-message` 中填写的稳定 ID，例如 `mika`。 |
| 资产角色 | Studio 项目中的角色资产。 |
| 头像来源 | 第一张立绘（默认）、角色默认头像、扩展素材库。 |
| 头像素材 ID | 仅头像来源为“扩展素材库”时填写；必须与头像素材库中的 ID 一致。 |
| 显示头像 | 默认开启；关闭后该预设消息不渲染头像。 |
| 显示名称 | 默认开启；关闭后气泡不显示角色名。 |
| 字体大小 | 可选；如 `14`、`16px`、`1rem`（等价 10–32px）；未填使用默认字号。 |
| 文字颜色 | 可选 hex（`#RGB` / `#RRGGBB` / `#RRGGBBAA`）；未填使用默认正文色。 |
| 名称颜色 | 可选 hex；未填使用默认名称色。 |
| 对话框颜色 | 可选 hex 或安全 `background` 值（与壁纸 CSS 背景同款规则）；未填使用默认气泡背景。 |
| 自定义 CSS | 可选多行声明列表（如 `padding: 4px; background: #111`）；与上方结构化字段并存时 **customCss 优先**；非法值整段丢弃。 |

消息气泡名称固定使用资产角色名称。预设会在消息开始时展开为快照（含上述五字段样式），因此运行中的消息不会被之后的设置修改改写。

在 `show-message` 方法块中，组级「显示头像 / 显示名称」为枚举：默认 **跟随预设**；可选 **显示** / **隐藏**，作用于本组全部消息且优先于预设。

### 气泡样式优先级与安全

| 规则 | 说明 |
| --- | --- |
| 未填默认 | 五字段均可留空；留空项不参与 inline style，保留 outgoing/incoming 默认 CSS。 |
| customCss 优先 | 结构化字段先映射到 bubble / 正文 / 名称；解析 `customCss` 后，同名声明（如 `background`、`font-size`、`color`）覆盖结构化值。 |
| 名称色扩展 | 结构化 `名称颜色` 作用于 `<strong>`；`customCss` 中可用 `--phone-name-color` 覆盖名称色。 |
| 安全消毒 | 字号限定 10–32px 等价；颜色仅 hex；`对话框颜色` 非 hex 时走壁纸同款 background 消毒；`customCss` 禁止 `url()`、`@`、花括号、`expression()`、`javascript:`，最长 2048 字符，任一非法声明则整段丢弃。 |

### 头像无法显示时的回退顺序
1. 预设指定的头像来源。
2. 兼容旧消息数据中的选中立绘。
3. 角色默认头像。
4. 角色第一张立绘。
5. 角色名称首字。

控制台出现 `[phone-avatar] image-load-failed` 时，请检查素材是否存在、角色是否有可用头像，以及 URI 是否可被 Studio 当前 Preview 访问。

## 9. `show-message` 聊天消息
### 前置条件
- 当前 Preview 已执行 `mount-phone`。
- 至少有一条有效聊天角色预设。
- 第一条消息有预设 ID 和非空内容。
- 在**剧本 Preview**中执行；扩展程序 Preview 不会执行剧情方法。

在 Fragment 中选择 **调用扩展方法 → 显示手机消息**。一个方法块最多包含 8 条消息。

### 9.1 单条与多条消息字段
| 字段 | 第 1 条 | 第 2～8 条 | 使用规则 |
| --- | --- | --- | --- |
| 聊天角色预设 ID | `presetId` | `presetId2`…`presetId8` | 第 1 条必填；后续留空时继承第 1 条预设。 |
| 内容 | `message` | `message2`…`message8` | 支持多行。空内容会跳过。 |
| 发送方 | `direction` | `direction2`…`direction8` | `incoming` 为对方消息（左侧）；`outgoing` 为我方消息（右侧）。 |
| 消息状态 | `status` | `status2`…`status8` | 默认 `read`。对方消息无论填写什么都会按已读显示。 |
| 被拉黑提示 | `blockedHint` | `blockedHint2`…`blockedHint8` | 只在我方状态为 `blocked` 时显示；默认“您的消息已发送，但被对方拒收”。 |

### 9.2 组级字段
| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| 接续上一组消息 `appendToExisting` | 否 | 将本组第一条及后续消息追加到当前消息会话。仅在前一组没有关闭、手机仍保留消息会话时使用。 |
| 本组结束后关闭手机 `closeAfterMessages` | 是 | 最后一条显示后，需要玩家再确认一次才会关闭并继续剧情。关闭后不能再接续。 |
| 手机消息显示位置 `popupPosition` | 右下 | 只控制当前消息手机的位置，不影响普通手机位置。 |
| 聊天手机背景图 `storyBackground` | 空 | 可选图片素材。只在本消息组的消息模式中覆盖手机屏幕背景。 |
| 显示头像 `showAvatar` | `inherit` | 本组共用枚举：`inherit` 跟随各条预设；`show` / `hide` 强制显示或隐藏。 |
| 显示名称 `showName` | `inherit` | 同上，控制名称。 |

`storyBackground` 不会写入 shared 存档，也不会修改普通手机壁纸。留空时立即使用当前的默认手机背景：作者背景，或在允许个性化时已生效的玩家壁纸/安全 CSS 背景。接续消息时以**当前块**为准：选择新图会替换上组背景，留空会撤销上组自定义图并恢复默认背景。

消息模式依然只在手机**屏幕内部**叠加 `rgba(0, 0, 0, 0.4)` 遮罩；不会遮暗手机外部或游戏画面，自定义聊天背景也保留该遮罩。

### 9.3 消息状态
| 我方状态 | 显示效果 |
| --- | --- |
| `sending` | 气泡左下角外侧显示旋转 loading 图标。 |
| `unread` | 气泡左下角外侧显示“未读”。 |
| `read` | 气泡左下角外侧显示“已读”。 |
| `failed` | 气泡左下角外侧显示红色圆形感叹号。 |
| `blocked` | 显示红色感叹号；提示文本作为独立居中行放在消息行下方，不改变气泡宽度。 |

对方消息始终显示已读标记，位置在气泡右下角外侧。

### 9.4 播放和推进规则
- 每组的第一条消息会立即出现。
- 玩家点击手机消息区域，或按 `Enter` / `Space`，会每次追加一条。
- 所有消息已经显示后，若“本组结束后关闭手机”为开启，玩家还需再确认一次；手机关闭动画结束后剧情才继续。
- 若“本组结束后关闭手机”为关闭，当前列表保留，剧情会进入下一方法块，可供下一组使用 `appendToExisting` 接续。
- `Escape` 会关闭当前消息手机并结束等待。

### 9.5 超过 8 条消息时如何接续
假设要显示 17 条消息，使用三个 `show-message` 块：

| 组 | 条数 | 接续上一组 | 本组结束后关闭手机 |
| --- | ---: | --- | --- |
| 第 1 组 | 1～8 | 否 | 否 |
| 第 2 组 | 9～16 | 是 | 否 |
| 第 3 组 | 17 | 是 | 是 |

组与组之间不要调用 `unmount-phone`。第二组开始若仍填写“接续：否”，会创建新的列表而不是附加到前一组。若前一组已经关闭，也不能再接续。

## 10. Preview、缓存与多预览隔离
### 应使用哪一种 Preview
| Preview | 用途 | 不能验证的内容 |
| --- | --- | --- |
| 剧本 Preview | 执行 Fragment、`mount-phone`、APP 管理、`show-message`、消息推进与接续。 | 不适合单独检查未挂载时的完整剧情流程。 |
| 扩展程序 Preview | 直接显示 `phone` 程序 UI，用于检查桌面外观、背景、图标和布局。 | 不会执行剧情挂载，不能用打开手机快捷键打开，不能启动 APP，也不能调用剧情消息。 |

### 多 Preview 互不干扰
每个 Studio Preview 都拥有独立手机运行时。每个 Preview 必须自行运行 `mount-phone`；一个 Preview 中的消息、关闭、卸载和等待状态不会阻塞另一个 Preview。调试日志中，同一 Preview 的事件应使用同一个 `scopeId`。

### 更新后表单没有变化
依次执行：
```powershell
pnpm run build
```
然后重载扩展或重启 Preview。当前 APP 管理方法表单应包含 Toast 开关、九宫格位置、入场动画、退场动画和上下堆叠方向；`show-message` 表单应包含 `presetId`、`message`、`direction`、`status`、`blockedHint`、`storyBackground` 及其第 2～8 条对应字段。

### 实验性：编辑器内联方法卡片
扩展会尝试将剧情编辑器中的“调用扩展方法”块显示为摘要卡片。当前会识别“挂载手机”“卸载手机”“添加或删除手机 APP”“禁用或解禁手机 APP”和“显示手机消息”。APP 管理卡会显示操作、APP ID、数量以及 Toast 的开关、位置、入场动画、退场动画和后续堆叠方向；消息卡会显示首条消息、消息数量、接续/关闭方式及自定义背景等摘要。

这不是 SDK 的正式自定义 block-renderer 接口，而是受限的 Studio DOM/Fiber 兼容层：它不修改 Fragment 数据、不执行参数写回，也不阻止原生编辑器事件。点击卡片后仍在 Inspector 中编辑全部参数；卡片按当前 Block ID 读取参数，并在 Inspector 输入或选择变化后刷新。若 Studio 更新导致 DOM 结构不兼容，扩展会静默保留原生“参数在 Inspector 编辑”块，不影响剧情运行或玩家端手机/Toast UI。修改后需重新构建并重载扩展。

## 11. 调试、验收与常见问题
### 发布前验收清单
- [ ] 游戏流程中已在适当位置调用 `mount-phone`。
- [ ] 未挂载时快捷键不打开手机；挂载后可以正常打开和关闭。
- [ ] 方向键、鼠标、`Enter` / `Space` 都能选择或启动同一个 APP。
- [ ] APP 的默认动作 ID 都指向有效动作。
- [ ] 安装/删除、禁用/解禁后的状态正确：删除会移除 APP，禁用只会暗化并阻止启动。
- [ ] 开启 Toast 的管理块能显示应用名称、正确位置、上下堆叠及所选入场/退场动画。
- [ ] 快进或跳过 APP 管理块时状态仍更新，但不会产生 Toast。
- [ ] 玩家个性化开关、锁定 APP 和图片大小限制符合预期。
- [ ] 消息可逐条推进；多组接续、背景替换与留空回退符合预期。
- [ ] 程序 Preview 能显示默认桌面；剧本 Preview 能执行完整剧情流程。

### 常见问题
| 现象 | 优先检查项 |
| --- | --- |
| 打开手机快捷键没有反应 | 当前剧情是否已执行 `mount-phone`；快捷键格式是否有效；Studio 是否存在更高优先级映射；是否已有普通/消息手机显示。 |
| APP 没有出现 | 检查是否默认预装、是否被剧情删除，以及默认动作 ID 是否有效。禁用不会移除图标，只会暗化。 |
| APP 图标变暗且不能点击 | 该 APP 已被禁用；运行“解禁 APP”恢复。 |
| APP 点击后无目标 | 检查“默认动作 ID”是否和动作 ID 完全一致，动作引用格式是否正确。 |
| Toast 没有显示 | Inspector 是否开启“显示 Toast 通知”；是否为正常剧情 `run`；快进、`runImmediately` 和 `skip` 会主动抑制 Toast；是否已重载包含 `phone-toast` 的新构建。 |
| Toast 仍显示 APP ID | 检查“手机应用目录”中该 ID 对应的应用名称；无法解析名称时才回退到 ID。 |
| Toast 动画或 Block 摘要没有更新 | 执行 `pnpm run build`，重载扩展并重启 Preview；旧值 `fade/scale/slide/bounce` 会兼容映射到新入退场值。 |
| `show-message` 没有界面 | 已挂载；第 1 条预设 ID 存在；内容非空；正在剧本 Preview 运行。 |
| 接续组没有附加 | 前一组必须为“不关闭”，本组必须开启 `appendToExisting`，组间不能卸载手机。 |
| 最后一条后剧情停住 | 这是正常确认步骤；再点击消息区域或按 `Enter` / `Space`。 |
| 头像只显示首字 | 检查角色、头像来源、素材 ID、素材 URI；查看 `[phone-avatar] image-load-failed`。 |
| 程序 Preview 黑屏、字段陈旧 | 重新构建并重载扩展/重启 Preview，清除 UI 或 schema 热更新缓存。 |

### 日志说明
控制台会输出 `[phone-debug]` 与 `[phone-avatar]`：
- 会话问题请保留同一时间段的 `phone-mounted`、`runtime-resolved`、`sequence-request`、`sequence-created`、`ui-show-start`、`listener-subscribe`、`sequence-publish`、`advance-received`、`sequence-error`、`sequence-finally`，并保留对应的 `scopeId`。
- APP 状态问题请保留 `app-management-request` 与 `app-availability-updated`；重点检查 `operation`、`appliedIds` 和 `ignoredIds`。
- Toast UI 挂载失败时会记录 `app-notification-show-failed`。
- 头像问题请保留 `image-load-failed` 的 `rawUri`、`resolvedUrl` 和图片尺寸。

## 12. 源码结构
```text
extension.json                 # 扩展清单（id / entry / sdkVersion）
vite.config.ts                 # 构建；注入 __PHONE_HOST_EXTENSION_ID__
src/
├─ index.tsx                   # 扩展入口：导出 Phone/Toast，bootstrap 内页清单
├─ vite-env.d.ts
└─ <app-id>/                   # 内页应用（如 demo-shop/）：registerPhoneApp + UI
phone-sdk/                     # 发布包 @ink-zenly/phone-sdk（0.4.0+）
├─ src/index.ts                # main：宿主 PhoneExtension / ToastExtension
├─ src/client/                 # → @ink-zenly/phone-sdk/plugin（内页 API）
└─ src/host/
   ├─ host-extension-id.ts     # 宿主扩展包 id：Vite 注入优先，否则默认回退
   ├─ phone/                   # 目录、扩展、UI、CSS
   ├─ toast/
   └── studio/                 # 编辑器内联卡片等
cli/                           # 发布包 @ink-zenly/create-phone-app（0.3.2+）
sdk/                           # 本项目使用的 Studio SDK；不要直接修改
```

三层 ID 勿混淆：

| 层级 | 来源 | 本仓 / 脚手架示例 | 是否由用户自定义 |
|------|------|-------------------|------------------|
| **宿主扩展包 id** | 宿主 `extension.json` → `id` | 本仓 `ink.zenly.ext-7a9373`；脚手架 = `--extension-id` | 是（脚手架必填，互不从 app-id 推导） |
| **内页程序 id（app-id）** | `registerPhoneApp({ id })` / `src/<app-id>/` | `demo-shop` | 是（`--app-id` / `add`） |
| **宿主模块 id** | `@extension({ id })` | `phone` / `phone-toast` | 否（SDK 固定） |

## 13. 内页应用完整开发流程

「内页应用」指在**手机屏幕内部**打开的 UI：点击桌面 APP 后不关闭手机，底部 Home / Escape 回到桌面。  
实现依赖 `@ink-zenly/phone-sdk/plugin`；运行时必须同时存在**手机宿主**（`PhoneExtension`）。

API 细节见 [`phone-sdk/README.md`](phone-sdk/README.md)；CLI 细节见 [`cli/README.md`](cli/README.md)。

### 13.1 先弄清三条路径

| 路径 | 适用 | 产物 |
|------|------|------|
| **A. 本仓库宿主内开发** | 跟本扩展一起联调、示例（如 `demo-shop`） | 打进本仓 `dist/index.mjs`；也可用 `pack` 再拆分发 |
| **B. 新建独立宿主再开发** | 新项目从零搭手机 + 内页 | `create` 生成宿主工程；内页在 `src/<app-id>/` |
| **C. 分发标准内页包** | 给别人只装「某个 APP」，对方已有宿主 | `pack` → `release/`，与宿主扩展**同时启用** |

```text
路径 A / B（开发期）
  宿主工程
    ├─ PhoneExtension / ToastExtension   ← phone-sdk main
    ├─ src/index.tsx                     ← bootstrap 注册表
    └─ src/<app-id>/                     ← 内页（plugin API）
         ↓ 可选 pack
路径 C（分发期）
  release/ 标准内页扩展（无宿主）
  + 玩家环境中的手机宿主扩展
```

### 13.2 必须对齐的 ID

脚手架自 **0.3.2** 起：宿主扩展包 id 与内页 app-id **分开指定**，不再生成 `ink.zenly.phone-app-*`。

| 名称 | 规则 | 谁指定 | 示例 |
|------|------|--------|------|
| **宿主扩展包 id** | `^[a-z][a-z0-9.-]*$`（可含点号）→ 宿主 `extension.json.id` | `create --extension-id` | `com.acme.my-phone` |
| **程序 ID / app-id** | `^[a-z][a-z0-9-]*$` → `registerPhoneApp({ id })`、`src/<app-id>/` | `create --app-id` / `add` | `demo-shop`、`my-mail` |
| **phoneAppId（作者设置）** | 填**程序 ID**，或 `宿主扩展包ID/程序ID` | Studio 手动配置 | `my-mail` |
| **动作 ID** | 作者自定；APP 目录「默认动作 ID」引用它 | Studio 手动配置 | `open-my-mail` |
| **内页包扩展包 id**（仅 pack） | 默认同 app-id；可用 `--extension-id` 覆盖 | `pack` 可选 | 默认 `my-mail` |

要点：

- **宿主扩展包 id ≠ 内页 app-id**。打开手机动作为 `<宿主扩展包 id>.open-phone`；桌面点开内页靠 `phoneAppId` = app-id。
- 开发期挂在本仓时，内页**没有**独立 `@extension`；程序 ID 仍必须稳定，将来 `pack` 后应与内页包 `@extension({ id })`（通常等于 app-id）一致。
- 宿主模块 id `phone` / `phone-toast` **不是**内页 app-id，也不要当成扩展包 id。

### 13.3 路径 A：在本仓库开发内页（推荐入门）

#### 步骤 1：生成或复制内页骨架

```powershell
# 在本仓根目录
pnpm create-phone-app add my-mail --title "邮件"
```

效果：

1. 创建 `src/my-mail/index.tsx`、`src/my-mail/app.tsx`
2. 自动改 `src/index.tsx`：增加 `import`，并把 `registerMyMailPhoneApp` 加入 `definePhonePluginRegistry(...)`

也可手写，结构对齐 `src/demo-shop/`：

```text
src/my-mail/
├─ index.tsx    # export PROGRAM_ID + registerXxxPhoneApp()
└─ app.tsx      # React UI，接收 PhoneAppRenderProps
```

注册函数约定：`register` + PascalCase(app-id) + `PhoneApp`  
（`my-mail` → `registerMyMailPhoneApp`）

#### 步骤 2：实现注册与 UI

`index.tsx` 最小形态：

```tsx
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { MyMailApp } from "./app";

export const PROGRAM_ID = "my-mail";

export function registerMyMailPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "邮件",
    description: "示例邮件内页",
    render: (props) => <MyMailApp {...props} />,
  });
}
```

`app.tsx` 使用宿主注入的 props（类型 `PhoneAppRenderProps`）：

| prop | 用途 |
|------|------|
| `appId` | 注册时的程序 ID |
| `closeApp` | **回桌面**（不关手机） |
| `closePhone` | 关闭整部手机 UI |
| `safeAreaInsets` | 刘海 / Home 指示条等安全区（px） |

内页路由、返回键、业务状态由你自己实现；宿主只负责「打开 / Home 回桌面 / 错误边界」。

入口侧保持清单注册（本仓现状）：

```tsx
// src/index.tsx
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";
import { registerMyMailPhoneApp } from "./my-mail";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp,
    registerMyMailPhoneApp,
  ),
);

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
```

`add` 命令会自动完成上述注入；手写时勿漏掉 `bootstrapPhonePluginApps`。

#### 步骤 3：构建并加载到 Studio

```powershell
pnpm install
pnpm watch
# 或改完后：pnpm build
```

在 Studio 中重载本扩展（入口 `dist/index.mjs`）。内页与宿主打在**同一个**扩展包里。

#### 步骤 4：作者设置——动作 + 桌面 APP（必做）

仅有代码注册**不会**自动出现图标，必须配置：

**4a. 动作 · 手机内部应用**

| 字段 | 示例 |
|------|------|
| ID | `open-my-mail` |
| 名称 | `邮件` |
| phoneAppId | `my-mail`（与 `PROGRAM_ID` **完全一致**） |
| 说明 | 可选 |

**4b. 手机应用目录**

| 字段 | 示例 |
|------|------|
| 应用 ID | `mail-app`（桌面项 ID，可与程序 ID 不同） |
| 应用名称 | `邮件` |
| 默认动作 ID | `open-my-mail`（与 4a 的动作 ID 一致） |
| 游戏开始默认预装 | 开启（开发期建议开） |
| 作者默认可用 | 开启 |

保存后重载扩展 / 重启 Preview。

#### 步骤 5：剧本 Preview 验证

1. 剧情中调用 `mount-phone`（或沿用已有挂载点）。
2. 按打开手机快捷键（默认 `ArrowUp`）。
3. 点击「邮件」：应在手机**屏幕内**打开内页，手机外壳仍在。
4. 点内页「回桌面」或宿主 Home：回到四列桌面，手机不关。
5. Escape / 遮罩：关闭手机（与内页 `closeApp` 不同）。

程序 Preview 只能看宿主 UI 壳，**不会**跑剧情挂载，也不适合验证内页点击链路；请用**剧本 Preview**。

#### 步骤 6（可选）：pack 成标准内页包

开发稳定后，若要单独分发该内页：

```powershell
pnpm create-phone-app pack my-mail --title "邮件"
# 若内页包的 extension.json.id 需要与 app-id 不同：
pnpm create-phone-app pack my-mail --title "邮件" --extension-id com.acme.my-mail-ext
```

- 默认输出到宿主根下 `release/`（已被 `.gitignore`）
- 自动 `pnpm install` + `pnpm build`
- 产物是**只有内页**的扩展：无 `PhoneExtension`，需与手机宿主**同时启用**
- 内页包 `extension.json.id` **默认等于 app-id**；可用 `--extension-id` 单独指定
- 对方宿主里 `phoneAppId` 仍填 **app-id** `my-mail`（或 `宿主扩展包id/my-mail`），不要填错成内页包 extension-id（除非二者相同）

### 13.4 路径 B：从零创建宿主 + 内页

适合不改本仓、单独开工程：

```powershell
pnpm dlx @ink-zenly/create-phone-app@0.3.2 create .\my-host `
  --template default `
  --extension-id com.acme.my-phone `
  --app-id my-shop `
  --title "我的商店"

cd .\my-host
pnpm install
pnpm watch
```

生成物已包含：

- 宿主入口（导出 Phone / Toast）；`extension.json.id` = 你指定的 `--extension-id`
- 首个内页 `src/my-shop/`（`--app-id`，与宿主 id **独立**）
- `vite` 注入 `__PHONE_HOST_EXTENSION_ID__`（见 [§15](#15-宿主扩展包-id-注入phone-sdk--040)）
- 依赖 `@ink-zenly/phone-sdk` 的 npm 版本（`^0.4.0`）与捆绑 `sdk/`

之后在该工程内继续 `add` 更多内页，或改 `src/my-shop/app.tsx`。  
Studio 中启用的是**该宿主扩展**的 `extension.json.id`（例如 `com.acme.my-phone`），不是本仓官方 id。

作者设置步骤与 [§13.3 步骤 4](#步骤-4作者设置动作--桌面-app必做) 相同，仅扩展换成新宿主。

### 13.5 路径 C：第三方独立扩展（手写 `@extension`）

若内页本身是完整 Studio 扩展（带自己的 `extension.json`），可在控制器 `onRegister` 中注册：

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

注意：

- `@extension({ id })` **必须**等于 `registerPhoneApp({ id })`
- 构建时将 phone-sdk **打进**内页 bundle；`react` / `@avg-studio/sdk` 保持 external
- 游戏中须**同时启用**手机宿主扩展，并在宿主设置里把 `phoneAppId` 指到该程序 ID

`pack` 产物即按此形态生成，一般无需手写脚手架。

### 13.6 依赖与构建约定

| 角色 | 依赖 |
|------|------|
| 宿主工程 | `@ink-zenly/phone-sdk`（main + 打进 bundle）、`@avg-studio/sdk`（external，本仓/模板为 `file:./sdk`） |
| 内页（plugin） | 只从 `@ink-zenly/phone-sdk/plugin` 引用 API；由宿主或内页包入口打包 |

本仓开发：`package.json` 可用 `"@ink-zenly/phone-sdk": "file:phone-sdk"`。  
脚手架默认写 npm `^0.4.0`，不要改成默认 `file:`。

### 13.7 内页开发检查清单

- [ ] 新建宿主时已分别指定 `--extension-id`（宿主包）与 `--app-id`（内页），二者不要混用
- [ ] `app-id` 合法（小写开头，仅 `a-z` / `0-9` / `-`）
- [ ] `registerPhoneApp({ id })` 与作者设置 `phoneAppId` 一致
- [ ] `src/index.tsx`（或独立扩展 `onRegister`）已注册该应用
- [ ] 已配置「动作 · 手机内部应用」+「手机应用目录」且默认动作 ID 互指正确
- [ ] `pnpm build` / `watch` 后已在 Studio 重载扩展
- [ ] 剧本 Preview 中已 `mount-phone`，能打开内页并 Home 回桌面
- [ ] 安全区：`padding` 使用了 `safeAreaInsets`
- [ ] 分发前若只要内页：已 `pack`，且说明需同时启用宿主；`phoneAppId` 指向 app-id

### 13.8 内页常见问题

| 现象 | 优先检查 |
|------|----------|
| 桌面没有图标 | 应用目录是否预装；默认动作 ID 是否有效；是否被剧情删除 |
| 点击无反应 / 打不开内页 | `phoneAppId` 是否与 `PROGRAM_ID` 一致；扩展是否已 build 并重载；是否已 `mount-phone` |
| 打开了却立刻回桌面或白屏 | 看控制台内页错误边界；检查 `render` 是否抛错 |
| 只有程序 Preview 能看见手机壳 | 改用剧本 Preview 验证内页 |
| pack 后对方打不开 | 对方是否启用了**宿主**；`phoneAppId` 是否仍指向同一程序 ID |
| 快捷键打开手机异常 | 宿主扩展包 id 是否已 Vite 注入（§15）；勿与内页 app-id 混淆 |

## 14. 脚手架 create-phone-app 命令速查

包名：`@ink-zenly/create-phone-app@0.3.2`（已发布）。内页完整流程见 [§13](#13-内页应用完整开发流程)；此处仅列命令。

| 命令 | 作用 |
|------|------|
| `create` | 生成**手机宿主**工程 + 首个内页（**必填** `--extension-id` 与 `--app-id`） |
| `add` | 在已有宿主添加 `src/<app-id>/` 并注入注册表（只需 app-id） |
| `pack` | 抽离 `release/` 标准内页包；`--extension-id` **可选**（默认 = app-id） |

`create` 两层 ID：

| 参数 | 写入 | 规则 |
|------|------|------|
| `--extension-id` | 宿主 `extension.json.id`、`package.json` name、Vite 注入 | `^[a-z][a-z0-9.-]*$` |
| `--app-id` | `src/<app-id>/`、`registerPhoneApp({ id })` | `^[a-z][a-z0-9-]*$` |

```powershell
# 本仓
pnpm create-phone-app create .\my-host --template default `
  --extension-id com.acme.my-phone --app-id my-shop --title "我的商店"
pnpm create-phone-app add my-mail --title "邮件"
pnpm create-phone-app pack my-mail --title "邮件"
pnpm create-phone-app pack my-mail --extension-id com.acme.my-mail-ext --title "邮件"

# 已发布包
pnpm dlx @ink-zenly/create-phone-app@0.3.2 create .\my-host --template minimal `
  --extension-id tiny-host --app-id my-shop --title "我的商店"
```

更多选项与模板说明见 [`cli/README.md`](cli/README.md)。

## 15. 宿主扩展包 id 注入（phone-sdk ≥ 0.4.0）

从 `0.4.0` 起，phone-sdk **不再**在业务逻辑里写死官方扩展包 id。宿主侧统一通过：

```ts
getPhoneHostExtensionId()   // → extension.json.id（构建注入）或默认回退
getOpenPhoneActionId()      // → `${hostId}.open-phone`
```

### 构建要求（宿主工程）

在 Vite 配置中注入（本仓与 `create-host-*` 模板已配置）：

```ts
define: {
  __PHONE_HOST_EXTENSION_ID__: JSON.stringify(/* 来自 extension.json.id */),
}
```

未注入时回退为兼容默认值 `ink.zenly.ext-7a9373`（便于旧工程平滑升级）。  
CSS 使用通用选择器 `[data-phone-root]` / `[data-phone-toast-root]`；DOM 仍写入真实宿主 id，便于调试。

### 验收要点

- 本仓 `pnpm build` 后，产物中注入值为 `ink.zenly.ext-7a9373`。
- 脚手架宿主构建后，动作与 `data-phone-root` 均为用户指定的 `--extension-id`，而不是强制官方 id。
- 模块 id `phone` / `phone-toast` **不会**随扩展包 id 改变。
