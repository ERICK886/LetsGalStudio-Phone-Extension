# LetsGal Studio 手机 UI 插件方案

> 文档状态：方案评审稿  
> 插件 ID：`ext-7a9373`  
> 插件名称：手机  
> 目标版本：`0.1.0`（MVP）  
> 依据：LetsGal Studio 扩展指南 v1.8.0 与当前工作区 SDK

## 1. 方案摘要

本插件是在**游戏运行中提供给玩家使用的能力启动器**。玩家打开手机后，通过方向键或鼠标在应用网格中选择应用；确认应用时执行该图标当前绑定的动作。应用动作是玩家配置的一部分，而不是只能由项目作者预先写死。

推荐采用 **React 程序 UI + 可用动作目录 + 玩家共享配置** 的架构：

- React 负责手机外壳、桌面、二维焦点导航、鼠标交互、编辑模式和设置页。
- 项目作者声明游戏实际提供的应用、界面与安全动作，形成玩家可选择的“可用动作目录”。
- 玩家决定应用的外观、排列以及点击后绑定哪个可用动作；结果写入 `shared` 存档，跨槽位保留。
- 手机关闭时，语义动作 `ext-7a9373.open-phone` 默认由 `ArrowUp` 触发，也允许玩家重映射。
- 手机打开后进入独立输入上下文：`ArrowUp/Down/Left/Right` 只负责在应用之间导航，`Enter`/`Space` 启动应用，鼠标移动和点击完成悬停、选择与启动，`Escape` 关闭手机。
- 应用动作可打开本扩展或其他扩展的程序 UI、项目或扩展可视化 UI、内置系统界面、Fragment，或执行手机内部白名单方法。
- 当前 SDK 不提供按字符串直接调用 `method()` 的运行时 API。跨扩展和本扩展 `method()` 通过“扩展方法（Fragment 适配）”动作实现：手机调用指定 Fragment，由 Fragment 内正式的“调用扩展方法”动作块执行目标方法。

## 2. 目标与范围

### 2.1 核心目标

1. 在游戏运行期间提供手机外壳、状态栏、桌面、应用图标和底部操作区。
2. 手机打开后支持方向键二维导航和鼠标选择，焦点状态清晰可见。
3. 支持项目作者定义游戏中可用的应用与动作目录，但不替玩家固定最终按键动作。
4. 支持玩家在运行时自定义：
   - 手机主题与受控样式参数；
   - 背景图片或作用域内 CSS；
   - 应用名称和图标图片；
   - 应用排序、显示与隐藏；
   - 每个应用点击后执行的动作；
   - 手机弹出快捷键。
5. 默认 `ArrowUp` 只在手机关闭时用于打开手机；手机打开后，该按键用于向上选择应用。关闭使用 `Escape`、关闭按钮或点击遮罩。
6. 配置错误或素材失效时安全降级，不阻断剧本流程。
### 2.2 MVP 不包含

- 从网络下载主题、图标或应用。
- 执行任意 JavaScript、`eval` 或访问宿主内部注册表。
- 绕过剧本执行器、按字符串直接调用任意第三方扩展方法；当前版本改用受控 Fragment 适配。
- 完整移动操作系统模拟、通知推送或后台多任务。
- 将玩家设置写回 Studio 项目的 `project.json`。

## 3. 使用者与配置边界

插件是游戏中的玩家能力，但项目作者仍需要提供游戏实际存在的可调用目标。

### 3.1 项目作者职责

项目作者在 Studio 中提供：

- 默认主题、尺寸、圆角、阴影、字体和背景；
- 游戏中可出现的应用模板；
- 可供玩家绑定的动作目录，包括界面、Fragment、系统插槽和本地命令；
- 各动作的显示名称、说明、图标、参数默认值和是否允许绑定；
- 图片大小、应用数量和 CSS 能力上限。

这些值属于 `ctx.settings`，随项目发行物发布。作者提供的是“能力集合和安全边界”，不是玩家最终的应用动作布局。

### 3.2 玩家配置

玩家在游戏内决定：

- 哪些非锁定应用显示在桌面；
- 应用顺序、名称、图标和背景；
- 每个应用从可用动作目录中绑定哪个动作；
- 手机打开快捷键。

玩家配置写入 `static saveSchema` 的 `shared` 字段，跨存档槽位保留；“恢复默认”清除玩家覆盖并回到作者提供的推荐布局。

作者可通过 `allowPlayerCustomization` 总开关决定玩家端是否显示个性化入口。关闭时，运行时统一采用作者外观、应用名称、图标与默认动作绑定，并忽略 shared 中的玩家覆盖；已有数据不会被删除，作者重新开启后自动恢复。`allowPlayerWallpaper` 与 `allowPlayerIcons` 是总开关下的细分权限。

