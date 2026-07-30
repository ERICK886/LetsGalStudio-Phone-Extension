# LetsGal Studio 手机扩展

> 扩展 ID：`ext-7a9373`  
> 模块 / 程序 UI ID：`phone`  
> 当前版本：`0.1.0`

这是一个用于 LetsGal Studio 游戏运行时的手机扩展。它提供可由玩家打开的应用桌面、作者可配置的安全动作目录、玩家 shared 个性化设置，以及可在剧情 Fragment 中逐条推进的手机聊天消息。

本文档描述**当前源码已实现的行为**。`docs/手机UI插件方案.md` 是历史方案与设计记录，其中的应用排序、隐藏、拖拽、主题 ID、完整 CSS 编辑器等内容尚未全部实现，不能以它替代本文档。

## 功能概览

- 默认由 `ArrowUp` 打开手机；手机必须先在剧情中挂载。
- 4 列应用网格，支持鼠标、方向键、Enter / Space 与 Escape。
- 作者用 Studio 的可视化 array 表单配置应用与动作目录。
- 玩家可以修改可编辑应用的名称、图标、动作绑定、背景、强调色、外壳色和安全背景 CSS。
- 个人设置写入 `shared` 存档；卸载手机不会删除这些数据。
- Fragment 方法支持“挂载手机”“卸载手机”“显示手机消息”。
- 消息单块最多 8 条，可用多块接续，角色立绘由 Studio 的角色/立绘选择器提供。
- 内置存档、读档、设置、历史、鉴赏、快速存读档与全屏等安全能力。

## 快速开始

### 1. 构建扩展

在工作区根目录执行：

```powershell
npm install
npx tsc --noEmit
npm run build
```

产物为 `dist/index.js`，由 `extension.json` 的 `entry` 字段加载。需要持续构建时可使用：

```powershell
npm run watch
```

### 2. 在剧情中启用手机

手机默认**未挂载**。在首次需要手机前，在 Fragment 中添加“调用扩展方法”动作，并选择：

```text
模块：手机
方法：挂载手机（mount-phone）
```

挂载不会自动弹出手机。之后玩家可按 `ArrowUp` 打开普通手机，剧情也可调用“显示手机消息”。


## 普通手机操作

手机打开后显示四列应用网格和状态栏。作者可在扩展设置中选择手机的弹出位置：`top-left`、`top-center`、`top-right`、`bottom-left`、`bottom-center`、`bottom-right` 或 `center`。手机会从对应方向滑入；系统启用“减少动态效果”时，动画会近乎即时完成。

| 输入 | 行为 |
| --- | --- |
| `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` | 在应用网格中移动焦点。到达边界时保持当前选择，不循环。 |
| `Enter` / `Space` | 启动当前焦点应用。 |
| 鼠标悬停 / 点击 | 悬停同步焦点；点击启动该应用。鼠标与键盘共用同一个启动流程。 |
| `Escape` | 关闭普通手机；如果正在编辑个性化设置，则先退出编辑面板。 |
| 点击手机外部遮罩 | 关闭普通手机。点击手机外壳和内部控件不会触发外部关闭。 |
| 右上角 `×` | 关闭普通手机。 |

打开手机后，`ArrowUp` 只用于网格向上导航，不用于关闭手机。打开手机的语义动作 ID 是 `ext-7a9373.open-phone`，默认物理键为 `ArrowUp`；Studio 或玩家可以通过输入按键配置将其重映射。

## Fragment 方法

在 Studio 的 Fragment 中添加“调用扩展方法”动作块，选择模块“手机”。本扩展提供以下方法：

| 方法 | 固定 ID | 正常播放 `run` | 即时执行 / 快进 |
| --- | --- | --- | --- |
| 挂载手机 | `mount-phone` | 启用本次运行中的手机能力，不自动打开 UI。 | 同样启用。 |
| 卸载手机 | `unmount-phone` | 关闭普通或消息手机，结束等待中的消息，并禁用手机。 | 同样卸载。 |
| 显示手机消息 | `show-message` | 显示并等待玩家逐条推进消息。 | 不显示、不等待，避免“运行到当前行”或 Ctrl 快进被消息阻塞。 |

