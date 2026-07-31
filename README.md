# LetsGal Studio 自定义手机扩展
> 扩展 ID：`ink.zenly.ext-7a9373` ｜ 程序 UI：`phone`
> Manifest 版本：`0.1.2` ｜ 要求 SDK：`>=1.9.0`

这是 LetsGal Studio 游戏运行时的可挂载手机扩展：提供四列应用桌面、受限动作目录、shared 玩家个性化，以及可由剧情 Fragment 逐条推进并可跨多个方法块接续的聊天消息。

本文档以当前源码与 `extension.json` 为准。`docs/手机UI插件方案.md` 是历史设计记录；其中的应用排序、隐藏、拖拽、主题 ID、完整 CSS 编辑器等能力尚未实现。

## 1. 安装、构建与更新
需要 Node.js、pnpm 及满足 manifest 要求的 LetsGal Studio SDK。在扩展根目录执行：
```powershell
pnpm install
npx tsc --noEmit
pnpm run build
```
Studio 从 `extension.json` 的 `dist/index.mjs` 加载产物。开发期间可运行 `pnpm run watch`。修改代码或静态 schema 后，如果 Preview 仍显示旧 UI、旧方法表单或旧设置字段，请重新构建并重载扩展或重启 Preview。不要修改 `sdk/` 目录。

## 2. 最小流程与生命周期
在剧情 Fragment 中按顺序添加“调用扩展方法”：
```text
挂载手机（mount-phone）
  → 需要时显示手机消息（show-message）
  → 不再允许使用时卸载手机（unmount-phone）
```
挂载只启用能力，不会自动弹出普通手机；之后玩家可按默认 `ArrowUp` 打开。挂载状态只存在于本次运行，不写入存档；读档、重新开始或重新启动 Preview 后，剧情应再次挂载。

| 方法 | 固定 ID | 正常播放 | 即时执行 / 快进 |
| --- | --- | --- | --- |
| 挂载手机 | `mount-phone` | 启用手机能力。 | 同样启用。 |
| 卸载手机 | `unmount-phone` | 关闭当前 UI、结束等待消息并禁用手机。 | 同样卸载。 |
| 显示手机消息 | `show-message` | 显示消息并等待玩家逐条确认。 | 不显示、不等待。 |

卸载不会删除玩家保存的背景、图标、颜色、动作或应用绑定；再次挂载后仍可使用。未挂载时，`ArrowUp`、应用启动与剧情消息均不可用。

## 3. 普通手机桌面
手机是四列应用网格。`ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` 移动焦点；`Enter` 或 `Space` 启动当前应用；鼠标悬停同步焦点，点击启动应用；`Escape`、右上角关闭按钮或点击外部遮罩关闭手机。打开后 `ArrowUp` 只用于移动焦点。语义动作 ID 为 `ink.zenly.ext-7a9373.open-phone`，默认键为 `ArrowUp`，可在 Studio 输入按键配置中重映射。


## 4. 作者设置、动作与应用目录
| 设置 | 作用 |
| --- | --- |
| 手机标题、手机弹出位置 | 控制普通手机标题及左上、中上、右上、左下、中下、右下、中部的弹出位置。 |
| 默认背景色 / 图 / CSS | 作者默认外观；玩家没有覆盖时生效。 |
| 默认强调色 / 外壳色 | 控制焦点、我方气泡和外壳。 |
| 允许玩家个性化手机 | 总开关；关闭时隐藏齿轮并忽略玩家覆盖，不删除数据。 |
| 允许玩家更换背景 / 图标 | 总开关开启时，分别控制上传背景与图标的权限。 |

先配置动作，再添加桌面应用；所有 ID 都应稳定、唯一，建议使用 kebab-case。每个动作分组与应用目录最多 40 项。没有有效作者应用目录时，扩展会回退到内置的存档、读档、设置、历史、鉴赏和快捷工具应用；同 ID 的作者动作可以覆盖回退动作。