对于项目作者未暴露的界面或命令，普通玩家不能通过输入任意代码绕过目录执行。可选的“高级引用模式”只能接受经过类型校验的 UI/Fragment 引用，且默认关闭。

> 原因：Player 端的 `ctx.settings.set()` 只修改运行时内存，不会持久化项目设置；玩家长期配置应使用 `shared` 存档。

## 4. SDK 能力与约束

| 需求 | 当前 SDK 结论 | 方案 |
|---|---|---|
| 打开程序 UI | 支持 `ctx.ui.show(id)` | 直接支持 |
| 打开可视化 UI | 支持 `ctx.visualUI.open(name)` | 直接支持，使用独立引用格式 |
| 打开系统界面 | 支持 `ctx.system.invoke(slot)` | 直接支持 |
| 调用 Fragment | 支持 `ctx.flow.callFragment(id)` | 直接支持 |
| 调用本插件命令 | 无统一命令 API | 插件内部建立白名单处理器 |
| 调用任意扩展方法 | 无公开运行时调用 API；Studio/剧本支持“调用扩展方法”动作块 | 使用“扩展方法（Fragment 适配）”：手机调用作者指定 Fragment，由其中的动作块调用本扩展或其他扩展方法 |
| 自定义快捷键 | 支持语义动作和玩家重映射 | 使用 `registerAction` |
| 背景/图标素材 | 作者侧支持 `asset`，运行时支持 `ctx.asset.resolve` | 作者素材直接解析；玩家图片转受限 Data URL |
| 任意应用列表设置 | 支持 `s.array` 可增删行，但不支持嵌套 array/object 或跨列表动态下拉 | 作者侧拆分为动作目录与应用目录两个可视化数组表单；运行时转换并严格校验 |
| CSS 设置 | 无 CSS 专用字段 | multiline string + 严格作用域和过滤 |

## 5. 总体架构

```text
PhoneExtension
├─ static onRegister()
│  ├─ 注册 ext-7a9373.open-phone
│  └─ 订阅动作并切换手机显示状态
├─ static settings
│  ├─ 作者视觉配置
│  ├─ 权限开关
│  ├─ 可用动作目录 array 表单
│  └─ 手机应用目录 array 表单
├─ static saveSchema
│  └─ 玩家 shared 个性化配置
└─ render()
   └─ PhoneRoot
      ├─ PhoneShell
      ├─ StatusBar
      ├─ HomeScreen
      ├─ AppGrid
      ├─ AppLauncher
      ├─ CustomizePanel
      └─ ErrorBoundary / Toast
```

### 5.1 模块职责

- `PhoneExtension`：宿主契约、设置、存档和生命周期。
- `PhoneRoot`：组合作者默认值与玩家覆盖，控制打开、关闭和编辑状态。
- `AppLauncher`：只接受校验后的判别联合目标，统一执行调用。
- `CustomizationService`：图片读取、CSS 校验、配置迁移、恢复默认。
- `phone-config`：类型、默认值、JSON 解析、版本迁移与限制。
- `phone-command-registry`：插件内置命令白名单，不接受动态代码。

## 6. 数据模型

### 6.1 作者提供的应用模板与动作目录

当前 Settings Builder 已支持 `s.array`。为避免单行动作表同时展示所有目标类型字段而产生十多列窄输入框，作者动作目录按目标类型拆成四个 Studio 原生可视化表单：`programUiActions`、`visualUiActions`、`systemSlotActions` 和 `internalMethodActions`；应用继续使用 `catalogApps`。扩展方法和剧情 Fragment 不再出现在作者端扩展设置中。每个表只显示当前类型所需字段，可直接新增、编辑和删除行，不再要求手写 JSON。

运行时会为四类表单补充对应 `targetKind`，统一转换为判别联合 `PhoneTarget`。应用行通过字符串 `defaultActionId` 引用任一可见分组中的动作 ID；当前 SDK 不支持根据多个数组动态生成下拉选项，因此 Studio 会显示普通字符串输入框。

旧版宽表 `catalogActions` 和更早的 `appCatalogJson` 均已从设置 Schema 隐藏。四类分组表单没有有效动作时，运行时依次读取旧宽表、旧 JSON，最后回退插件内置目录，以兼容已有项目；存在分组动作时，它们会按 ID 覆盖或补充回退目录，因此添加一个自定义动作不会让默认存读档等动作消失。运行时目录仍采用以下版本化结构：