挂载状态仅存在于本次游戏运行，不写入存档。卸载不会清空玩家已经保存的背景、图标、颜色、动作或应用绑定；再次挂载后仍可继续使用它们。未挂载时，快捷键、应用启动和“显示手机消息”都会被忽略。

### 剧情消息工作流

截图中的推荐流程可以直接套用：

```text
挂载手机
  → 黑场 / 创建或切换场景 / 等待等剧情准备
  → 打开黑场、对白、音效等内容
  → 显示手机消息（第 1 组）
  → 显示手机消息（第 2 组，按需接续）
```

“显示手机消息”复用同一个 `phone` 程序 UI，不会注册独立的消息扩展。消息模式仍保留完整手机外壳和状态栏，但没有暗色模态遮罩、没有右上角关闭按钮；对方消息靠左，我方消息靠右，列表会自动滚动到最新一条。

每个方法块最多配置 8 条消息。各槽位都包含相同的四类字段：

| 字段 | 第 1 条 key | 第 2～8 条 key | 说明 |
| --- | --- | --- | --- |
| 角色 | `characterId` | `characterId2` … `characterId8` | Studio 的角色选择器。第 1 条必填；后续未选择时沿用第 1 条角色。 |
| 角色立绘 | `portraitId` | `portraitId2` … `portraitId8` | Studio 的角色立绘选择器；每个字段通过 `characterField` 关联同一条的角色字段。可不填。 |
| 内容 | `message` | `message2` … `message8` | 多行文本。空内容自动跳过。第 1 条必填。 |
| 发送方 | `direction` | `direction2` … `direction8` | `incoming` 为“对方发消息”，`outgoing` 为“我方发消息”。默认 `incoming`。 |

另外还有三个组级参数：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `appendToExisting`（接续上一组消息） | `false` | 仅在已有消息会话时，把当前组首条接在旧消息列表后。 |
| `closeAfterMessages`（本组结束后关闭手机） | `true` | 本组最后一条出现后，仍要再确认一次；该次确认触发关闭动画并结束方法。 |
| `popupPosition`（手机消息显示位置） | `bottom-right` | 为当前消息组选择左上、中上、右上、左下、中下、右下或中部弹出。 |

### 单组与连续组的正确配置

一组消息的交互顺序是：首条立即出现；每次点击、`Enter` 或 `Space` 追加下一条；最后一条显示后还需**再确认一次**。按 `Escape` 会结束当前消息序列并关闭消息手机。

消息超过 8 条时，使用多个“显示手机消息”块。以两组为例：

| 消息组 | `appendToExisting` | `closeAfterMessages` | 结果 |
| --- | --- | --- | --- |
| 第 1 组 | `false` | `false` | 新建消息列表；组末确认后保持手机和消息列表，剧情继续到下一块。 |
| 第 2 组（最后一组） | `true` | `true` | 在前一组消息后继续追加；最后一条后的再次确认关闭手机。 |

非最后一组必须关闭“本组结束后关闭手机”；从第二组开始必须开启“接续上一组消息”。如果第二组仍使用 `appendToExisting=false`，它会按新会话处理，而不是接在第一组之后。每个消息块会等待自己的组结束，因此应让这些块在同一条剧情流程中顺序执行。

### 头像与角色立绘

不要把头像路径作为文本输入。请使用每条消息的“角色”和“角色立绘”选择器：立绘选择器会保存稳定的角色立绘 ID。运行时头像候选按以下顺序回退：

1. 当前消息选中的角色立绘；
2. 角色的默认头像；
3. 角色的第一张立绘；
4. 角色名称的首字。

素材 URI 会通过 `ctx.asset.resolve()` 解析。图片加载失败时会自动尝试下一项候选，因此坏素材不会阻塞剧情消息。