| 作者端分组 | 关键字段与用途 |
| --- | --- |
| 动作 · 程序 UI | ID、名称、UI 引用、说明；同扩展填 `ui-id`，跨扩展填 `extension-id/ui-id`，不加 `@`。 |
| 动作 · 可视化 UI | ID、名称、界面名称、是否模态、说明；项目 UI 填 `ui-name`，扩展 UI 填 `@extension-id/ui-name`。 |
| 动作 · 内置系统界面 | ID、名称、标题/工具栏/存档/读档/设置/历史/鉴赏等系统槽位。 |
| 动作 · 手机内部方法 | ID、名称；只能选快速存档、快速读档或切换全屏。 |
| 手机应用目录 | 应用 ID、名称、图标、启用、锁定玩家编辑、默认动作 ID。 |

运行时只允许 `program-ui`、`visual-ui`、`system-slot`、`fragment`、`extension-method` 和白名单 `local-command` 等受限目标。扩展不会执行任意 JavaScript 或任意终端命令；扩展方法目标需通过“方法适配 Fragment”中的正式调用块执行，SDK 不支持按字符串直接调用其他扩展方法。

## 5. 玩家个性化与 shared 存档
玩家可在普通手机右上角齿轮中修改非锁定应用名称、图标和动作绑定，并按作者权限上传背景和图标、设置强调色/外壳色与安全 CSS 背景、恢复项目默认值。背景仅接受 PNG/JPEG/WebP，最大 2 MB；图标最大 512 KB。偏好保存在 `preferences` shared save，跨普通存档槽位存在。作者之后关闭个性化权限时，数据保留但不生效；重新开启后恢复。

## 6. 聊天角色预设与头像
`show-message` 不再直接选择角色或立绘。先在扩展设置中建立“聊天头像素材库”：为每个自定义头像填写唯一素材 ID 并选择图片。然后建立“聊天角色预设”：填写唯一预设 ID、选择资产角色，并选择以下头像来源之一：第一张立绘（默认）、角色默认头像、扩展素材库。选择扩展素材库时，必须填对应的头像素材 ID。

消息气泡名称始终使用资产角色名称，不支持自定义角色名或自定义气泡 CSS。消息开始播放时会保存预设快照，之后修改预设不会改写已显示消息。头像加载失败时依次尝试所选来源、兼容立绘、角色默认头像、第一张立绘，最终显示角色名首字；控制台会记录 `[phone-avatar] image-load-failed` 以便排查素材 URI。


## 7. `show-message` 方法表单
在已挂载手机的剧情 Fragment 中添加“调用扩展方法 → 显示手机消息”。该方法是静态 schema；当前 SDK 不支持根据“聊天角色预设”设置动态生成真正的下拉选项，因此表单填写预设 ID（Studio 可提供 `phone-chat-role-preset` 建议），运行时再展开为消息快照。

| 字段 | 第 1 条 | 第 2～8 条 | 说明 |
| --- | --- | --- | --- |
| 聊天角色预设 ID | `presetId` | `presetId2`…`presetId8` | 第 1 条必填；后续消息未填写时继承第 1 条预设。 |
| 内容 | `message` | `message2`…`message8` | 支持多行；空内容自动跳过。 |
| 发送方 | `direction` | `direction2`…`direction8` | `incoming` 是对方消息（左侧），`outgoing` 是我方消息（右侧）。 |
| 消息状态 | `status` | `status2`…`status8` | 默认 `read`；对方消息强制为已读。 |
| 被拉黑提示 | `blockedHint` | `blockedHint2`…`blockedHint8` | 仅我方状态为 `blocked` 时使用；默认“您的消息已发送，但被对方拒收”。 |

组级字段为“接续上一组消息”（`appendToExisting`，默认否）、“本组结束后关闭手机”（`closeAfterMessages`，默认是）和“手机消息显示位置”（`popupPosition`，默认右下）。位置可选左上、中上、右上、左下、中下、右下或中部，且只影响当前消息会话；普通手机位置由扩展设置控制。

| 我方状态 | 视觉表现 |
| --- | --- |
| `sending` | 气泡左下角外侧的旋转 loading 图标。 |
| `unread` / `read` | 气泡左下角外侧的“未读”或“已读”文字。 |
| `failed` | 气泡左下角外侧的红色圆形感叹号。 |
| `blocked` | 红色感叹号；提示文本作为独立行居中显示在消息行下方，不影响气泡宽度。 |