```ts
interface PhoneCatalogV1 {
  version: 1;
  actions: PhoneActionDefinition[];
  apps: PhoneAppDefinition[];
}

interface PhoneActionDefinition {
  id: string;
  name: string;
  description?: string;
  target: PhoneTarget;
}

interface PhoneAppDefinition {
  id: string;
  name: string;
  icon?: string;
  enabled?: boolean;
  locked?: boolean;
  defaultActionId?: string;
}
```

约束：

- 应用 `id` 和动作 `id` 分别唯一，建议使用 `kebab-case`，发布后不可随意修改。
- MVP 最多 40 个应用、100 个动作，超过部分忽略并记录警告。
- 应用 `name` 最长 24 个字符；动作名称最长 32 个字符。
- `icon` 为项目素材 URI；空值或解析失败时使用内置占位图标。
- `defaultActionId` 只是首次使用和恢复默认时的推荐绑定，玩家之后可重新选择。
- `locked: true` 只用于必须保留的系统应用；普通应用默认允许玩家隐藏、重排、换图标和换动作。
- 动作目录中的目标仍需经过严格校验，不能携带可执行代码。

### 6.2 目标类型

```ts
type PhoneTarget =
  | { kind: "program-ui"; ref: string; props?: Record<string, unknown> }
  | { kind: "visual-ui"; name: string; modal?: boolean }
  | { kind: "system-slot"; slot: PhoneSystemSlot }
  | { kind: "extension-method"; methodRef: string; fragmentId: string; chapterId?: string }
  | { kind: "fragment"; fragmentId: string; chapterId?: string }
  | { kind: "local-command"; commandId: string };
```

目标必须包含 `kind`，不能使用含糊的单字符串目标。不同引用语法不得混用：

- 程序 UI：本扩展可写 `phone-settings`；跨扩展按 SDK `uiRef` 规则解析。
- 可视化 UI：项目 UI 写 `my-panel`；扩展 UI 写 `@extension.id/my-panel`。
- 系统插槽：只接受 SDK 已知的九个 `INTERNAL_SYSTEM_SLOT`。
- Fragment：通过 `ctx.flow.callFragment()` 调用；关闭手机后再进入剧情片段。
- 扩展方法：`methodRef` 使用 `extension-id/method-id`，但当前 SDK 不允许运行时代码直接 invoke；`fragmentId` 必须指向一个含“调用扩展方法”动作块的适配 Fragment，且动作块应选择同一个方法引用。该方式同时适用于本扩展方法和其他扩展方法。
- 手机内部方法：只能来自代码内置白名单。

### 6.3 玩家个性化配置

```ts
interface PlayerPhonePreferencesV1 {
  version: 1;
  themeId?: string;
  wallpaper?: PlayerWallpaper;
  customCss?: string;
  appOrder: string[];
  hiddenAppIds: string[];
  appOverrides: Array<{ appId: string; name?: string; imageDataUrl?: string }>;
  actionBindings: Array<{ appId: string; actionId: string }>;
}

type PlayerWallpaper =
  | { kind: "default" }
  | { kind: "author-asset"; uri: string }
  | { kind: "player-image"; imageDataUrl: string }
  | { kind: "css"; cssText: string };
```

建议存档字段：

```ts
static saveSchema = defineSave({
  preferences: {
    type: "list",
    persistence: "shared",
    default: [] as PlayerPhonePreferencesV1[],
    label: "玩家手机个性化配置",
  },
});
```

这里用单元素列表保存版本化对象，是为了适配当前 `defineSave` 类型集合。实际读写必须整体复制并 `set`，不能原地修改数组。

## 7. 设置 Schema 设计

建议作者设置字段如下：