## 作者设置与应用目录

扩展设置中的视觉字段如下：

| 设置 | 说明 |
| --- | --- |
| `phoneTitle` | 普通手机顶部标题，默认“手机”。 |
| `popupPosition` | 普通手机的弹出位置；剧情消息使用各自的 `popupPosition` 参数。 |
| `backgroundColor`、`backgroundImage`、`backgroundCss` | 作者默认的背景色、背景图或单个 CSS `background` 值。 |
| `accentColor`、`shellColor` | 默认强调色与外壳色。 |
| `allowPlayerCustomization` | 总开关。关闭时隐藏齿轮入口并忽略所有 shared 玩家覆盖，但不删除数据。 |
| `allowPlayerWallpaper` | 在总开关开启时，是否允许玩家上传背景图。 |
| `allowPlayerIcons` | 在总开关开启时，是否允许玩家上传应用图标。 |

作者端的动作目录刻意只显示四个可视化 array 表单；先配置动作，再把其 ID 填入“手机应用目录”的“默认动作 ID”。

| 作者端分组 | 关键字段 | 运行时行为 |
| --- | --- | --- |
| 动作 · 程序 UI | ID、名称、UI 引用、说明 | 打开程序 UI。本扩展填 `ui-id`，跨扩展填 `extension-id/ui-id`，不加 `@`。 |
| 动作 · 可视化 UI | ID、名称、界面名称、模态、说明 | 打开项目 UI（`ui-name`）或扩展 UI（`@extension-id/ui-name`）。 |
| 动作 · 内置系统界面 | ID、名称、系统界面、说明 | 打开标题、工具栏、存档、读档、设置、历史或鉴赏等系统槽位。 |
| 动作 · 手机内部方法 | ID、名称、内部方法、说明 | 仅允许快速存档、快速读档、切换全屏。 |
| 手机应用目录 | 应用 ID、名称、图标、启用、锁定、默认动作 ID | 决定普通手机桌面显示的应用。 |

动作 ID 和应用 ID 应使用稳定、唯一的 kebab-case 值；动作最多 100 条，应用最多 40 条。未配置有效目录时，扩展会回退到内置的存档、读档、设置、历史、鉴赏和快捷工具应用。新增作者动作会补充或按同 ID 覆盖回退动作，不会让默认存读档能力消失。

## 动作目标与安全边界

运行时支持以下六种受限目标。作者端设置只直接配置前四种；后两种是玩家动作表单和旧数据的兼容能力。

| 目标类型 | 格式 / 关键字段 | 执行方式 |
| --- | --- | --- |
| `program-ui` | `ref` | `ctx.ui.show()`。 |
| `visual-ui` | `name`、可选 `modal` | `ctx.visualUI.open()`。 |
| `system-slot` | 已知系统槽 ID | `ctx.system.invoke()`。 |
| `local-command` | `quick-save`、`quick-load` 或 `toggle-fullscreen` | 调用受限的本地白名单能力。 |
| `fragment` | `fragmentId`、可选 `chapterId` | `ctx.flow.callFragment()`。 |
| `extension-method` | `methodRef`、方法适配 `fragmentId`、可选 `chapterId` | 通过 Fragment 中正式的“调用扩展方法”动作块执行。当前 SDK 没有按字符串直接调用方法的 API。 |

扩展不会执行任意 JavaScript 或任意命令。所有动作、UI 引用、系统槽和 shared 存档数据都会在运行时校验；无效目标不会被启动。背景 CSS 只接受一个受限 `background` 值，拒绝 `url()`、`@` 规则、分号和花括号。

## 玩家个性化与 shared 存档

普通手机右上角的齿轮会打开个性化面板。玩家可在作者许可范围内：

- 修改非锁定应用的名称、图标和点击后的动作绑定；
- 新增、编辑、删除自定义动作，或恢复被覆盖的默认动作；
- 上传 PNG、JPEG 或 WebP 背景图（最大 2 MB）及应用图标（最大 512 KB）；
- 设置安全的 CSS 背景值、强调色和外壳色；
- 恢复项目默认设置。