对方已读标记显示在气泡右下角外侧。消息模式只在手机**屏幕内部**叠加 `rgba(0, 0, 0, 0.4)` 黑色遮罩，不影响手机外部游戏画面。第一条立即显示；之后每次点击手机消息区域或按 `Enter`/`Space` 追加一条。最后一条显示后还要再确认一次：关闭组会播放关闭动画并继续剧情；非关闭组会保留列表、进入下一个剧情块。`Escape` 也会关闭当前消息手机并结束等待。

### 多组消息接续
一个块最多 8 条。超过时必须顺序配置：第一组为“接续：否 / 结束后关闭：否”；中间组为“是 / 否”；最后一组为“是 / 是”。不要在组间调用卸载手机，也不要让第二组仍使用“接续：否”，否则消息不会附加在原列表下。

## 8. 两类 Preview、缓存与多预览隔离
附图上方的**剧本 Preview**会执行脚本中的方法块，应在这里验证 `mount-phone → show-message`、逐条推进和多组接续。附图下方的**扩展程序预览**只显式打开 `phone` UI，用于检查默认手机桌面、背景、布局与设置；它不会执行剧情挂载，因此未挂载时不能用 `ArrowUp` 打开、不能启动应用、不能运行剧情消息。

如果程序预览仍是黑色面板，先执行 `pnpm run build`，再重载扩展或重启 Preview。特别是右侧方法说明仍显示旧版 `characterId`、`portraitId` 等字段时，说明 Studio 还缓存旧静态 schema；当前表单应显示 `presetId`、`message`、`direction`、`status` 和 `blockedHint`。重载前不要根据旧表单配置新剧情。

多个 Studio Preview 的手机运行时彼此隔离。每个 Preview 都必须各自执行 `mount-phone`；一个 Preview 的消息、关闭、卸载与等待状态不会占用另一个 Preview。同一 Preview 的 `phone-mounted`、`runtime-resolved`、`sequence-request`、`sequence-created` 日志应使用相同 `scopeId`。

## 9. 验收、调试与常见问题
发布前逐项验证：未挂载时 `ArrowUp` 不打开；挂载后可打开和关闭；方向键、鼠标、`Enter`/`Space` 指向同一应用动作；卸载只关闭当前 Preview；消息可逐条推进和跨组接续；有效与失效头像均能回退；扩展程序预览可显示默认桌面。

| 现象 | 优先检查项 |
| --- | --- |
| `ArrowUp` 没有手机 | 当前剧情是否已挂载；输入按键是否被重映射；是否已有普通/消息手机显示。 |
| `show-message` 没有界面 | 已挂载；第 1 条预设 ID 存在；内容非空；在游戏 Preview 而非编辑器区域查看。 |
| 第二组没有接续 | 第一组必须为“否 / 否”，第二组起必须为“是”；组间不能卸载。 |
| 最后一条后剧情停住 | 这是预期确认步骤；再点击消息区域或按 `Enter`/`Space`。 |
| 头像只显示首字 | 检查角色、预设头像来源、素材 URI 及 `[phone-avatar] image-load-failed`。 |
| 程序预览黑屏或表单字段陈旧 | 重建并重载扩展或重启 Preview，清除 Studio 的 UI/schema 热更新缓存。 |

控制台输出 `[phone-debug]` 与 `[phone-avatar]`。排查时请保留同一时间段的 `phone-mounted`、`runtime-resolved`、`sequence-request`、`sequence-created`、`ui-show-start`、`listener-subscribe`、`sequence-publish`、`advance-received`、`sequence-error`、`sequence-finally` 及其 `scopeId`；头像问题同时提供 `image-load-failed` 的 `rawUri`、`resolvedUrl` 与 image 尺寸。

## 10. 源码结构
```text
src/
├─ index.tsx                                      # 扩展入口
└─ phone/
   ├─ core/catalog.ts                             # 动作目录、目标校验和启动器
   ├─ extension/phone-extension.tsx              # Extension、方法、设置、存档、消息运行时
   ├─ styles/phone.css                            # 手机外壳、动画和消息样式
   └─ ui/
      ├─ phone-ui.tsx                            # UI 状态、输入和个性化编辑器
      ├─ asset-utils.ts                           # 素材解析与玩家图片读取
      └─ components/story-message-item.tsx       # 头像与单条消息渲染
```