| key | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `phoneTitle` | string | `手机` | 无障碍标题与顶部标题 |
| `popupPosition` | enum | `bottom-right` | 手机弹出位置：左上、中上、右上、左下、中下或右下；按对应方向播放进入/退出动画 |
| `defaultTheme` | enum | `glass` | 内置主题 |
| `shellWidth` | number | `390` | 手机逻辑宽度 |
| `shellHeight` | number | `780` | 手机逻辑高度 |
| `cornerRadius` | number | `42` | 外壳圆角 |
| `backgroundMode` | enum | `image` | `image/css/color` |
| `backgroundImage` | asset(image) | 无 | 作者默认背景图 |
| `backgroundColor` | string | `#151923` | 纯色降级背景 |
| `backgroundCss` | string(multiline) | 空 | 作者作用域 CSS |
| `allowPlayerCustomization` | boolean | `true` | 玩家个性化总开关；关闭时隐藏编辑入口并忽略全部玩家覆盖，但不删除 shared 数据 |
| `allowPlayerWallpaper` | boolean | `true` | 允许玩家更换背景；仅在总开关开启时可编辑 |
| `allowPlayerCss` | boolean | `false` | 允许玩家写 CSS |
| `allowPlayerIcons` | boolean | `true` | 允许玩家替换图标；仅在个性化总开关开启时可编辑 |
| `allowPlayerReorder` | boolean | `true` | 允许玩家排序/隐藏 |
| `allowAdvancedReferences` | boolean | `false` | 允许玩家手工填写高级 UI/Fragment 引用 |
| `programUiActions` | array | 空 | 程序 UI 动作，每行 4 个字段，最多 40 行 |
| `visualUiActions` | array | 空 | 可视化 UI 动作，每行 5 个字段，最多 40 行 |
| `systemSlotActions` | array | 空 | 内置系统界面动作，每行 4 个字段，最多 40 行 |
| `internalMethodActions` | array | 空 | 手机内部白名单方法，每行 4 个字段，最多 40 行 |
| `catalogApps` | array | 空（动作全部为空时运行时回退内置目录） | 可增删的应用表单，最多 40 行 |

每个普通应用的动作绑定是核心玩家能力，默认始终可编辑，不再使用 `allowPlayerRetarget` 总开关。若某个应用必须固定行为，仅对该应用设置 `locked: true`。

快捷键不重复放进扩展设置或 shared 偏好。手机打开动作会出现在 Studio 的“输入按键”配置中，玩家级重映射由宿主持久化。

## 8. 快捷键方案

### 8.1 语义动作

```ts
const OPEN_PHONE_ACTION = "ext-7a9373.open-phone";

ctx.input.registerAction({
  id: OPEN_PHONE_ACTION,
  label: "打开手机",
  defaultKeys: ["ArrowUp"],
});
```

注册后通过 `ctx.input.onAction()` 触发 `openPhone()`。实际键位遵循 SDK 的三级优先级：

1. 玩家级按键覆盖；
2. 作者项目级绑定；
3. 插件默认 `ArrowUp`。

### 8.2 输入上下文状态机

| 状态 | ArrowUp | ArrowDown/Left/Right | Enter/Space | 鼠标点击 | Escape |
|---|---|---|---|---|---|
| 手机关闭 | 打开手机（默认绑定） | 原游戏行为 | 原游戏行为 | 原游戏行为 | 原游戏行为 |
| 手机桌面 | 选择上方应用 | 选择对应方向应用 | 启动当前应用 | 选择并启动应用 | 关闭手机 |
| 编辑模式 | 移动焦点/调整位置 | 移动焦点/调整位置 | 确认当前操作 | 选择、拖拽或确认 | 退出编辑模式 |

行为规则：

- 手机打开后必须激活独立输入层，阻止方向键、Enter、Space 和鼠标点击继续传给底层剧情。
- `ArrowUp` 在手机打开后不再触发关闭，否则无法向上导航。
- 玩家若把打开动作改成其他按键，该键默认仍只负责打开；手机内关闭统一使用 `Escape`、关闭按钮或遮罩。
- 打开过程设置互斥锁，并忽略打开事件之后的首个重复按键，避免长按 `ArrowUp` 导致焦点意外移动。
- input、textarea 或 contenteditable 聚焦时，方向键留给控件本身；退出编辑控件后恢复网格导航。
- 手机内按键优先使用根容器捕获阶段的 `keydown` 与 roving tabindex；临时 `Escape` 也可使用短生命周期 `bindShortcut`，关闭后立即解绑。
- ArrowUp 与其他全局动作冲突时，由 Studio 输入系统提示并允许重映射。

## 9. UI 与交互设计

### 9.1 手机打开方式

手机以全屏透明容器承载，内部居中显示固定比例外壳：

```ts
ctx.ui.show("phone", undefined, {
  size: "(100%, 100%)",
  position: "(0, 0)",
  interactable: true,
});
```

推荐默认行为：

- 作者通过 `popupPosition` 选择左上、中上、右上、左下、中下或右下；手机贴近对应视口边缘显示。
- 打开时手机从所选方向位移约 56px，并伴随缩放与淡入；关闭时反向滑出并淡出。用户启用“减少动态效果”时动画缩短到近乎即时。
- 模态遮罩阻止底层剧情误操作，但不销毁当前场景。
- 鼠标或触控点击**手机外壳以外的遮罩区域**时先播放退出动画，再关闭手机。
- 点击手机外壳、屏幕、应用图标或编辑面板内部时不得触发外部关闭。
- 遮罩处理器必须判断 `event.target === event.currentTarget`；手机内部事件需保持在外壳内，避免冒泡造成误关闭。
- 按 `Escape` 或点击手机内部的关闭按钮也可以关闭。
- 打开应用前，根据目标类型决定先关闭手机还是保留手机。
- 切章、读档、返回标题或软重置时关闭手机并清理临时状态。