偏好数据存储在 `preferences` shared save 中，跨普通存档槽位保留。读入时会净化不可信字段：图片只接受受限 Data URL，颜色只接受 `#RRGGBB`，应用覆盖/绑定最多 40 条，自定义动作最多 100 条。作者关闭 `allowPlayerCustomization` 后，玩家保存的数据会保留但暂时不生效；重新开启后会恢复。

## 调试与常见问题

扩展当前会在控制台输出 `[phone-debug]` 日志，剧情消息排查时请一并提供同一时间段的以下事件：`sequence-request`、`sequence-created`、`ui-show-start`、`listener-subscribe`、`sequence-publish`、`advance-received`、`sequence-error` 和 `sequence-finally`。日志中的 `sequenceId` 用于关联同一组消息。

| 现象 | 优先检查项 |
| --- | --- |
| 按 `ArrowUp` 没有打开普通手机 | 确认剧情已先调用“挂载手机”；确认当前未显示普通或剧情消息手机；检查输入按键是否被重映射。 |
| “显示手机消息”没有显示 | 确认已挂载手机，且第 1 条有角色和非空内容；检查控制台是否存在 `sequence-error` 或 UI 订阅日志。 |
| 第二组没有接在第一组后 | 第 1 组应为 `appendToExisting=false`、`closeAfterMessages=false`；第 2 组应为 `appendToExisting=true`。 |
| 最后一条出现后剧情不继续 | 这是预期交互：还需要一次点击、`Enter` 或 `Space` 确认。 |
| 点击消息没有推进 | 请点击游戏预览中的消息手机或使用 `Enter` / `Space`，不要点击 Studio Inspector、脚本列表等编辑器区域。 |
| 头像显示为首字 | 检查角色立绘是否属于所选角色，并确认其素材 URI 能被 Studio 解析。 |
| 直接打开 `phone` UI 后立即消失 | `phone` 是受挂载状态保护的程序 UI；必须先执行 `mount-phone`。 |

## 源码结构

```text
src/
├─ index.tsx                              # 扩展入口
└─ phone/
   ├─ README.md                           # 本文档
   ├─ core/catalog.ts                     # 目录、目标校验、偏好净化与启动器
   ├─ extension/phone-extension.tsx       # Extension、方法、设置、存档与消息序列
   ├─ styles/phone.css                    # 外壳、动画、消息和编辑器样式
   └─ ui/
      ├─ phone-ui.tsx                     # UI 状态、键盘/鼠标和个性化编辑器
      ├─ asset-utils.ts                   # 素材解析与玩家图片读取
      └─ components/
         ├─ phone-error-boundary.tsx      # React 错误边界
         └─ story-message-item.tsx        # 角色头像与单条消息渲染
```

根目录中遗留的 `phone-core.ts`、`phone-extension.tsx`、`phone-ui.tsx` 与 `phone-ui.css` 是兼容入口；新功能应放在 `src/phone/` 下的对应模块中。不要修改 `sdk/`，它由 LetsGal Studio 同步维护。

## 验证与发布前检查

修改 TypeScript 后，在工作区根目录执行：

```powershell
npx tsc --noEmit
npm run build
```

然后在 Studio Preview 中至少手动确认：挂载后普通手机能打开并关闭；方向键、鼠标和 `Enter` / `Space` 启动同一应用；卸载会关闭手机；一组消息的末条需要再次确认；两组消息能够按上文参数连续追加；角色立绘在有效和失效素材下均能降级显示。

`docs/手机UI插件方案.md` 仅保留设计讨论和历史记录。它包含一些尚未实现或已调整的能力（例如应用排序/隐藏/拖拽、主题 ID、完整 CSS 编辑器和旧设置字段）；开发、配置和验收应以本文档及当前源码为准。