### 9.2 响应式与二维焦点导航

- 以 `390 × 780` 为设计基准，按视口等比缩放。
- 小屏保证至少 16px 安全边距；桌面端限制最大高度，手机端可占满视口。
- 图标网格默认 4 列，可由 CSS 变量控制为 3～5 列。
- 使用 roving tabindex：任一时刻只有当前应用为 `tabIndex=0`，其余为 `-1`。
- 打开手机时，优先恢复上次选中且仍可见的应用；否则选中第一个可用应用。
- 左/右移动到同一行相邻图标；上/下按当前列移动。目标行缺少同列图标时，选择该行距离最近的图标。
- 到达边界时默认不循环；可在后续增加“循环导航”玩家选项。
- 被隐藏、禁用或删除的应用不参与焦点计算。
- 焦点框、悬停态和按下态必须视觉可辨；鼠标悬停可同步当前选择，但仅点击才启动应用。
- `Enter`/`Space` 启动当前应用，`Escape` 返回上层或关闭手机。
- 方向键处理后调用 `preventDefault()` 和 `stopPropagation()`，确保不会推进或操作底层剧情。

### 9.3 编辑模式

长按图标或点击“个性化”进入编辑模式：

- 拖拽调整顺序；
- 隐藏非锁定应用；
- 上传或恢复图标；
- 从可用动作目录中为每个应用选择点击动作；
- 显示动作名称、说明和目标类型，修改前可试运行；
- 修改背景、主题和受控 CSS；
- 提供“预览”“保存”“取消”“恢复默认”。

所有编辑先写草稿，点击“保存”后一次性写入 shared 配置，避免半完成状态污染存档。

## 10. 背景与 CSS 定制

### 10.1 背景图片

作者图片使用 `ctx.asset.resolve(uri)` 转换 URL。玩家图片使用浏览器文件选择器读取为 Data URL，并限制：

- 仅允许 `image/png`、`image/jpeg`、`image/webp`；
- 单张文件建议不超过 2 MB；
- 解码后最长边建议不超过 2048 px，必要时 Canvas 压缩；
- 读取失败、超限或格式错误时拒绝保存并显示原因；
- 默认使用 `cover center`，允许玩家调整位置属于后续增强项。

> Data URL 会进入 shared 存档。若后续宿主提供玩家文件存储 API，应迁移为文件引用，避免存档膨胀。

### 10.2 CSS 定制

任意 CSS 有宿主污染和网络加载风险，默认关闭玩家 CSS，仅允许项目作者显式启用。启用后采用以下约束：

- 所有规则必须限定在 `[data-phone-root="ext-7a9373"]` 下。
- 推荐只接受 CSS 自定义属性，例如 `--phone-accent`、`--phone-grid-columns`。
- 拒绝 `@import`、`@namespace`、外部 `url(http...)`、`position: fixed`、超高 `z-index` 等高风险内容。
- 限制文本长度（建议 8 KB）和规则数量。
- CSS 解析失败时保留上一次有效配置。
- 提供“安全模式启动”，忽略自定义 CSS，防止错误样式导致无法操作。

MVP 推荐优先实现设计 Token 编辑器；完整 CSS 编辑器可作为高级选项。

## 11. 图标定制

图标来源按优先级合并：

1. 玩家 `appOverrides[].imageDataUrl`；
2. 作者应用定义 `icon`；
3. 插件内置占位图标。

玩家上传图标沿用背景图片的 MIME、尺寸和大小检查，但建议压缩到 256 × 256、单图不超过 256 KB。删除应用后应清理对应图标覆盖，避免 shared 存档残留。

## 12. 应用启动策略

统一入口：

```ts
async function launchApp(app: ResolvedPhoneApp): Promise<void>
```

执行流程：

1. 根据当前焦点或鼠标点击确定应用，确认应用可见、启用且非启动中。
2. 从玩家 `actionBindings` 查找该应用的动作；没有覆盖时使用 `defaultActionId`。
3. 在作者发布的动作目录中解析 `actionId`；不存在、被删除或无权限时显示“动作不可用”，并引导玩家重新绑定。
4. 校验动作对应的 `PhoneTarget`，设置启动锁，阻止重复点击。
5. 按目标类型执行：
   - `program-ui` → `ctx.ui.show()`；
   - `visual-ui` → `ctx.visualUI.open()`；
   - `system-slot` → `ctx.system.invoke()`；
   - `extension-method` → `ctx.flow.callFragment()` 进入方法适配 Fragment，由其中的“调用扩展方法”动作块执行 `methodRef`；
   - `fragment` → 关闭手机后 `await ctx.flow.callFragment()`；
   - `local-command` → 从白名单表查找手机内部方法处理器。
6. 成功后按动作策略关闭手机或返回桌面。
7. 失败时记录错误并展示 Toast，不让错误冒泡中断剧本。

键盘确认与鼠标点击必须进入同一个 `launchApp()`，确保两种操作方式执行完全相同的玩家绑定动作。

### 12.1 本地命令注册表

```ts
const LOCAL_COMMANDS = {
  "close-phone": async ({ closePhone }) => closePhone(),
  "toggle-fullscreen": async ({ ctx }) => ctx.game.window.toggleFullscreen(),
  "quick-save": async ({ ctx }) => ctx.archive.quickSave(),
} satisfies Record<string, PhoneCommandHandler>;
```

只允许调用表中存在的命令；配置中的未知 `commandId` 必须拒绝。

### 12.2 扩展方法的 Fragment 适配

当前 `method()` 由 Studio/剧本的“调用扩展方法”动作块执行，`ExtensionContext` 没有 `invokeMethod()`。手机不能通过 `getHost()`、静态类访问、`eval` 或动态 import 绕过宿主调用契约。

历史配置仍可能包含 `extension-method` 目标：

1. `methodRef`：目标方法的全局引用，格式为 `extension-id/method-id`。
2. `fragmentId`：方法适配 Fragment，其中放置正式“调用扩展方法”动作块。
3. `chapterId`：适配 Fragment 不在当前章节时填写，可选。

该目标仅用于旧 JSON/shared 数据兼容，不再显示在作者端动作目录设置中。真正的方法实例创建、参数解析、存档注入、`run/runImmediately/skip` 调度仍由宿主剧本执行器负责。

没有参数或属于手机插件自身的固定能力也可以注册为 `local-command` 白名单处理器。若未来 SDK 增加正式的 `ctx.extensions.invokeMethod()`，可在保持历史 `extension-method` 数据结构兼容的前提下改为直接调用。

### 12.3 在剧情 Fragment 中挂载或卸载手机

“游戏手机”扩展还提供两个无参数方法，均在 Fragment 的“调用扩展方法”动作块中选择：

1. **挂载手机**（`mount-phone`）：开启本次运行中的手机能力，但不会自动弹出手机。挂载后，玩家可使用手机打开快捷键，剧情也可调用“显示手机消息”。
2. **卸载手机**（`unmount-phone`）：立即禁用手机能力，关闭当前普通手机或剧情消息手机，并结束等待中的消息方法；之后快捷键和“显示手机消息”均不会生效，直到再次挂载。

手机默认处于未挂载状态，因此应在首次需要手机之前调用“挂载手机”。挂载状态仅存在于当前运行会话，不写入存档；卸载不会删除 `preferences` 中的玩家个性化、应用绑定、背景或图标数据，重新挂载后仍可继续使用。

### 12.4 在剧情 Fragment 中显示手机消息

“游戏手机”扩展直接导出“显示手机消息”方法，供项目作者在剧情 Fragment 中使用。一个方法块可配置最多 8 条消息：

1. 在 Studio 创建或打开目标剧情 Fragment。
2. 添加一个“调用扩展方法”动作块。
3. 选择模块“游戏手机”和方法“显示手机消息”。
4. 在“手机消息显示位置”中选择左上、中上、右上、左下、中下、右下或中部弹出；默认右下。该设置仅影响当前消息组，接续组可重新选择位置。
5. 配置“第 1 条”的角色、角色立绘、内容和发送方；第一条为必填。
6. 按需继续配置第 2～8 条。每条都能单独选择角色、通过“角色立绘”选择器选择该角色已配置的立绘、以及“对方发消息 / 我方发消息”；未填写内容的条目会自动跳过。后续条目未选角色时会沿用第 1 条角色。
7. 如果消息超过 8 条，再添加一个“显示手机消息”方法块并开启“接续上一组消息”：第二块可承载第 9～16 条，第三块承载第 17～24 条，依此类推，没有总条数限制。非最后一组关闭“本组结束后关闭手机”，最后一组保持开启；未开启接续的块会开始一份新的消息列表。
8. 头像优先使用每条消息在“角色立绘”选择器中选定的立绘；未选择时使用角色专用头像，再回退到该角色第一张立绘。

调用时只挂载一次 `src/phone-ui.tsx` 手机 UI：第一条立即出现；玩家每点击一次游戏预览区域内的手机、消息气泡、对话框或其他游戏画面，就在旧消息下方新增并播放下一条消息的入场动画，而不是替换原气泡或重新渲染整个手机。Studio 的 Inspector、脚本列表和其他调试区域不参与消息确认，点击这些区域不会跳过消息。显示最后一条后再点击一次：若开启“本组结束后关闭手机”，手机会播放退出动画并关闭，然后当前扩展方法完成；若关闭该选项，则保留手机和消息列表，供下一组接续。

消息模式不创建全屏暗色遮罩，并隐藏手机右上角关闭按钮。对方消息靠左，我方消息靠右；列表超出屏幕时自动滚动到最新消息。方法完成后消息层恢复点击穿透，不阻碍普通对话。按 `Escape` 可退出消息模式并结束当前消息序列；快进时跳过该序列。此能力属于现有 `PhoneExtension`，不会注册额外扩展。

## 13. 配置解析与迁移

Studio array 表单、兼容迁移用的旧作者 JSON 和玩家 shared 数据均视为不可信输入。启动时执行：

1. 读取并限制 array 行数；仅迁移旧配置时解析 JSON；
2. `version` 检查；
3. 字段类型和长度检查；
4. 应用 ID 去重；
5. target 判别联合校验；
6. 动作目录 ID 去重，并校验每个动作的 target；
7. 合并作者应用模板与玩家 `actionBindings`；
8. 删除不存在应用的排序、隐藏和图标覆盖，将失效动作绑定回退到默认动作；
9. 生成不可变的 `ResolvedPhoneConfig`。

解析失败时使用内置最小目录，并在扩展日志输出带路径的错误，例如：

```text
[phone-config] apps[2].target.ref: 程序 UI 引用不能为空
```

升级时通过 `migratePreferences(input)` 逐版本迁移；未知高版本数据不覆盖，进入只读安全模式。

## 14. 生命周期与清理

- `static onRegister(ctx)`：注册一次“打开手机”语义动作；该动作只在手机关闭时生效。
- `onInit()`：读取并校验作者配置和玩家配置。
- `onShow()`：激活手机输入上下文，建立二维焦点、鼠标交互和 Escape 关闭处理。
- `onClose()`：解除 Escape、拖拽和临时 DOM 监听，丢弃未保存草稿。
- 异步图片处理和应用启动应捕获 `ctx.flow.signal`；信号终止后不得继续写状态。
- React 订阅、定时器、文件读取和 `sceneRender` 句柄必须在卸载时清理。

当前 SDK 未公开模块级 `onUnregister`，需在实现阶段验证扩展停用和 Preview 热重载是否自动清理 `registerAction`/`onAction`；若宿主不清理，应推动 SDK 补充 dispose 生命周期。

## 15. 建议源码结构

```text
src/
├─ index.tsx                    # 导出 PhoneExtension
├─ phone-extension.tsx          # Extension 生命周期、settings、saveSchema
├─ phone-ui.tsx                 # PhoneRoot
├─ phone-ui.css                 # 默认外观和设计 Token
├─ components/
│  ├─ phone-shell.tsx
│  ├─ status-bar.tsx
│  ├─ app-grid.tsx
│  ├─ app-icon.tsx
│  ├─ customize-panel.tsx
│  └─ toast.tsx
├─ core/
│  ├─ phone-types.ts
│  ├─ phone-defaults.ts
│  ├─ phone-config.ts           # 解析、校验、合并、迁移
│  ├─ app-launcher.ts
│  ├─ command-registry.ts
│  ├─ image-processor.ts
│  └─ css-sanitizer.ts
└─ assets/
   └─ default-app-icon.svg
```

当前模板的 `WelcomeExtension` / `WelcomeUI` 在实施时替换为稳定 id 为 `phone` 的 `PhoneExtension`。插件尚处于 `0.1.0`，应在首次发布前完成改名，发布后保持 manifest id 和模块 id 不变。

## 16. 分阶段实施

### 阶段 A：MVP 外壳、导航与动作绑定

- 手机 React UI、响应式外壳、默认桌面。
- 注册 `ext-7a9373.open-phone`，手机关闭时默认由 `ArrowUp` 打开。
- 实现方向键二维焦点、Enter/Space 确认、鼠标选择和 Escape 关闭。
- 实现玩家为每个应用选择动作并保存 `actionBindings`。
- 支持程序 UI、可视化 UI、系统插槽、Fragment、本地命令。
- 作者应用模板与动作目录使用 Studio `s.array` 可视化表单、严格转换和错误降级。
- 作者背景图、纯色、受控 CSS。

### 阶段 B：玩家个性化

- shared 偏好存储和迁移。
- 背景图片上传、图标上传、排序和隐藏。
- 主题/设计 Token 编辑器。
- 作者权限限制、恢复默认与安全模式。

### 阶段 C：高级能力

- 高级引用模式：玩家手工填写经过严格校验的 UI/Fragment 引用。
- 更完整的 CSS 编辑器和实时预览。
- 多页桌面、文件夹、徽标和通知。
- 可选循环导航及手柄输入。
- SDK 支持后将 `extension-method` 从 Fragment 适配无破坏升级为正式运行时直接调用。

## 17. 验收标准

### 功能

- 手机关闭时，默认按 `ArrowUp` 可稳定打开手机。
- 手机打开后，四个方向键能够按网格位置移动当前应用焦点，且不会操作底层剧情。
- `Enter`/`Space` 与鼠标点击会执行同一个玩家绑定动作。
- 点击手机外部遮罩会关闭手机，点击手机内部任何可交互区域不会误关闭。
- `Escape`、关闭按钮和外部遮罩可以关闭手机；手机打开时 `ArrowUp` 不负责关闭。
- 重映射后只由当前生效键打开手机。
- 作者能提供背景、应用模板、图标和可用动作目录。
- 玩家能为每个非锁定应用更换动作，保存后立即生效。
- 玩家个性化和动作绑定在退出及切换存档后仍保留。
- 恢复默认后正确回到作者推荐布局和默认动作。
- 五类 MVP 目标均能正确执行或给出可理解的错误。

### 稳定性

- 无效 JSON、重复应用 ID、失效素材和失效目标不会导致白屏。
- 快速连按快捷键不会创建多个手机实例。
- 读档、切章、返回标题和软重置后无残留遮罩或监听。
- 图片超限和危险 CSS 会被拒绝。
- 扩展日志不输出玩家本地图片内容或完整 Data URL。

### 兼容性与体验

- 16:9、16:10、4:3 和竖屏视口均可操作。
- 键盘可完成打开、焦点移动、启动应用和关闭。
- 手机打开时不误触底层剧情输入。
- Studio Preview 与 Player 构建行为一致。

## 18. 风险与决策建议

| 风险/待确认项 | 建议决策 |
|---|---|
| 作者与玩家的职责 | 作者提供游戏能力和安全动作目录；玩家决定手机布局及每个应用绑定的动作 |
| 任意应用数量 | MVP 使用四个按目标类型分组的紧凑动作 `s.array` 和一个应用 `s.array`；动作引用暂用稳定 ID 字符串，等待 SDK 支持跨列表动态下拉 |
| 任意扩展方法调用 | 当前通过受控 Fragment 适配：作者在 Fragment 中配置正式“调用扩展方法”动作块；未来 SDK 提供 invoke API 后再升级为直接调用 |
| 玩家任意 CSS | 默认关闭；开启时严格作用域、过滤和限额 |
| 玩家本地图片持久化 | MVP 用压缩 Data URL；后续迁移宿主文件存储 |
| 默认 ArrowUp 冲突 | 关闭状态用于打开；打开状态切换为向上导航，并支持全局重映射 |
| 手机是否暂停剧情 | 默认模态阻止交互，不强制暂停引擎；实施时验证 |
| 玩家动作自定义范围 | 普通应用必须允许选择动作；动作来自安全目录，高级引用模式默认关闭 |
| Preview 热重载监听泄漏 | 实施阶段专项验证，必要时推动 SDK dispose 生命周期 |

## 19. 推荐的最终产品边界

首版应承诺：**游戏内手机能力 + 方向键/鼠标应用选择 + 玩家可配置的应用动作 + 高度可定制的手机外观 + 可保存布局 + 可重映射打开快捷键**。

项目作者只负责把游戏实际可用的界面和能力发布为动作目录，玩家负责决定每个应用最终执行哪个动作。键盘和鼠标必须共用同一动作绑定与启动流程。

首版不应宣传“运行时代码可按字符串直接调用任意扩展方法”。准确表述应为：**玩家可为应用绑定本扩展或跨扩展程序 UI、项目或扩展可视化 UI、内置系统界面、剧情 Fragment、通过受控 Fragment 适配的扩展方法，或手机插件预注册的内部方法**。待 SDK 提供正式方法调用 API 后，再将现有 `extension-method` 目标无破坏升级为直接调用。