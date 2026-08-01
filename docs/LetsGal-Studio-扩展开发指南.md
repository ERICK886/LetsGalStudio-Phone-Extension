# LetsGal Studio 扩展开发指南

> **文档版本**：v1.9.0  
> **适用对象**：扩展开发工程师  
> **官方文档**：[https://docs.avg-engine.com/extensions/intro](https://docs.avg-engine.com/extensions/intro)

---

## 目录

- [1. 概述](#1-概述)
- [2. 扩展的三种形态](#2-扩展的三种形态)
- [3. 快速开始](#3-快速开始)
- [4. 项目结构](#4-项目结构)
- [5. Extension 基类](#5-extension-基类)
- [6. 程序控制可视化界面](#6-程序控制可视化界面)
- [7. 剧本方法](#7-剧本方法)
- [8. 章节调度策略](#8-章节调度策略)
- [9. 设置 Schema](#9-设置-schema)
- [10. 存档 Schema](#10-存档-schema)
- [11. 系统插槽与内置动作](#11-系统插槽与内置动作)
- [12. 运行时接口（Runtime API）](#12-运行时接口runtime-api)
- [13. 事件订阅](#13-事件订阅)
- [14. 技术栈与构建](#14-技术栈与构建)
- [15. 开发工作流](#15-开发工作流)
- [16. 完整实战范例](#16-完整实战范例)
- [17. 最佳实践与注意事项](#17-最佳实践与注意事项)
- [18. 附录](#18-附录)
  - [18.1 SDK 导入速查](#181-sdk-导入速查)
  - [18.2 系统插槽常量速查](#182-系统插槽常量速查)
  - [18.3 内置动作常量速查](#183-内置动作常量速查)
  - [18.4 事件类型速查](#184-事件类型速查)
  - [18.5 官方文档索引](#185-官方文档索引)
  - [18.6 SDK 类型定义速查](#186-sdk-类型定义速查)
  - [18.7 快捷键工具函数](#187-快捷键工具函数)
  - [18.8 UI-Ref 路径解析](#188-ui-ref-路径解析)
  - [18.9 变量作用域与持久化](#189-变量作用域与持久化)
  - [18.10 内置动作元数据表](#1810-内置动作元数据表)

---

## 1. 概述

扩展（Extension）是 LetsGal Studio 项目中可复用的功能与界面容器。它既可以只包含可视化 UI，也可以包含 TypeScript 程序，或者把两者组合起来。

这意味着制作自定义标题页、设置菜单和 HUD 时，不必先学习 React；只有在需要复杂计算、小游戏、外部服务或自定义剧本逻辑时，才需要初始化程序。

### 扩展能做什么

| 能力 | 说明 | 典型用途 |
|------|------|---------|
| **可视化界面** | 用 27 种元素搭建 UI，不需要构建程序 | 标题、存读档、设置、菜单、HUD |
| **程序 UI** | 通过 Extension 的 `render()` 渲染 React 组件 | 小游戏、Canvas、复杂动态界面 |
| **剧本方法** | 提供可在剧本中调用的逻辑 | 发放奖励、解锁内容、调用外部服务 |
| **章节调度策略** | 为高级调度选择下一章或结束流程 | 地图选点、日程、回合和周目结构 |
| **设置与存档** | 声明项目设置和随存档持久化的数据 | 背包、成就、周目和解锁记录 |
| **系统接管** | 替换系统插槽或内置对话组件 | 完整游戏壳、特殊对话交互 |

### 默认游戏壳

Studio 自带**不能卸载**的「默认游戏壳」扩展（`avg.internal.default-shell`），提供以下功能：

- 标题画面
- 存档和读档
- 设置
- 历史记录与语音重放
- CG、音乐和剧情片段鉴赏
- 剧情选项和玩家输入界面
- 游戏工具栏、输入对话框和消息框

它保证每个项目开箱即可运行。默认游戏壳的主要界面也是可视化 UI，可以在当前项目中生成可编辑副本，或者绑定到你自己的界面。详见[默认游戏壳与系统界面](https://docs.avg-engine.com/advanced/default-shell)。

需要让扩展决定高级调度的下一章时，使用 [`scheduleStrategy()`](https://docs.avg-engine.com/extensions/schedule-strategy)。

---

## 2. 扩展的三种形态

| 形态 | 包含内容 | 适合场景 |
|------|---------|---------|
| **纯界面扩展** | `extension.json` + `ui/` | 标题页、菜单、HUD、弹窗和系统界面皮肤 |
| **程序扩展** | TypeScript、SDK 和构建产物 | 剧本方法、复杂动态 UI、小游戏和服务接入 |
| **混合扩展** | 可视化 UI + TypeScript 控制器 | 用编辑器排版，再由代码补充动态行为 |

> Studio 新建扩展时默认从纯界面形态开始。之后可以随时「初始化程序」，原有可视化界面不会丢失。

---

## 3. 快速开始

### 3.1 新建扩展

1. 进入 **个性化 → 项目设置**
2. 在左侧扩展树顶部点击「新建扩展」
3. 填写名称、作者和描述
4. 「安装位置」由父目录 + 扩展目录名组成，实时显示最终路径。默认父目录是「文稿/AVG-Extensions」，也可以改到自己的代码仓库

创建完成后，扩展默认只有：

```
my-extension/
├── extension.json
├── .gitignore
└── ui/
```

这是一个可以直接工作的纯界面扩展，不需要安装依赖。

### 3.2 制作界面

展开扩展下的「界面」分组，点击新增按钮并输入显示名称。Studio 会创建界面文档并打开可视化编辑器。可以放置文字、图片、按钮、设置控件和存档格子，配置变量、点击动作与动画。完成后可以：

- 由另一份可视化界面的点击动作打开
- 在「游戏系统」中绑定为标题、存档、设置等系统界面
- 或继续初始化程序，为界面补充自定义逻辑

编辑器完整说明见[可视化界面编辑器](https://docs.avg-engine.com/advanced/visual-ui-editor)。

### 3.3 按需初始化程序

选择扩展下的「程序」。尚未初始化时，Studio 会展示两条路径：继续用可视化界面，或初始化程序。点击初始化后会补充以下文件结构：

```
my-extension/
├── extension.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── sdk/
├── src/
│   ├── index.tsx
│   └── welcome-ui.tsx
└── dist/
    └── index.js
```

`extension.json` 也会加入 `entry`，表示这个扩展包含需要加载的程序。

### 3.4 安装与构建

```bash
npm install
npm run build      # 单次构建
npm run watch      # 持续监听，源码变化后自动重新生成 dist/index.js
```

> ⚠️ 当前脚手架没有 `npm run dev` 命令。监听构建请使用 `npm run watch`。

### 3.5 在 Studio 中构建

> **v1.9.0 新增**

本地程序扩展可以在扩展树中右键选择「构建扩展（自动装依赖）」。Studio 会：

1. 按扩展的锁文件选择包管理器
2. 同步依赖（已经安装时会快速完成）
3. 执行构建脚本
4. 刷新项目发行物和程序预览

首次同步依赖可能需要几分钟。构建进度和失败信息会显示在任务提示中；需要持续监听源码变化时，仍使用终端运行 `npm run watch`。

### 3.6 扩展日志

选择扩展树中的程序模块后，程序预览下方会显示这份扩展自己的日志。扩展代码中的 `console.log`、`console.info`、`console.warn`、`console.error` 和 `console.debug` 会实时出现在这里，不会和其他扩展的输出混在一起。

日志面板支持按级别筛选、复制单条日志、清空内容。

---

## 4. 项目结构

### 4.1 纯界面扩展

```
my-extension/
├── extension.json
├── .gitignore
└── ui/
    └── main-panel.json    # 每个JSON文件是一份可视化界面
```

- `ui/` 下每个 JSON 文件是一份可视化界面，文件名由 Studio 管理
- 纯界面扩展的 `extension.json` 不声明 `entry`，Studio 不会尝试加载程序 bundle

### 4.2 程序扩展

```
my-extension/
├── extension.json         # 扩展清单
├── package.json           # 依赖管理
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 构建配置
├── README.md
├── sdk/                   # @avg-studio/sdk 本地副本（不要手动修改）
├── ui/                    # 可视化界面（由编辑器管理）
│   └── main-panel.json
├── src/                   # TypeScript / React 源码
│   ├── index.tsx          # 程序入口
│   └── welcome-ui.tsx
└── dist/
    └── index.js           # 构建产物，Studio 和玩家端实际加载
```

### 4.3 extension.json 清单文件

**纯界面扩展：**

```json
{
  "id": "user.my-shell",
  "name": "我的游戏壳",
  "description": "一套自定义系统界面",
  "author": "your-name",
  "version": "1.0.0",
  "sdkVersion": "^1.0.0"
}
```

**程序扩展会加入：**

```json
{
  "entry": "dist/index.js"
}
```

#### 字段说明（完整）

> 以下字段基于 SDK 源码 `ExtensionManifest` 类型定义，包含官方文档未提及的字段。

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `id` | 是 | `string` | 全局唯一标识，形如 `<author>.<name>`，小写+数字+连字符，也可以是单段。长度 2～128 |
| `name` | 是 | `string` | Studio 中显示的扩展名称（可中文） |
| `version` | 是 | `string` | 语义化版本号（semver） |
| `sdkVersion` | 是 | `string` | 兼容的 SDK 版本范围（npm semver range） |
| `author` | 是 | `string` | 作者标识（可以为空字符串） |
| `entry` | 是 | `string` | 程序 bundle 相对路径，默认 `"dist/index.js"` |
| `hasProgram` | 否 | `boolean` | 扩展是否有程序（代码 bundle）。纯资源扩展不写 `entry`，此值为 `false`；缺失时按 `true` 处理（兼容旧 manifest） |
| `description` | 否 | `string` | 简介，Inspector 里展示 |
| `icon` | 否 | `string` | 列表缩略图相对路径 |
| `propsSchema` | 否 | `Record<string, PropsSchemaField>` | 程序 UI 接受的 props 定义，Studio Inspector 据此自动生成表单 |
| `overrides` | 否 | `BuiltinComponentId[]` | 接管哪些内置组件：`"DialogueBox"` / `"Choice"` / `"InputBox"`。同一个内置组件全局只能被一个扩展接管 |
| `builtin` | 否 | `boolean` | 内置扩展标记。`true` 时不可禁用/卸载，且作为 ULTIMATE_FALLBACK 提供者。仅 `avg.internal.*` 命名空间可用，第三方声明会被拒绝 |
| `permissions` | 否 | `string[]` | 权限声明（阶段一只声明不强制，枚举开放） |
| `network` | 否 | `{ domains?: string[] }` | 网络声明，阶段二 CSP `connect-src` 白名单的落点 |
| `riskTier` | 否 | `"safe" \| "standard" \| "privileged"` | 风险分级，给市场审核/安装确认弹窗用。默认按 `standard` 处理 |
| `minHostVersion` | 否 | `string` | 最低宿主版本（semver），防止旧宿主静默忽略权限声明 |

#### PropsSchemaField

`propsSchema` 中每个字段的形态：

```typescript
interface PropsSchemaField {
  type: "string" | "number" | "boolean" | "enum";
  default?: unknown;
  description?: string;
  options?: string[];  // 仅 type === "enum" 时使用
}
```

#### overrides 详解

扩展通过 `manifest.overrides` 声明接管哪些内置组件，同时通过 `export const overrides = { DialogueBox: MyComponent }` 提供 React 实现。

接管后：
- **运行时**：引擎用扩展提供的 React 组件渲染，不再使用内置组件
- **Studio**：个性化 tab 里对应组件的编辑面板灰显，提示作者打开扩展配置
- **卸载恢复**：内置 schema 旧值保留在项目里，扩展卸载后自动恢复

> 接管粒度是"整个组件"，不能只接管样式不接管渲染。想做精细化样式定制 → 用内置 schema 字段 + `extra_css`；想换交互逻辑/加新状态 → 写扩展 override。

> **重要**：`id` 是设置、存档、界面引用和系统绑定的命名空间。项目开始使用后**不要随意修改**。

### 4.4 程序入口

`src/index.tsx` 导出一个或多个 `Extension` 子类：

```tsx
import manifest from "../extension.json";
import { InventoryExtension } from "./inventory";
import { InventoryPanel } from "./inventory-panel";

export { manifest, InventoryExtension, InventoryPanel };
```

Studio 会扫描 bundle 的导出，注册继承自 `Extension` 的模块。

### 4.5 三种来源

| 来源 | 是否可编辑 | 管理方式 |
|---|---|---|
| **系统** | 否；系统界面可创建项目副本 | 不能停用或卸载 |
| **本地** | 是 | 可重新定位、停用或删除 |
| **市场** | 否 | 可按项目启用、停用或卸载 |

扩展启用状态**跟随项目**。同一台电脑上，A 项目启用并不会让 B 项目自动启用。

本地扩展可以在扩展树中右键选择「重命名」。重命名只修改面向创作者显示的名称，不改变稳定扩展 id、目录名、项目依赖或剧本引用；系统和工坊扩展不能重命名。

界面和程序较多时，可以分别折叠扩展树中的「界面」与「程序」分组。折叠只影响 Studio 当前显示，不会停用模块或改变构建结果。

---

## 5. Extension 基类

`Extension` 是写扩展的统一基类。一个 `Extension` 子类 = 一个完整的游戏系统——它可以同时拥有界面、剧本可调用的方法、自己的项目设置和需要持久化的存档数据。

### 5.1 四种能力

| 你想要 | 怎么写 |
|---|---|
| 一个**界面**（背包面板、HUD、标题画面…） | 实现 `render()`，返回 `{ component, props }` |
| 一个可被剧本调用的**方法** | `static 方法名 = method({ ... })` |
| 扩展自己的**项目设置** | `static settings = settings((s) => ({ ... }))` |
| 需要存进存档的**数据** | `static saveSchema = defineSave({ ... })` |

### 5.2 最小例子

```typescript
import { Extension, extension } from "@avg-studio/sdk";

@extension({ id: "my-panel", label: "我的面板" })
export class MyPanel extends Extension {
  render() {
    return {
      component: () => <div>这是一个自定义面板</div>,
      props: {},
    };
  }
}
```

### 5.3 @extension 装饰器

`@extension({ ... })` 声明扩展模块的身份信息。等价于写 `static meta = meta({ ... })`。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 模块标识符（kebab-case），在 ui-ref 路径里被引用，缺省时由 SDK 从 class 名推导 |
| `label` | `string` | 显示名，Studio 在「显示界面」选择器和扩展设置面板里用 |
| `description` | `string` | 简要说明 |
| `category` | `string` | 分类（暂未使用） |
| `autonomous` | `boolean` | 启动期是否自动注册——见下文「Autonomous 模式」 |
| `exposeUI` | `boolean` | `false` 时即使实现了 `render()`，也只作为控制器/方法模块加载，不向 UI host、「显示界面」选择器和系统槽位导出该 React UI。缺省为 `true` |
| `supportsSlot` | `string \| string[]` | 声明该模块实现哪个系统插槽 |

> **`exposeUI` 使用场景**：当一个 Extension 子类同时包含方法（`static xxx = method(...)`）和 `render()`，但你只想把方法暴露给剧本调用、不希望界面出现在选择器里时，设 `exposeUI: false`。这在"方法模块复用了某个内部 React 组件做预览/调试"的场景下很有用。

### 5.4 静态钩子 vs 实例钩子

#### static onRegister（模块级，启动期跑一次）

引擎在启动时对每个 `Extension` 模块调用一次 `static onRegister(ctx)`——**无论 autonomous 是否为 true**。适合「整个游戏期间只需要做一次」的事：注册全局快捷键、订阅引擎事件、声明语义动作。

```typescript
@extension({ id: "save-screen", label: "存档画面" })
export class SaveScreen extends Extension {
  static onRegister(ctx: ExtensionContext) {
    ctx.input.registerAction({
      id: "save-screen.quick-save",
      label: "快速存档",
      defaultKeys: ["F5"],
    });
    ctx.input.onAction("save-screen.quick-save", () => {
      ctx.archive.quickSave();
    });
  }
}
```

#### onInit / onShow / onClose（实例级，每次显示界面跑）

每次 `ctx.ui.show(uiId)` 都会 `new` 一个实例。按需实现：

| 钩子 | 时机 |
|---|---|
| `onInit()` | 实例化、attach 完 host 之后，render 之前 |
| `onShow()` | UI 变为可见 |
| `onClose()` | UI 被关闭、实例销毁前 |

```typescript
export class SaveScreen extends Extension {
  onInit() {
    this.context.archive.cacheGameSnapshot();
  }

  onClose() {
    this.context.archive.clearGameSnapshot();
  }

  render() { ... }
}
```

> **注意**：`static onRegister` 拿的是 ctx 参数，实例钩子里通过 `this.context` 访问 ctx——它们的作用域不同。

### 5.5 render 方法

`render()` 是实例方法，返回 `{ component, props }`：

```typescript
render() {
  return {
    component: MyPanelComponent,   // React FC
    props: { data: this.data },    // 传给该组件的 props
  };
}
```

实现了 `render()` 的扩展模块会出现在「显示界面」action block 的选择器里。不实现 `render()` 就是一个纯方法/纯订阅型模块。

### 5.6 实例属性

| 属性 | 说明 |
|---|---|
| `this.context` | 当前扩展的 `ExtensionContext`（protected）。所有引擎 API 的入口 |
| `this.data` | 从「显示界面」block 传入的 props 数据，由 schema 解析得到 |
| `this.save` | 存档数据读写代理。需先声明 `static saveSchema` |
| `this.id` | 该实例的运行时 id |
| `this.close()` | 主动关闭这个 UI 实例（等价于外部 `ctx.ui.hide(uiId)`） |

在 React 组件里通过 hook 拿 ctx：

```typescript
import { useExtensionContext } from "@avg-studio/sdk";

function MyPanelComponent() {
  const ctx = useExtensionContext();
  const [bgmVolume] = ctx.config.useValue("bgmVolume");
  return <div>当前 BGM 音量：{bgmVolume}</div>;
}
```

### 5.7 this.save 的强类型访问

`saveSchema` 声明的字段通过 `this.save.get/set/useValue` 读写。在**类内部的钩子**里 TypeScript 能自动从 `saveSchema` 推断出 key 和 value 类型。

但**在 `method()` 的 `run` 回调里**，TypeScript 没办法把方法定义和外层类的 `saveSchema` 关联起来，`this.save` 的类型是 `EmptySaveAPI`。这时需要显式收窄：

```typescript
import type { SaveAPI } from "@avg-studio/sdk";

type MySaveMap = {
  items: readonly string[];
  gold: number;
};

@extension({ id: "inventory", label: "背包" })
export class Inventory extends Extension {
  static saveSchema = defineSave({
    items: { type: "list", persistence: "slot", default: [] as string[] },
    gold: { type: "number", persistence: "slot", default: 0 },
  });

  static addItem = method({
    title: "增加物品",
    schema: { itemId: { type: "string", label: "物品 ID", required: true } },
    run(_ctx, params) {
      // 显式收窄 this.save 类型
      const save = this.save as unknown as SaveAPI<MySaveMap>;
      save.set("items", [...save.get("items"), params.itemId]);
    },
  });
}
```

### 5.8 Autonomous 模式

`@extension({ autonomous: true })` 的扩展模块在引擎启动后**自动加载并显示**，不需要剧本调用 `ctx.ui.show()`。适合常驻 UI：

- 对话工具栏（跟着对话显隐的底部按钮栏）
- 全局快捷键监听器
- HUD 元素（生命值、好感度提示等）

```typescript
@extension({ id: "toolbar", label: "工具栏", autonomous: true })
export class Toolbar extends Extension {
  static onRegister(ctx) {
    ctx.subscribe("dialogue:changed", () => {
      if (ctx.dialogue.line()) {
        ctx.ui.show("toolbar");
      } else {
        ctx.ui.hide("toolbar");
      }
    });
  }

  render() {
    return { component: ToolbarComponent, props: {} };
  }
}
```

> `autonomous` 改变的是**加载策略**——非 autonomous 模块也会跑 `static onRegister`，只是不会自动显示界面。

### 5.9 跟系统插槽配合

通过 `supportsSlot` 声明该模块实现了哪个引擎内置 UI 槽位：

```typescript
import { Extension, extension, INTERNAL_SYSTEM_SLOT } from "@avg-studio/sdk";

@extension({
  id: "title-screen",
  label: "标题画面",
  supportsSlot: INTERNAL_SYSTEM_SLOT.Title,
})
export class MyTitleScreen extends Extension {
  render() {
    return { component: TitleScreenComponent, props: {} };
  }
}
```

---

## 6. 程序控制可视化界面

可视化 UI 可以独立使用，也可以和扩展程序组合成「**可视化布局 + TypeScript 控制器**」模式。使用 `ctx.visualUI` 为可视化 UI 补充动态逻辑。

### 6.1 给元素设置引用名

程序通过元素的「**引用名**」查找它。在可视化界面检查器中为需要控制的元素填写唯一引用名，例如 `title`、`close-button`。

- 没有引用名的元素不会出现在程序查询结果中，但仍会正常渲染
- 引用名只要求在当前界面内唯一

### 6.2 界面名称

`ctx.visualUI` 使用由**扩展 id** 和**界面名称**组成的完整名称：

```
@my.extension/main-panel
```

```typescript
import manifest from "../extension.json";

const uiName = `@${manifest.id}/main-panel`;
```

### 6.3 生命周期方法

| API | 触发时机 |
|-----|---------|
| `ctx.visualUI.onBeforeOpen(name, listener)` | 创建并挂载界面之前；等待异步监听完成 |
| `ctx.visualUI.onOpen(name, listener)` | 界面已经打开，可以获取元素 |
| `view.onClose(listener)` | 当前界面实例关闭时 |

三者都会返回**取消监听函数**。扩展被卸载或不再需要监听时，应调用它们清理。

### 6.4 监听界面打开

```typescript
import manifest from "../extension.json";
import { Extension } from "@avg-studio/sdk";

export class MyExtension extends Extension {
  static onRegister(ctx) {
    const uiName = `@${manifest.id}/main-panel`;

    ctx.visualUI.onOpen(uiName, (view) => {
      view.get("title")?.setProps({ text: "欢迎回来" });

      const closeButton = view.get("close-button");
      const offClick = closeButton?.on("click", () => view.close());

      view.onClose(() => offClick?.());
    });
  }
}
```

> 同一个元素在 JSON 中配置的点击动作，和程序注册的 `click` 监听可以同时执行。

### 6.5 打开前准备

`onBeforeOpen` 在界面创建 DOM 和挂载之前执行，并会等待异步任务完成：

```typescript
ctx.visualUI.onBeforeOpen(uiName, async () => {
  await preparePreviewImage();
});
```

> ⚠️ 不要在这里执行耗时且无反馈的网络请求，否则玩家会感觉按钮没有响应。

### 6.6 操作元素

`view.get(refId)` 返回一个元素句柄；引用名不存在时返回 `null`。

```typescript
const score = view.get("score");

score?.setProps({ text: "1200" });
score?.setStyle({
  color: "#ffd76a",
  fontSize: 42,
});
score?.setHidden(false);
```

| 方法 | 作用 |
|------|------|
| `setProps(patch)` | 合并更新元素内容或组件属性 |
| `setStyle(patch)` | 合并更新元素样式 |
| `setHidden(hidden)` | 显示或隐藏元素 |
| `on("click", listener)` | 监听点击，返回取消监听函数 |

> 这些修改只作用于当前运行中的界面实例，不会写回 JSON 设计稿。

### 6.7 打开、获取和关闭界面

```typescript
// 打开界面，并等待拿到实例
const view = await ctx.visualUI.open(uiName, {
  modal: true,
  size: "(100%, 100%)",
  position: "(0, 0)",
});

// 获取当前已经打开的实例
const existing = ctx.visualUI.attach(uiName);

// 主动关闭
view.close();
```

**关键说明：**
- `attach()` 在界面没有打开时返回 `null`
- 界面关闭后，旧句柄不再代表一个有效运行实例，**不应缓存**到下一次打开继续使用

### 6.8 什么时候仍使用 React UI

**可视化 UI 更适合**：布局、表单、菜单和由引擎能力驱动的组件。

以下情况仍可以使用 Extension 的 `render()`：

- 大量动态节点或复杂实时计算
- 依赖成熟 React 组件库
- 小游戏、Canvas、WebGL 等自定义渲染
- 完全由程序状态决定的交互

> 两种方式可以共存。系统插槽和显示 UI 选择器都能按各自规则使用可视化 UI 或程序 UI。

---

## 7. 剧本方法

剧本方法（`method()`）让扩展暴露一组可在剧本里调用的逻辑。创作者在剧本里通过「调用扩展方法」action block 选中你的方法、填好参数，剧本执行到那里时引擎就会调用你定义的 `run`。

### 7.1 声明方法

```typescript
import { Extension, extension, method } from "@avg-studio/sdk";

@extension({ id: "rewards", label: "奖励系统" })
export class RewardSystem extends Extension {
  static giveGold = method({
    title: "发放金币",
    description: "给玩家加金币并弹出提示",
    schema: {
      amount: { type: "number", label: "金币数", default: 100 },
    },
    run(ctx, params) {
      const cur = ctx.variables.get<number>("gold") ?? 0;
      ctx.variables.set("gold", cur + params.amount);
    },
  });
}
```

### 7.2 method() 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 方法选择器里的显示名 |
| `description` | 否 | 简要说明 |
| `id` | 否 | kebab-case 方法 id，缺省时从属性名推导（`addItem` → `"add-item"`） |
| `schema` | 否 | 参数定义，Studio 自动生成填参表单 |
| `run` | 是 | 执行体，剧本走到这里时调用 |
| `runImmediately` | 否 | 立即生效版本，详见下文 |
| `skip` | 否 | 玩家快进时的简化行为，详见下文 |

### 7.3 参数 schema

| 类型 | 编辑器控件 | 字段配置 |
|------|-----------|----------|
| `string` | 文本输入框 | 可配 `multiline` `default` `required` |
| `number` | 数字输入框 | 可配 `min` `max` `step` `default` `required` |
| `boolean` | 开关 | 可配 `default` `required` |
| `enum` | 下拉选择 | `options: [{ label, value }]` 必填，可配 `default` |
| `asset` | 素材选择器 | 通过 `assetType` 限定：`"image"` `"audio"` `"video"` `"any"` |
| `character` | 角色选择器 | 选项来自项目里的角色 |
| `characterPortrait` | 立绘选择器 | 可配 `characterField` 关联同 schema 里的角色字段 |
| `scene` | 场景选择器 | 选项来自项目里的场景 |
| `fragment` | Fragment 选择器 | 跳转目标用 |
| `variable` | 变量选择器 | 选已声明的变量。可配 `displayNameField` |
| `uiExtension` | UI 扩展选择器 | 选已注册的扩展模块 |

#### characterPortrait.characterField

当 schema 中同时有 `character` 字段和 `characterPortrait` 字段时，在 `characterPortrait` 上配置 `characterField` 指向角色字段的名称，Studio 会自动联动——创作者选了角色后，立绘选择器只显示该角色的立绘：

```typescript
static changePortrait = method({
  title: "切换立绘",
  schema: {
    targetCharacter: { type: "character", label: "角色", required: true },
    newPortrait: {
      type: "characterPortrait",
      label: "新立绘",
      characterField: "targetCharacter",  // 联动角色字段
      required: true,
    },
  },
  run(ctx, params) {
    ctx.character.change(params.targetCharacter, { portrait: params.newPortrait });
  },
});
```

#### variable.displayNameField

选择变量时，把面向创作者的显示名同步写入同 schema 的另一个 `string` 字段。扩展运行时既能拿稳定 key，也能拿"好感度"这类友好名称：

```typescript
static checkCondition = method({
  title: "检查变量条件",
  schema: {
    targetVar: { type: "variable", label: "目标变量", required: true },
    targetVarName: { type: "string", label: "变量显示名" },
    threshold: { type: "number", label: "阈值", default: 100 },
  },
  run(ctx, params) {
    // params.targetVar: 变量的稳定 key（如 "affection"）
    // params.targetVarName: 创作者看到的显示名（如 "好感度"）——自动同步
    const value = ctx.variables.get<number>(params.targetVar) ?? 0;
    if (value >= params.threshold) {
      console.log(`${params.targetVarName} 达到阈值`);
    }
  },
});
```

> ⚠️ 这套 schema 类型只用在 `method().schema`。**不要**和 `static settings` 的 builder API 混淆。

#### 代码示例

```typescript
static playEffect = method({
  title: "播放特效",
  schema: {
    targetCharacter: {
      type: "character",
      label: "目标角色",
      required: true,
    },
    effectType: {
      type: "enum",
      label: "效果类型",
      options: [
        { label: "闪烁", value: "blink" },
        { label: "抖动", value: "shake" },
        { label: "渐隐", value: "fade" },
      ],
      default: "shake",
    },
    backgroundImage: {
      type: "asset",
      label: "可选背景图",
      assetType: "image",
    },
  },
  run(ctx, params) {
    // params.targetCharacter: string
    // params.effectType: "blink" | "shake" | "fade"
    // params.backgroundImage: string
  },
});
```

`enum` 字段的 `params` 类型会被推导成选项值的字面量联合，其他字段的 `params` 类型都是 `string`。

### 7.4 run、runImmediately、skip

| 方法 | 何时被调用 |
|------|-----------|
| `run` | 剧本正常播放到该方法。可以是 async，引擎会等它返回再走下一个块 |
| `runImmediately` | 该方法的副作用需要"立即"发生、不等待动画 |
| `skip` | 玩家按住 Ctrl 快进剧本时调用。一般写"放结果但不放动画"的简化版 |

> `runImmediately` 和 `skip` 都是可选的，不提供时引擎会 fallback 到 `run`。

```typescript
static fadeToBlack = method({
  title: "渐黑",
  schema: { duration: { type: "number", label: "时长(ms)", default: 800 } },

  // 正常播放：跑完淡入动画
  async run(ctx, params) {
    await ctx.curtain.fadeIn({ duration: params.duration });
  },

  // 玩家快进：直接黑屏，不等动画
  skip(ctx) {
    ctx.curtain.show();
  },
});
```

### 7.5 在 run 里访问 this.save

`method()` 的 `run` 回调里，`this` 类型是 `ExtensionBase`，`this.save` 拿到的是 `EmptySaveAPI`。**正确做法**是显式声明存档形状然后收窄：

```typescript
import type { SaveAPI } from "@avg-studio/sdk";

type InventorySaveMap = {
  items: readonly string[];
  gold: number;
};

@extension({ id: "inventory", label: "背包" })
export class Inventory extends Extension {
  static saveSchema = defineSave({
    items: { type: "list", persistence: "slot", default: [] as string[] },
    gold:  { type: "number", persistence: "slot", default: 0 },
  });

  static addItem = method({
    title: "增加物品",
    schema: { itemId: { type: "string", label: "物品 ID", required: true } },
    run(_ctx, params) {
      const save = this.save as unknown as SaveAPI<InventorySaveMap>;
      save.set("items", [...save.get("items"), params.itemId]);
    },
  });
}
```

### 7.6 方法跟界面联动

方法改了状态、界面要实时刷新——**首选 React Hook 路径**：

```tsx
function GalleryComponent() {
  const ctx = useExtensionContext();
  const [items] = ctx.variables.useValue("gold");
  // gold 变化时组件自动重渲染
  return <div>金币：{items}</div>;
}
```

**关键说明：**
- `ctx.variables.useValue` 和 `this.save.useValue` 在底层都订阅了对应的 zustand store
- 命令式 `subscribe` 主要给非 React 上下文（比如 `static onRegister`）用
- 方法都是 **static**——每次调用引擎会 new 一个新实例来跑，`this` 上的临时字段不持久
- 要持久状态只能放 `this.save`（随存档）或 `ctx.variables`（剧本变量）

---

## 8. 章节调度策略

> **v1.8.0 新增**

扩展可以用 `scheduleStrategy()` 声明项目级章节调度策略。策略只会出现在「剧本运行设置 → 高级调度」中，不会出现在普通的「调用扩展方法」Block 里。

### 8.1 声明策略

```typescript
import {
  Extension, extension, scheduleStrategy,
} from "@avg-studio/sdk";

@extension({ id: "story-map", label: "故事地图" })
export class StoryMap extends Extension {
  static chooseNextChapter = scheduleStrategy({
    id: "choose-next-chapter",
    title: "故事地图调度",
    description: "根据地图选择和剧情状态决定下一章",
    async resolve(ctx, input) {
      const nextId = await openMapAndWaitForSelection(ctx, input.chapters);

      if (!nextId) {
        return { kind: "end", reason: "玩家结束本轮流程" };
      }

      return { kind: "chapter", chapterId: nextId };
    },
  });
}
```

### 8.2 输入参数

`resolve(ctx, input)` 的 `input` 包含以下字段：

| 字段 | 说明 |
|---|---|
| `schedulerId` | 当前根调度器的稳定标识 |
| `chapters` | 调度节点下方、未禁用的候选章节 |
| `activeChapterId` | 当前正在运行的章节；没有时为 `null` |
| `lastCompletedChapterId` | 上一个完成的章节；没有时为 `null` |
| `cycle` | 根调度器已经做出决策的轮次 |

> 每个候选章节包含 `id`、`name` 和 `index`。返回章节时必须使用当前 `chapters` 中存在的 `id`。

#### `debugConditions`（仅 Studio 调试模式）

`input.debugConditions` 是一个 `Readonly<Record<string, unknown>>`，**仅由 Studio 调试模式注入**。正式预览、构建和玩家运行时为 `undefined`。策略可以用它构造项目自己的日期、角色或事件测试状态，但不得把这里的值当成正式配置来源。

### 8.3 返回结果

**继续运行某章：**

```typescript
return {
  kind: "chapter",
  chapterId: input.chapters[0].id,
  diagnostics: { source: "fallback" },
};
```

**结束调度流程：**

```typescript
return {
  kind: "end",
  reason: "所有可用章节已经完成",
};
```

> `diagnostics` 可用于调试展示，Studio 不会解释其中的业务结构。

### 8.4 异步选择

`resolve` 可以返回 Promise，因此可以打开扩展 UI，等待玩家完成地图或日程选择后再返回结果。

> **注意**：不要把未完成的 Promise、DOM 节点或 UI 临时状态写进存档；存档只需要保留扩展自己的持久业务数据。

### 8.5 调试配置（debug）

`scheduleStrategy()` 可以声明 `debug` 配置，让 Studio 在调试模式中生成条件表单：

```typescript
static chooseNextChapter = scheduleStrategy({
  id: "choose-next-chapter",
  title: "故事地图调度",
  description: "根据地图选择和剧情状态决定下一章",

  // Studio 调试模式用：生成条件表单
  debug: {
    description: "设置测试用的日期和角色状态",
    schema: {
      testDate: { type: "string", label: "测试日期" },
      testCharacter: { type: "character", label: "测试角色" },
    },
  },

  async resolve(ctx, input) {
    // input.debugConditions?.testDate —— 仅 Studio 调试模式有值
    // ...
  },
});
```

| 字段 | 说明 |
|---|---|
| `debug.description` | 调试条件表单上方的项目侧说明 |
| `debug.schema` | Studio 按扩展方法参数同款 schema 生成调试表单。未声明时仍允许作者通过 JSON 输入任意条件 |

### 8.6 事件编辑配置（event）

`scheduleStrategy()` 还可以声明 `event` 配置，让 Studio 能编辑 Fragment 的 `metadata.scheduleEvent.config`：

```typescript
static storyMap = scheduleStrategy({
  id: "story-map",
  title: "故事地图",

  event: {
    description: "配置该 Fragment 作为地图节点的触发条件",
    schema: {
      mapX: { type: "number", label: "地图 X 坐标", required: true },
      mapY: { type: "number", label: "地图 Y 坐标", required: true },
      requiresFlag: { type: "string", label: "需要的前置标记" },
    },
    // 折叠态摘要（纯函数，无副作用）
    summarize(config) {
      return [
        { label: "坐标", value: `(${config.mapX}, ${config.mapY})` },
        { label: "前置", value: config.requiresFlag ?? "无" },
      ];
    },
    // 把事件条件转成 Studio 临时调试状态
    createDebugConditions(config, ref) {
      return { testDate: "day1", atLocation: `${config.mapX},${config.mapY}` };
    },
  },

  async resolve(ctx, input) { ... },
});
```

| 字段 | 说明 |
|---|---|
| `event.description` | 事件配置卡上方的项目侧说明 |
| `event.schema` | Studio 用来编辑 `Fragment.metadata.scheduleEvent.config` 的字段声明 |
| `event.summarize(config)` | 可选的折叠态摘要，返回 `ScheduleEventSummaryItem[]`（`{ label, value }`）。必须是纯函数 |
| `event.createDebugConditions(config, ref)` | 把事件条件转成一组"可满足该条件"的 Studio 临时调试状态。返回值仍会交给正式 Scheduler 筛选，不能通过这里强制指定 Event |

### 8.7 在 Studio 中启用

1. 构建扩展并在当前项目中启用
2. 打开「剧本运行设置」
3. 选择「高级调度」
4. 选择扩展提供的策略
5. 从项目入口运行，检查第一轮、重复轮次和结束条件

> **注意事项**：策略抛出错误、返回不存在的章节，或始终返回同一章而没有结束条件，都可能让项目无法继续。至少测试以下情况：无候选章节、目标章节被禁用、读档恢复、玩家关闭选择界面。

---

## 9. 设置 Schema

设置 Schema 让扩展声明项目级别的配置项。创作者在 Studio 的扩展设置面板中就能调整这些值，不需要改代码。

### 9.1 基本用法

```typescript
import { Extension, extension, settings } from "@avg-studio/sdk";

@extension({ id: "save-screen", label: "存档画面" })
export class SaveScreen extends Extension {
  static settings = settings((s) => ({
    slotCount: s.number("存档槽位数").default(30).range(1, 200),
    allowDelete: s.boolean("允许删除存档").default(true),
  }));
}
```

Studio 会根据定义自动生成设置面板的 UI 控件。

### 9.2 字段类型

| 类型 | 构造方法 | 控件 | 链式 API |
|------|----------|------|----------|
| 字符串 | `s.string(label)` | 文本输入框 | `.default()` `.multiline()` `.describe()` |
| 数字 | `s.number(label)` | 数字输入框 | `.default()` `.range(min, max)` `.step(n)` `.describe()` |
| 布尔 | `s.boolean(label)` | 开关 | `.default()` `.describe()` |
| 枚举 | `s.enum(label, values)` | 下拉选择 | `.default()` `.labels({...})` `.describe()` |
| 快捷键 | `s.shortcut(label)` | 快捷键录入 | `.default()` `.describe()` |
| 素材引用 | `s.asset(label)` | 素材选择器 | `.accepts("image", "audio", "video", "any")` `.describe()` |
| UI 引用 | `s.uiRef(label)` | UI 选择器 | `.default()` `.describe()` |

所有类型都支持 `.enabledWhen(key, equals?)` 做字段联动。

### 9.3 链式 API 示例

```typescript
static settings = settings((s) => ({
  welcomeText: s.string("欢迎语").default("欢迎来到游戏").multiline(),

  textSpeed: s.number("文字速度").default(50).range(10, 200).step(10),

  theme: s.enum("主题风格", ["default", "retro", "modern"] as const)
    .labels({ default: "默认", retro: "复古", modern: "现代" })
    .default("default"),

  quickSaveKey: s.shortcut("快存快捷键").default("F5"),

  titleBgm: s.asset("标题 BGM").accepts("audio"),
  titleBackground: s.asset("标题背景").accepts("image"),

  // 总开关 + 子开关联动
  showToolbar: s.boolean("显示工具栏").default(true),
  showSaveButton: s.boolean("显示存档按钮").default(true).enabledWhen("showToolbar"),
}));
```

### 9.4 enabledWhen 联动

`.enabledWhen(key, equals?)` 让字段在同级的另一个字段值满足条件时才可编辑，否则置灰。`equals` 不传时默认为 `true`。

> 这是纯 UI 层的联动——置灰时不会改变字段的值，只是不让创作者编辑。

### 9.5 读取设置值

#### React Hook 方式

```typescript
function MyComponent() {
  const ctx = useExtensionContext();

  // React Hook（值变化时组件自动更新，返回 [value, setter] 元组）
  const [subtitle, setSubtitle] = ctx.settings.useValue("subtitleText");

  // 命令式读取
  const slotCount = ctx.settings.get("slotCount");

  return <div>{subtitle}</div>;
}
```

#### 非 React 上下文（命令式订阅）

```typescript
static onRegister(ctx) {
  ctx.settings.subscribe("quickSaveKey", (newKey) => {
    // 快捷键值变了，重新绑定
  });
}
```

#### 跨模块读取

```typescript
const showSkip = ctx.settings.cross.get("toolbar", "showSkipButton");
```

### 9.6 设置的存储

设置值存在项目的 `project.json`（`extensionSettings[extensionId][key]`）中。当 UI 模块有自己的设置时，key 会自动加上 `<uiId>.` 前缀。

### 9.7 设置 vs 引擎配置

| 场景 | 适用 API |
|------|----------|
| 创作者在 Studio 中配置的项目参数 | **设置 Schema** (`ctx.settings`) |
| 玩家在游戏中调整的运行时配置 | `ctx.config` API |

---

## 10. 存档 Schema

存档 Schema 让扩展可以将数据保存到存档中，在读档时恢复。典型用途包括：背包物品、已解锁的图鉴、自定义小游戏进度等。

### 10.1 基本用法

用 `defineSave` 声明存档字段。每个字段需要三个属性：`type`（数据类型）、`persistence`（持久化模式）、`default`（默认值）。

```typescript
import { Extension, extension, defineSave } from "@avg-studio/sdk";

@extension({ id: "gallery", label: "鉴赏" })
export class GalleryScreen extends Extension {
  static saveSchema = defineSave({
    unlockedCGs: {
      type: "list",
      persistence: "shared",
      default: [] as string[],
    },
    lastPage: {
      type: "number",
      persistence: "slot",
      default: 0,
    },
  });
}
```

### 10.2 字段属性

#### `type` — 数据类型

| 值 | 说明 |
|---|---|
| `"string"` | 字符串 |
| `"number"` | 数字 |
| `"boolean"` | 布尔值 |
| `"list"` | 数组 |

> `type` 用于 Studio 调试面板的渲染分类，**不参与运行时校验**。

#### `persistence` — 持久化模式

| 值 | 说明 | 典型用途 |
|---|---|---|
| `"slot"` | 跟随存档槽位，不同槽位的数据互相独立 | 背包内容、关卡进度、NPC 好感度 |
| `"shared"` | 跨所有存档共享 | 已解锁的 CG、成就、总游玩时间 |

#### `default` — 默认值

- TypeScript 会从字面量推导出精确类型
- 数组字段的 `default` 写 `[] as string[]`，读出来是 `readonly string[]`——**不能 `push`，只能整体替换 `set`**

#### `label` — 人类可读说明（可选）

```typescript
static saveSchema = defineSave({
  unlockedCGs: {
    type: "list",
    persistence: "shared",
    default: [] as string[],
    label: "当前解锁的 CG 列表",  // Studio 调试面板展示用
  },
});
```

`label` 纯展示用途，给 Studio 调试面板渲染时显示字段的人类可读名称。不填则面板只显示字段名。不参与运行时逻辑。

### 10.3 读写存档数据

```typescript
// 命令式读取
const page = this.save.get("lastPage");

// 命令式写入
this.save.set("lastPage", 5);

// React Hook（组件中使用，值变化时自动重渲染）
const [cgs, setCGs] = this.save.useValue("unlockedCGs");
```

### 10.4 类型安全

`defineSave` 使用 `const` 类型参数保留字面量类型。`this.save` 的所有方法都是**强类型**的：

- **key 自动补全**：存档字段名自动提示
- **value 类型自动推断**：根据 `default` 推导精确类型
- **编译期错误检查**：拼错的 key 在编译期报错
- **未声明 `saveSchema` 的扩展**，`this.save` 上的任何操作都会编译报错

### 10.5 存档 Schema vs 设置 Schema

| | 设置 Schema | 存档 Schema |
|---|---|---|
| **定义** | 创作者在 Studio 中配置的项目参数 | 游戏运行时产生的玩家数据 |
| **示例** | 背包格数、槽位数量 | 背包里的物品、解锁的 CG |
| **修改时机** | 在编辑器中修改 | 在游戏中读写 |

---

## 11. 系统插槽与内置动作

系统插槽是引擎预定义的语义 UI 入口。调用方只说「打开设置」或「打开存档」，项目绑定决定最终使用哪一份界面。这种间接绑定让创作者以后可以替换整套游戏壳，而不必修改剧本和每个按钮。

### 11.1 九个系统插槽

| 插槽 | 常量 | 说明 | 必需 |
|------|------|------|------|
| 标题画面 | `INTERNAL_SYSTEM_SLOT.Title` | 游戏启动和返回标题时打开 | 是 |
| 对话工具栏 | `INTERNAL_SYSTEM_SLOT.Toolbar` | 对话期间自动显示的操作工具栏 | 是 |
| 存档界面 | `INTERNAL_SYSTEM_SLOT.Save` | 以保存模式显示槽位 | 是 |
| 读档界面 | `INTERNAL_SYSTEM_SLOT.Load` | 以读取模式显示槽位 | 是 |
| 设置界面 | `INTERNAL_SYSTEM_SLOT.Settings` | 玩家运行时设置 | 否 |
| 历史记录 | `INTERNAL_SYSTEM_SLOT.History` | 对话回顾和语音重放 | 否 |
| 鉴赏画面 | `INTERNAL_SYSTEM_SLOT.Gallery` | CG、音乐和剧情片段鉴赏 | 否 |
| 玩家输入 | `INTERNAL_SYSTEM_SLOT.Input` | 收集并校验玩家输入 | 是 |
| 选项界面 | `INTERNAL_SYSTEM_SLOT.Choice` | 显示剧情分支选项并返回原选项序号 | 是 |

默认游戏壳提供全部九个插槽。标题、对话工具栏、存档、读档、玩家输入和选项界面的绑定失效时，引擎会回退到内置实现。对话工具栏由默认游戏壳的自治控制器跟随对话状态打开和关闭——把工具栏插槽改绑到其他界面后，这套显隐时机保持不变，只替换实际显示的界面。

### 11.2 绑定可视化界面

可视化界面不需要程序声明。创建界面后，进入 **个性化 → 项目设置 → 游戏系统**，在目标插槽中选择它即可。任何启用扩展中的可视化界面都可以作为候选。系统或市场界面只读，需要修改时先创建项目副本，或复制到本地扩展。

选项界面需要包含「选项列表」智能组件，才能接收分支内容并返回选择结果。玩家输入界面需要使用输入对话框能力处理确认、取消和校验。

> 界面里的按钮要打开另一个系统位置时，配置「打开存档」「打开设置」等系统动作。不要写死具体界面，这样按钮会跟随绑定变化。

### 11.3 声明程序 UI 支持

```typescript
import { Extension, extension, INTERNAL_SYSTEM_SLOT } from "@avg-studio/sdk";

// 单个插槽
@extension({
  id: "title-screen",
  label: "自定义标题画面",
  supportsSlot: INTERNAL_SYSTEM_SLOT.Title,
})
export class MyTitleScreen extends Extension { ... }

// 多个插槽
@extension({
  id: "save-screen",
  label: "存读档界面",
  supportsSlot: [INTERNAL_SYSTEM_SLOT.Save, INTERNAL_SYSTEM_SLOT.Load],
})
export class MySaveLoadScreen extends Extension { ... }
```

### 11.4 从程序触发插槽

```typescript
// 打开当前绑定的存档界面
await ctx.system.invoke(INTERNAL_SYSTEM_SLOT.Save);

// 传递 payload 和容器选项
await ctx.system.invoke(
  INTERNAL_SYSTEM_SLOT.Save,
  { mode: "save" },
  {
    modal: true,
    containerOptions: {
      size: "(100%, 100%)",
      position: "(0, 0)",
    },
  },
);

const binding = ctx.system.getBinding(INTERNAL_SYSTEM_SLOT.Save);
const slots = ctx.system.listSlots();

// 常驻槽位可以由控制器主动收起
await ctx.system.close(INTERNAL_SYSTEM_SLOT.Toolbar);
```

> `invoke` 的第三个参数可以设置 `modal`，以及容器的 `size`、`position` 和 `interactable`。

### 11.5 选项界面的 payload

剧情分支会自动调用 `INTERNAL_SYSTEM_SLOT.Choice`，并传入：

- **`branchId`**：当前分支 Block 标识
- **`choices`**：过滤后的可见选项，包括原始序号、文字和是否可用
- **`onSelect(originalIndex)`**：界面确认选择后必须调用的回调

自定义程序 UI 应只提交可用选项的 `originalIndex`，然后关闭自身。界面未选择就关闭或调用失败时，引擎会回退到内置选项界面，避免剧情中断。

玩家输入和剧情选项通常由引擎自动调用。普通扩展界面不应在缺少对应 payload 时直接打开这两个插槽。

### 11.6 内置动作（输入）

系统插槽是「系统 UI 位置」，内置动作是「玩家输入对应的语义」。两者是独立概念。

| 动作 | 常量 | 默认按键 | 含义 |
|------|------|----------|------|
| 推进对话 | `INTERNAL_ACTION.Advance` | 鼠标点击 / 空格 / Enter / 滚轮 | 推进到下一句 |
| 跳过 | `INTERNAL_ACTION.Skip` | Ctrl | 快进到段尾 |
| 自动播放 | `INTERNAL_ACTION.AutoToggle` | A | 切换自动模式 |
| 隐藏对话框 | `INTERNAL_ACTION.HideDialogue` | 右键 / Delete | 临时隐藏对话框 |
| 重放语音 | `INTERNAL_ACTION.ReplayVoice` | R | 重放当前角色语音 |

### 11.7 订阅内置动作

```typescript
import { Extension, extension, INTERNAL_ACTION } from "@avg-studio/sdk";

@extension({ id: "my-hud", label: "HUD", autonomous: true })
export class MyHud extends Extension {
  static onRegister(ctx) {
    ctx.input.onAction(INTERNAL_ACTION.AutoToggle, () => {
      console.log("玩家切换了自动播放");
    });
  }
}
```

### 11.8 注册自定义动作

```typescript
static onRegister(ctx) {
  ctx.input.registerAction({
    id: "my-ext.open-inventory",
    label: "打开背包",
    defaultKeys: ["KeyI"],
  });

  ctx.input.onAction("my-ext.open-inventory", () => {
    void ctx.visualUI.open("@my-ext/inventory");
  });
}
```

> 自定义动作 id 必须以扩展 id 为前缀。`internal.*` 是引擎保留命名空间，扩展不能使用。

---

## 12. 运行时接口（Runtime API）

`ExtensionContext`（简称 `ctx`）是扩展与引擎交互的统一入口。

> **本章内容基于 SDK 源码 `sdk-context.ts` 的完整接口定义编写，包含官方文档未覆盖的 API 细节。**

### 12.1 获取 ctx 的三种方式

```typescript
// 1. React UI 中
import { useExtensionContext } from "@avg-studio/sdk";

export function StatusPanel() {
  const ctx = useExtensionContext();
  const [affection] = ctx.variables.useValue<number>("affection");
  return <span>好感度：{affection ?? 0}</span>;
}

// 2. 剧本方法的 run() 参数
static run(ctx, params: { amount: number }) {
  const current = ctx.variables.get<number>("gold") ?? 0;
  ctx.variables.set("gold", current + params.amount);
}

// 3. onRegister 钩子参数
static onRegister(ctx) {
  ctx.input.registerAction({ ... });
}
```

### 12.2 接口索引（23 个命名空间）

| 分类 | 入口 | 用途 |
|------|------|------|
| 流程控制 | `ctx.flow` | 跳转片段、调用片段、重新开始；含 AbortSignal |
| 剧本读取 | `ctx.story` | 读取章节目录、单章或完整剧本 |
| 变量 | `ctx.variables` | 读写并订阅剧本变量 |
| 场景 | `ctx.scene` | 切换、显示与销毁场景 |
| 角色 | `ctx.character` | 查询角色列表、控制立绘显示 |
| 对话 | `ctx.dialogue` | 读取对话行/选项、控制对话框和播放模式 |
| 音频 | `ctx.sound` | 播放、暂停和停止音频 |
| 摄像机 | `ctx.camera` | 平移、震动和复位 |
| 幕布 | `ctx.curtain` | 控制幕布与淡入淡出 |
| 存档 | `ctx.archive` | 存档、读档、快速存读档、截图缓存、shared 刷新 |
| 历史记录 | `ctx.history` | 读取对话历史、选择记录、输入记录、语音重放 |
| 引擎配置 | `ctx.config` | 读写音量、文字速度等 8 个玩家配置键 |
| 程序 UI | `ctx.ui` | 显示和隐藏 React 程序 UI |
| 可视化界面 | `ctx.visualUI` | 打开并控制编辑器产物界面 |
| 游戏壳层 | `ctx.game` | 退出游戏、读取作品标题、窗口全屏控制 |
| 系统插槽 | `ctx.system` | 调用标题、存读档、设置等 9 个系统入口 |
| 输入管理 | `ctx.input` | 注册/反注册语义动作、绑定快捷键、查询活跃键 |
| 扩展设置 | `ctx.settings` | 读写当前扩展的项目级设置；含跨模块读取 |
| 素材 | `ctx.asset` | 把素材 URI 解析为可访问 URL |
| 场景渲染 | `ctx.sceneRender` | 在扩展容器中隔离渲染场景（鉴赏大图等） |
| 事件订阅 | `ctx.subscribe` | 监听 9 种引擎状态变化 |
| 宿主对象 | `ctx.getHost()` | 访问不稳定的宿主内部对象（逃生口） |

### 12.3 通用约定

- `use...` 开头的方法是 React Hook，只能在 React 组件或自定义 Hook 顶层调用
- 返回 `Promise` 的方法建议使用 `await`，需要避免阻塞时可以显式写成 `void ctx.xxx()`
- `ctx.settings`、`ctx.ui` 等接口会绑定到当前扩展作用域；通常只需使用模块内的短 id
- 方法签名中的 `void | Promise<void>` 表示不同宿主可以同步或异步完成操作

### 12.4 ctx.flow — 流程控制

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `goToFragment(id)` | `void` | 跳转到指定 Fragment |
| `callFragment(id, options?)` | `Promise<void>` | 调用一个剧本片段，在该片段返回后继续当前执行流 |
| `restart()` | `void` | 重新开始游戏 |
| `signal` | `AbortSignal`（只读属性） | 当前脚本运行周期的取消信号 |

#### `callFragment` — 片段子调用

```typescript
await ctx.flow.callFragment("shared-flashback", {
  chapterId: "chapter-3",  // 可选：目标片段所属章节，缺省时由宿主按当前章节解析
});
// 片段执行完毕后，控制流回到这里继续
```

#### `signal` — 取消信号

```typescript
static onRegister(ctx) {
  // 在异步操作开始时捕获 signal 引用
  const signal = ctx.flow.signal;

  fetchSomeData().then((data) => {
    // softReset / destroy 会取消旧 signal
    if (signal.aborted) return;
    // 处理数据...
  });
}
```

> `signal` 是当前脚本运行周期的只读 `AbortSignal`。`softReset` / `destroy` 会取消旧信号并创建新周期。调用方应在异步操作开始时捕获当前引用，操作完成前检查 `aborted` 状态。

### 12.5 ctx.story — 剧本读取

> Player 的章节文件可能按需加载，所以读取具体章节和完整剧本始终是异步的。返回的章节是独立快照，修改它不会改动 Studio 工程或正在运行的游戏。

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `listChapters()` | `StoryChapterMeta[]` | 同步读取章节目录（不加载正文） |
| `getChapter(id)` | `Promise<StoryChapter \| null>` | 按章节 id 读取完整章节 |
| `getAllChapters()` | `Promise<StoryChapter[]>` | 按章节目录顺序读取完整剧本 |

```typescript
// 读取章节目录
const chapters = ctx.story.listChapters();
chapters.forEach(ch => console.log(ch.id, ch.name, ch.disabled));

// 读取单章
const ch3 = await ctx.story.getChapter("chapter-3");
if (ch3) {
  ch3.fragments.forEach(frag => {
    console.log(frag.id, frag.name, frag.blocks.length);
  });
}
```

### 12.6 ctx.variables — 变量

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `get<T>(name)` | `T \| undefined` | 读取变量；不存在时返回 `undefined` |
| `set<T>(name, value)` | `void` | 写入变量 |
| `useValue<T>(name)` | `[T \| undefined, setter]` | React Hook；值变化时重新渲染组件 |

变量值类型 `VariableValue` = `string | number | boolean | null`。

```typescript
// 基本读写
const before = ctx.variables.get<number>("affection") ?? 0;
ctx.variables.set("affection", before + 15);

// React UI 中订阅
const [affection, setAffection] = ctx.variables.useValue<number>("affection");
```

> `useValue()` 是 React Hook，只能在 React 组件中使用。在类方法、事件回调、`onRegister` 中请改用 `get()`、`set()` 或 `ctx.subscribe`。

### 12.7 ctx.scene — 场景

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `change(id)` | `void \| Promise<void>` | 将主舞台切换到指定场景 |
| `show(id)` | `void \| Promise<void>` | 显示场景 |
| `hide(id)` | `void \| Promise<void>` | 隐藏场景但保留实例 |
| `destroy(id)` | `void \| Promise<void>` | 销毁指定场景实例 |
| `destroyAll()` | `void \| Promise<void>` | 销毁全部场景实例 |

```typescript
await ctx.scene.change("school-rooftop");
await ctx.scene.hide("school-rooftop");
await ctx.scene.show("school-rooftop");
```

> 鉴赏、缩略图等"只预览、不改变当前游戏场景"的需求，请使用 `ctx.sceneRender`，而非 `ctx.scene`。`ctx.scene.change` 会进存档，鉴赏需求是只读预览。

### 12.8 ctx.character — 角色

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `get(id)` | `Character \| null` | 按 id 查询单个角色 |
| `list()` | `Character[]` | 同步取项目中所有角色定义（命令式） |
| `show(id, options?)` | `Promise<void> \| void` | 显示角色立绘 |
| `change(id, options?)` | `Promise<void> \| void` | 切换角色立绘/状态 |
| `hide(id)` | `Promise<void> \| void` | 隐藏角色立绘 |
| `useCharacter(id)` | `Character \| null` | React Hook：订阅单个角色 |
| `useAll()` | `Character[]` | React Hook：订阅全部角色列表，Studio 下角色增删改时自动重渲染 |

```typescript
// 命令式查询
const char = ctx.character.get("sakakibara-mizuki");
console.log(char?.name, char?.portraits.length);

const allChars = ctx.character.list();
allChars.forEach(c => console.log(c.id, c.name));

// React Hook
function CharacterList() {
  const ctx = useExtensionContext();
  const characters = ctx.character.useAll();
  return (
    <ul>
      {characters.map(c => <li key={c.id}>{c.name}</li>)}
    </ul>
  );
}
```

> `useAll()` 在 Studio 下角色被增删改时会自动触发重渲染。玩家壳运行时角色数据是 build 产物、运行时不变，所以 hook 拿到的列表稳定。

### 12.9 ctx.dialogue — 对话

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `line()` | `DialogueLine \| null` | 读取当前对话行 |
| `choice()` | `ChoiceContext \| null` | 读取当前选项上下文 |
| `hideBox()` | `void` | 隐藏对话框 |
| `showBox()` | `void` | 显示对话框 |
| `getDefaultTextInterval()` | `number \| null` | 当前项目默认对话框样式推荐的逐字间隔（ms） |
| `useLine()` | `DialogueLine \| null` | React Hook：订阅当前对话行 |
| `useChoice()` | `ChoiceContext \| null` | React Hook：订阅当前选项上下文 |
| `toggleSkipMode()` | `void` | 切换"快进/跳过"状态 |
| `toggleAutoMode()` | `void` | 切换"自动播放"状态 |
| `useSkipMode()` | `boolean` | React Hook：订阅当前是否处于快进模式 |
| `useAutoMode()` | `boolean` | React Hook：订阅当前是否处于自动模式 |

#### 对话框控制

```typescript
// 隐藏/显示对话框（不是临时隐藏，是编程式控制）
ctx.dialogue.hideBox();
ctx.dialogue.showBox();
```

#### 快进/自动播放

```typescript
// 工具栏按钮：切换快进
function SkipButton() {
  const ctx = useExtensionContext();
  const isSkipping = ctx.dialogue.useSkipMode();
  return (
    <button onClick={() => ctx.dialogue.toggleSkipMode()}>
      {isSkipping ? "停止快进" : "快进"}
    </button>
  );
}
```

> `toggleSkipMode` / `toggleAutoMode` 是 boolean 状态切换——任意按键/鼠标点击都会自动关闭。只在对话/段落 channel 中生效；不在对话中调用会被引擎忽略。`engine` 内部的 skip boolean（进行中/关闭）跟 `config.skipMode` 的"全部跳过/只跳已读"是两个维度——前者是状态，后者是策略。

#### getDefaultTextInterval

```typescript
// 切换个性化样式时保留玩家当前速度，
// 但设置菜单"恢复默认"应回到这个样式推荐值
const defaultInterval = ctx.dialogue.getDefaultTextInterval();
```

> 注意：`getDefaultTextInterval()` 返回的是样式推荐值，**不是**玩家当前 `config.textSpeed`。

### 12.10 ctx.sound — 音频

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `play(uri, options?)` | `Promise<void> \| void` | 播放音频 |
| `stop(idOrUri)` | `Promise<void> \| void` | 停止音频 |
| `pause(idOrUri)` | `Promise<void> \| void` | 暂停音频 |
| `resume(idOrUri)` | `Promise<void> \| void` | 恢复音频 |

`play()` 常用选项：`id`（稳定标识符）、`channel`（通道）、`loop`（循环）、`volume`（音量）、`fadeDuration`（淡入淡出）。

```typescript
await ctx.sound.play("audio/bgm/summer-night.ogg", {
  id: "music-preview",
  loop: true,
  volume: 0.8,
});

await ctx.sound.pause("music-preview");
await ctx.sound.resume("music-preview");
```

> 同一功能内尽量固定使用一个播放 `id`，不要依赖较长、可能变化的素材 URI 来停止音频。

### 12.11 ctx.camera — 摄像机

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `pan(options)` | `Promise<void> \| void` | 平移摄像机 |
| `shake(options)` | `Promise<void> \| void` | 震动摄像机 |
| `reset()` | `Promise<void> \| void` | 复位摄像机 |

```typescript
await ctx.camera.pan({ x: 100, y: 50, duration: 800 });
await ctx.camera.shake({ intensity: 10, duration: 300 });
await ctx.camera.reset();
```

### 12.12 ctx.curtain — 幕布

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `fadeIn(options?)` | `Promise<void> \| void` | 淡入（幕布从透明到不透明） |
| `fadeOut(options?)` | `Promise<void> \| void` | 淡出（幕布从不透明到透明） |
| `show(options?)` | `Promise<void> \| void` | 直接显示幕布 |
| `hide(options?)` | `Promise<void> \| void` | 直接隐藏幕布 |

```typescript
// 渐黑 → 切换场景 → 渐亮
await ctx.curtain.fadeIn({ duration: 800 });
await ctx.scene.change("school-rooftop");
await ctx.curtain.fadeOut({ duration: 800 });

// 快进时直接黑屏
ctx.curtain.show();
```

### 12.13 ctx.archive — 存档

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `list()` | `Promise<ArchiveSlot[]>` | 列出所有存档槽位 |
| `save(slotId, options?)` | `Promise<void>` | 保存到指定槽位 |
| `load(slotId)` | `Promise<void>` | 从指定槽位读取 |
| `delete(slotId)` | `Promise<void>` | 删除指定槽位 |
| `quickSave(options?)` | `Promise<void>` | 快速存档 |
| `quickLoad()` | `Promise<boolean>` | 快速读档；返回是否成功 |
| `useSlots()` | `ArchiveSlot[]` | React Hook：订阅存档槽位列表 |
| `flushShared()` | `Promise<void>` | 强制把 shared 变量立即落盘 |
| `resetShared()` | `Promise<void>` | 清空所有 shared 变量，删除磁盘文件 |
| `cacheGameSnapshot()` | `Promise<void>` | 触发引擎截取当前游戏画面，缓存供后续 `save()` 复用 |
| `clearGameSnapshot()` | `void` | 清掉 `cacheGameSnapshot()` 缓存 |

#### 存档槽位数据结构

```typescript
interface ArchiveSlot {
  id: number;
  createdTime: number;
  modifiedTime: number;
  snapshotDataUri: string;    // 缩略图 data URI
  currentSpeaker: string;     // 当前说话角色名
  currentDialogueText: string; // 当前对话文本
  isQuickSave?: boolean;      // 是否为快速存档
  userParams?: unknown;       // 自定义参数（save 时传入）
}
```

#### save 的 userParams

```typescript
// 存档时传入自定义参数
await ctx.archive.save(5, {
  userParams: { chapter: "ch3", label: "夏日祭前夜" },
});

// 读取时可以从 ArchiveSlot.userParams 拿回
const slots = await ctx.archive.list();
const slot5 = slots.find(s => s.id === 5);
console.log(slot5?.userParams); // { chapter: "ch3", label: "夏日祭前夜" }
```

#### flushShared — 立即落盘

```typescript
// 玩家点了退出游戏，强制把 shared 变量立即落盘（不等 500ms debounce）
await ctx.archive.flushShared();
ctx.game.exit();
```

#### resetShared — 重置档案数据

```typescript
// 设置画面里的"重置档案数据"按钮
// ⚠️ 调用方负责"你真的要重置吗"二次确认，API 本身不弹确认
const confirmed = await showConfirmDialog("确定要重置所有档案数据吗？");
if (confirmed) {
  await ctx.archive.resetShared();
}
```

#### cacheGameSnapshot — 截图缓存

```typescript
export class SaveScreen extends Extension {
  onInit() {
    // 进 DOM 之前截图——画面上还没有 SaveScreen 自身覆盖
    // 后续玩家点保存时，save 直接用这张缓存
    this.context.archive.cacheGameSnapshot();
  }

  onClose() {
    // 清掉缓存
    this.context.archive.clearGameSnapshot();
  }

  render() { ... }
}
```

> 截图走 `IScreenshotAdapter`（host 注入），Studio/Player 用 Electron `webContents.capturePage`，native 实现约 30ms 且能拿 WebGL 像素。失败静默（`console.warn`），`save` 会走兜底 `html2canvas` 现场截。

#### useSlots — React Hook

```typescript
function SaveSlotList() {
  const ctx = useExtensionContext();
  const slots = ctx.archive.useSlots();
  return slots.map(slot => <SaveSlotCard key={slot.id} slot={slot} />);
}
```

### 12.14 ctx.history — 历史记录

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `entries()` | `HistoryEntry[]` | 读取对话历史条目列表 |
| `choices()` | `Record<string, number>` | 读取所有选择记录（branchId → 选中的 originalIndex） |
| `ifResults()` | `Record<string, boolean>` | 读取所有 if 分支结果 |
| `inputs()` | `Record<string, string>` | 读取所有玩家输入记录 |
| `replayVoice(uri)` | `Promise<void> \| void` | 重放指定语音 |
| `useSnapshot()` | `HistorySnapshot` | React Hook：订阅完整历史快照 |

#### 历史条目数据结构

```typescript
interface HistoryEntry {
  uuid?: string;
  text: string;
  characterId?: string;     // 说话角色的稳定 id（显示名变化时保持不变）
  name?: string;            // 说话角色显示名
  voiceUri?: string;        // 语音 URI
  isReadBefore?: boolean;   // 是否已读过
  isChoice?: boolean;       // 是否为选项记录
}

interface HistorySnapshot {
  entries: HistoryEntry[];
  choices: Record<string, number>;
  ifResults: Record<string, boolean>;
  inputs: Record<string, string>;
}
```

#### 使用示例

```typescript
// 命令式读取
const entries = ctx.history.entries();
entries.forEach(e => console.log(e.name, e.text, e.isReadBefore));

// 读取选择历史
const choices = ctx.history.choices();
// { "branch-summer-festival": 1, "branch-confession": 0 }

// 读取 if 分支结果
const ifResults = ctx.history.ifResults();
// { "if-met-mizuki": true, "if-gave-gift": false }

// 读取玩家输入
const inputs = ctx.history.inputs();
// { "player-name": "悠真", "player-nickname": "小悠" }

// 重放语音
await ctx.history.replayVoice("audio/voice/mizuki_line_03.ogg");

// React Hook：完整快照
function HistoryScreen() {
  const ctx = useExtensionContext();
  const snapshot = ctx.history.useSnapshot();
  return (
    <div>
      {snapshot.entries.map(e => (
        <div key={e.uuid}>
          <strong>{e.name}</strong>: {e.text}
          {e.voiceUri && <button onClick={() => ctx.history.replayVoice(e.voiceUri!)}>▶</button>}
        </div>
      ))}
    </div>
  );
}
```

### 12.15 ctx.config — 引擎配置

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `get(key)` | `EngineConfigValue<K>` | 读取引擎配置值 |
| `set(key, value)` | `void \| Promise<void>` | 写入引擎配置值 |
| `reset()` | `Promise<void>` | 把设置界面管理的引擎配置恢复为默认值 |
| `snapshot()` | `EngineConfigSnapshot` | 一次性读取全部引擎配置 |
| `useValue(key)` | `[value, setter]` | React Hook：订阅单个配置变化 |

#### EngineConfigKey — 8 个配置键

| 键 | 类型 | 说明 |
|---|---|---|
| `"skipMode"` | `"all" \| "read"` | 跳过模式：全部跳过 / 只跳已读 |
| `"textSpeed"` | `number` | 文字速度 |
| `"autoModeTextSpeed"` | `number` | 自动播放时的文字速度 |
| `"stopVoiceOnNextDialogue"` | `boolean` | 推进对话时是否停止语音 |
| `"masterVolume"` | `number` | 主音量 |
| `"bgmVolume"` | `number` | BGM 音量 |
| `"seVolume"` | `number` | 音效音量 |
| `"voiceVolume"` | `number` | 语音音量 |

```typescript
// 读取
const bgmVol = ctx.config.get("bgmVolume");
const skipMode = ctx.config.get("skipMode"); // "all" | "read"

// 写入
ctx.config.set("bgmVolume", 80);
ctx.config.set("skipMode", "read");

// React Hook
function VolumeSlider() {
  const ctx = useExtensionContext();
  const [vol, setVol] = ctx.config.useValue("bgmVolume");
  return <input type="range" value={vol} onChange={e => setVol(+e.target.value)} />;
}

// 恢复默认
await ctx.config.reset();

// 一次性快照
const snap = ctx.config.snapshot();
console.log(snap.masterVolume, snap.bgmVolume, snap.seVolume, snap.voiceVolume);
```

### 12.16 ctx.ui — 程序 UI

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `show(id, props?, options?)` | `Promise<void> \| void` | 显示程序 UI |
| `hide(id)` | `Promise<void> \| void` | 隐藏程序 UI |
| `hideAll()` | `Promise<void> \| void` | 隐藏所有程序 UI |
| `isVisible(id)` | `boolean` | 查询某 UI 是否当前可见 |

#### UIShowOptions

```typescript
interface UIShowOptions {
  size?: string;          // 容器尺寸，默认 "(100%, 100%)"
  position?: string;      // 容器位置，默认 "(0, 0)"（全屏覆盖）
  interactable?: boolean; // 容器是否可交互（影响 pointer-events），默认 true
}
```

```typescript
// 基本显示
ctx.ui.show("inventory");

// 带 props 和容器配置
ctx.ui.show("modal-dialog", { title: "确认" }, {
  size: "(400px, 200px)",
  position: "(center, center)",
  interactable: true,
});

// 查询可见性
if (ctx.ui.isVisible("inventory")) {
  ctx.ui.hide("inventory");
}

// 隐藏全部
ctx.ui.hideAll();
```

> `size` / `position` 用 PairUnitStrings 字符串格式（`"(100%, 100%)"` / `"(center, 100)"` 等）。这些字段给 engine UI 容器用，组件在 render 出的 React 树里仍需要用 CSS 自由定位。

### 12.17 ctx.visualUI — 可视化界面

详见 [第 6 章：程序控制可视化界面](#6-程序控制可视化界面)。

核心 API 概览：

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `open(name, options?)` | `Promise<VisualUIViewHandle>` | 打开可视化界面并返回句柄 |
| `attach(name)` | `VisualUIViewHandle \| null` | 取已打开界面的句柄；未打开返回 `null` |
| `onBeforeOpen(name, fn)` | `() => void` | 注册"界面即将挂载"回调 |
| `onOpen(name, fn)` | `() => void` | 注册"界面被打开"回调 |

### 12.18 ctx.game — 游戏壳层

| 方法/属性 | 返回值 | 说明 |
|------|--------|------|
| `exit()` | `void` | 退出当前游戏（Player 端关窗，Studio Preview 回到非播放态） |
| `title()` | `string` | 当前作品的标题（Player 端是 build 时定的 title，Studio Preview 端是当前项目名） |
| `window` | `GameWindowAPI` | 桌面/浏览器宿主窗口能力 |

#### GameWindowAPI — 全屏控制

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `canFullscreen()` | `boolean` | 当前宿主是否支持全屏切换 |
| `getFullscreen()` | `Promise<boolean>` | 读取当前是否全屏 |
| `setFullscreen(value)` | `void \| Promise<void>` | 设置全屏状态；不支持时 no-op |
| `toggleFullscreen()` | `void \| Promise<void>` | 在窗口/全屏间切换 |
| `useFullscreen()` | `[boolean, setter]` | React Hook：订阅全屏状态 |

```typescript
function FullscreenButton() {
  const ctx = useExtensionContext();
  const [isFs, setFs] = ctx.game.window.useFullscreen();

  if (!ctx.game.window.canFullscreen()) return null;

  return (
    <button onClick={() => ctx.game.window.toggleFullscreen()}>
      {isFs ? "窗口模式" : "全屏"}
    </button>
  );
}

// 读取作品标题
const gameTitle = ctx.game.title(); // "时之彼端的花"
```

### 12.19 ctx.system — 系统插槽

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `invoke(slotId, payload?, options?)` | `Promise<void>` | 触发系统槽位（打开对应 UI） |
| `close(slotId)` | `Promise<void>` | 关闭此前通过该槽位打开的 UI |
| `getBinding(slotId)` | `string \| undefined` | 查询某槽位当前生效的 UI 路径 |
| `listSlots()` | `SystemSlotInfo[]` | 列出所有 slot 信息 |

#### SystemInvokeOptions

```typescript
interface SystemInvokeOptions {
  modal?: boolean;                          // 作为模态界面打开，阻止底层游戏交互
  containerOptions?: UIShowOptions;         // 可选的容器尺寸、位置和可交互性
}
```

> `invoke` 的第三个参数可以设置 `modal`，以及容器的 `size`、`position` 和 `interactable`。

#### SystemSlotInfo

```typescript
interface SystemSlotInfo {
  id: string;
  label: string;
  required: boolean;
  currentBinding: string | undefined;  // 解析 systemBindings + ULTIMATE_FALLBACK 后的当前绑定
}
```

```typescript
// 打开当前绑定的存档界面
await ctx.system.invoke(INTERNAL_SYSTEM_SLOT.Save);

// 带 payload 和容器选项
await ctx.system.invoke(
  INTERNAL_SYSTEM_SLOT.Save,
  { mode: "save" },
  { modal: true, containerOptions: { size: "(100%, 100%)" } },
);

// 查询绑定
const binding = ctx.system.getBinding(INTERNAL_SYSTEM_SLOT.Save);
// "avg.internal.default-shell/save-screen" 或自定义绑定

// 列出所有 slot
const slots = ctx.system.listSlots();
slots.forEach(s => console.log(s.id, s.label, s.required, s.currentBinding));

// 关闭常驻槽位（如工具栏）
await ctx.system.close(INTERNAL_SYSTEM_SLOT.Toolbar);
```

> `close()` 会记住实际成功打开的绑定，因此作者绑定失效回退到内置 UI 时仍能关闭真正显示的界面。

### 12.20 ctx.input — 输入管理

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `bindShortcut(shortcut, handler)` | `() => void` | 绑定快捷键（底层 API），返回 unbind 函数 |
| `registerAction(action)` | `void` | 注册语义动作 |
| `unregisterAction(actionId)` | `void` | 反注册语义动作 |
| `onAction(actionId, handler)` | `() => void` | 订阅动作触发，返回 unsubscribe 函数 |
| `listActions()` | `ActionInfo[]` | 列出所有已注册的 action（引擎+扩展合集） |
| `getActiveKeys(actionId)` | `string[]` | 获取某 action 当前生效的物理键数组 |

#### bindShortcut — 底层快捷键

```typescript
// 绑定临时快捷键（如 modal 打开期间的 Escape 关闭）
const unbind = ctx.input.bindShortcut("Escape", () => {
  ctx.ui.hide("modal-dialog");
});
// modal 关闭时解绑
unbind();
```

> 当 `document.activeElement` 为 input/textarea/contenteditable 时，键盘类快捷键不触发（避免编辑文本时误触）；鼠标类快捷键不受此限制。对于"应该出现在 Studio 输入按键 tab、允许玩家重映射"的快捷键，优先用 `registerAction` + `onAction`。

#### registerAction / onAction — 语义动作

```typescript
static onRegister(ctx) {
  // 注册语义动作
  ctx.input.registerAction({
    id: "my-ext.open-inventory",    // 必须以扩展 id 为前缀
    label: "打开背包",
    defaultKeys: ["KeyI"],
  });

  // 订阅动作
  ctx.input.onAction("my-ext.open-inventory", () => {
    void ctx.visualUI.open("@my-ext/inventory");
  });
}
```

#### ActionInfo

```typescript
interface ActionInfo {
  id: string;
  label: string;
  defaultKeys: string[];    // 注册时声明的默认物理键
  activeKeys: string[];     // 经过 fallback 链解析后实际生效的物理键
  source: "engine" | "extension";
  extensionId?: string;     // source === "extension" 时存在
}
```

#### getActiveKeys — 查询生效键

```typescript
// 获取某 action 当前生效的物理键（经过 fallback 链解析）
// Fallback 链（优先级从高到低）:
//   1. 玩家级 gameSettings.userKeyBindings[actionId]
//   2. 作者级 projectConfig.actionBindings[actionId]
//   3. 引擎/扩展默认 defaultKeys
const keys = ctx.input.getActiveKeys("my-ext.open-inventory");
// ["KeyI"]

// 列出所有 action
const actions = ctx.input.listActions();
actions.forEach(a => console.log(a.id, a.label, a.activeKeys, a.source));
```

#### registerAction 校验规则

- 不允许 `internal.*` 前缀（引擎专用）
- 必须以扩展自身 id 为前缀（如扩展 id 为 `"user.achievement-pack"`，合法 action id 形如 `"user.achievement-pack.open-wall"`）
- 违反者在 `onRegister` 阶段立即抛 `Error`
- 重复注册同一 id 会 `console.warn` 并覆盖

### 12.21 ctx.settings — 扩展设置

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `get<T>(key)` | `T \| undefined` | 读取当前扩展的设置值 |
| `set<T>(key, value)` | `void` | 写入当前扩展的设置值 |
| `snapshot()` | `Record<string, unknown>` | 当前扩展所有设置的快照（已合并 default） |
| `useValue<T>(key)` | `[T \| undefined, setter]` | React Hook：订阅单个设置变化 |
| `useSnapshot()` | `Record<string, unknown>` | React Hook：订阅整个 settings snapshot 变化 |
| `subscribe<T>(key, cb)` | `() => void` | 命令式订阅；值变化时调 cb，返回 unsubscribe 函数 |
| `cross` | `{ get, set, subscribe }` | 跨 UI 子模块/扩展访问出口 |

#### key 路径规则

- `key` 包含 `.` → 视为完整路径（`uiId.field` 或扩展级 key），不补前缀
- `key` 不含 `.` → 补 `<uiId>.` 前缀（如果 ctx 已 scope 到某 uiId）；否则原样

#### get 的 fallback 顺序

1. `project.json.extensionSettings[selfId][key]`
2. `settingsSchema[key].default`
3. `undefined`

#### cross — 跨模块读取

```typescript
// 99% 的代码用不到。read/写自己 UI 的字段用 get/set 即可。
// 跨子模块需要时：
const showSkip = ctx.settings.cross.get("save-screen", "quickSaveShortcut");
ctx.settings.cross.subscribe("toolbar", "showSkipButton", (newVal) => {
  // toolbar 的 showSkipButton 设置变了
});
```

#### subscribe — 非 React 上下文订阅

```typescript
static onRegister(ctx) {
  // autonomous handler 启动时绑了一个 shortcut
  // 用户在 Studio 设置面板改了字段值 → 这里 unbind 旧 + bind 新
  ctx.settings.subscribe("quickSaveKey", (newKey) => {
    rebindShortcut(newKey);
  });
}
```

### 12.22 ctx.asset — 素材

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `resolve(uri)` | `AssetRef` | 把素材 URI 解析为可访问 URL |

```typescript
interface AssetRef {
  url: string;
  mime?: string;
}

const ref = ctx.asset.resolve("audio/bgm/summer-night.ogg");
console.log(ref.url); // "file:///C:/.../assets/audio/bgm/summer-night.ogg" 或 blob URL
```

### 12.23 ctx.sceneRender — 场景渲染

> 鉴赏大图等"扩展里要实时渲染一个场景"的能力。起一个**隔离的**临时引擎实例渲染场景，不污染玩家当前游戏的场景/存档状态。

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `mount(container, layers, options?)` | `Promise<SceneRenderHandle>` | 把一组场景图层渲染到指定 DOM 容器 |

#### GalleryLayer

```typescript
interface GalleryLayer {
  assetPath: string;    // 相对 assets/ 的图片路径
  distance?: number;    // 视差距离，>0；默认 1
  offset?: string;      // 初始偏移 "(x%,y%)"
  name?: string;        // 层名（可选，调试/日志用）
}
```

#### SceneRenderHandle

```typescript
interface SceneRenderHandle {
  dispose(): void;  // 销毁临时引擎实例并释放容器。幂等。
}
```

#### 使用示例

```typescript
function GalleryPreview({ layers }: { layers: GalleryLayer[] }) {
  const ctx = useExtensionContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneRenderHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    ctx.sceneRender.mount(containerRef.current, layers, {
      displayType: "full",
    }).then(handle => {
      if (disposed) { handle.dispose(); return; }
      handleRef.current = handle;
    });

    return () => {
      disposed = true;
      handleRef.current?.dispose();
    };
  }, [layers]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

> `default-shell` 等 SDK 扩展不能 import engine，通过这条 API 走宿主通道。`options` 字段为后续天气特效（下雪/下雨等）预留扩展。

### 12.24 ctx.subscribe — 事件订阅

详见 [第 13 章：事件订阅](#13-事件订阅)。

### 12.25 ctx.getHost — 宿主对象

```typescript
const host = ctx.getHost(); // unknown
```

> 访问不稳定的宿主内部对象。这是逃生口 API——正常开发中不应使用，仅用于宿主提供的实验性或调试性能力。返回值类型为 `unknown`，使用时需自行断言。

---

## 13. 事件订阅

`ctx.subscribe()` 用于监听引擎状态变化。事件回调**不接收参数**；需要数据时，通过对应的 `ctx` API 读取最新状态。

### 13.1 API

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `subscribe(event, handler)` | 取消订阅函数 | 事件发生时调用无参数的 `handler` |

### 13.2 可用事件

| 事件 | 触发时机 | 在 handler 中读取数据 |
|------|----------|----------------------|
| `dialogue:changed` | 对话内容或可见性变化 | `ctx.dialogue.line()` |
| `choice:opened` | 选项面板打开 | `ctx.dialogue.choice()` |
| `choice:closed` | 选项面板关闭 | `ctx.dialogue.choice()` |
| `variable:changed` | 任意运行时变量变化 | `ctx.variables.get(name)` |
| `archive:changed` | 存档、读档或删除后 | `await ctx.archive.list()` |
| `history:changed` | 历史记录更新 | `ctx.history.entries()` |
| `config:changed` | 引擎配置变化 | `ctx.config.get(key)` |
| `fragment:entered` | 进入 Fragment | 无附加负载 |
| `fragment:exited` | 离开 Fragment | 无附加负载 |

### 13.3 代码示例

```typescript
// 好感度达到 100 时打开提示
const unsubscribe = ctx.subscribe("variable:changed", () => {
  const affection = ctx.variables.get<number>("affection");
  if (affection === 100) {
    void ctx.ui.show("affection-max-toast");
  }
});

ctx.variables.set("affection", 100);
```

### 13.4 React 中清理订阅

```typescript
useEffect(() => {
  return ctx.subscribe("dialogue:changed", () => {
    console.log(ctx.dialogue.line());
  });
}, [ctx]);
```

> 把 `subscribe()` 返回的取消订阅函数作为 `useEffect` 的清理函数返回，可以避免组件卸载后继续执行回调。

---

## 14. 技术栈与构建

只有初始化程序后，扩展才会加入以下工具链：

| 技术 | 用途 |
|------|------|
| **TypeScript** | 扩展源码 |
| **React** | 程序 UI |
| **Vite** | 以 ESM 库模式构建 |
| **@avg-studio/sdk** | Extension 基类、运行时 API 和类型定义 |

### 构建命令

```bash
npm run build   # 单次生成 dist/index.js
npm run watch   # 监听源码并持续构建
```

- `react`、`react-dom` 和 SDK 由宿主提供单实例，模板会配置好 Vite 和类型依赖
- **不要手动修改 `sdk/`**。需要更新 SDK 时，应通过 Studio 的扩展开发流程重新同步
- Vite 会在源码变化后重新生成 `dist/index.js`，Studio 检测到变化后刷新程序预览

---

## 15. 开发工作流

### 15.1 四条开发路径

| 路径 | 说明 | 文档 |
|------|------|------|
| **只做界面** | 新建扩展后直接创建 UI，不需要 npm 和代码 | [可视化界面编辑器](https://docs.avg-engine.com/advanced/visual-ui-editor) |
| **编写程序** | 初始化 TypeScript 工程，开发方法、逻辑或 React UI | [创建第一个扩展](https://docs.avg-engine.com/extensions/develop) |
| **混合控制** | 给可视化元素设置引用名，再由程序动态控制 | [程序控制可视化界面](https://docs.avg-engine.com/extensions/visual-ui-controller) |
| **替换系统界面** | 把标题、存读档等位置绑定到自己的实现 | [系统插槽与内置动作](https://docs.avg-engine.com/extensions/system-slots) |

### 15.2 导入已有扩展

扩展树顶部的「导入扩展」支持：
- 选择扩展文件夹
- 选择 `.zip` 压缩包
- 把文件夹或 `.zip` 拖到扩展树区域

**自动处理规则：**
- 导入内容会复制成一份可编辑的本地扩展，原文件夹或压缩包不受影响
- 压缩包多套一层目录时会自动寻找真正的扩展根
- `__MACOSX`、`.DS_Store` 等系统文件会被忽略
- 同 id 的本地扩展会先询问是否覆盖
- 内置 `avg.internal.*` 扩展不能被覆盖
- 解压后的总体积上限为 **300MB**

> ⚠️ 当前导入流程会校验 `extension.json` 和程序入口：如果清单没有显式 `entry`，会按 `dist/index.js` 检查。只有可视化 UI、没有程序产物的压缩包目前会被拒绝。

### 15.3 移除与彻底删除

| 操作 | 本机源码 | 当前项目发行物 | 适用情况 |
|---|---|---|---|
| **从 Studio 移除** | 保留 | 保留可运行快照 | 暂时解除工作区关联 |
| **彻底删除** | 移到系统废纸篓 | 删除 | 确认不再需要源码和项目依赖 |

> ⚠️ 彻底删除还会清理当前项目对该扩展的依赖关系。操作前先提交源码或制作备份。只想解决路径变更时，使用「重新定位」而不是删除。

市场扩展使用卸载流程；系统扩展不能移除或彻底删除。

### 15.4 项目发行物

扩展被项目启用后，Studio 会把运行所需的清单、界面和程序构建产物保存到项目内，形成一份**项目发行物**。预览和构建游戏时会使用这份发行物。

项目发行物会随项目目录一起复制和分享，但**不会包含 `src/` 等扩展源码**。这样，其他创作者即使没有安装原扩展，也可以正常打开、预览和构建项目；只有继续修改扩展代码时才需要本机源码。

### 15.5 工程被移动后

Studio 记录本地扩展路径。文件夹被移动、改名或删除后，扩展会显示「路径不存在」。源码仍在时，右键扩展选择「重新定位」，指向新目录即可。新目录中的 `extension.json` id 必须和原扩展一致。

### 15.6 打包

可视化界面文档会随启用的扩展一起打包。带程序的扩展还需要存在有效的 `dist/index.js`。打包只包含运行所需的界面、清单和构建产物，**不包含 `src/` 源码**。

---

## 16. 完整实战范例

### 16.1 Hello World — 迷你好感度系统

一个约 60 行的完整扩展，包含两个功能：
1. 给剧本提供「增加好感度」方法
2. 给玩家一个浮起来的小面板，查看每个角色的好感度

```tsx
import React from "react";
import {
  Extension, extension, settings, defineSave, method,
  useExtensionContext,
  type SettingsBuilder, type SaveAPI,
} from "@avg-studio/sdk";
import manifest from "../extension.json";

type Entry = { characterId: string; value: number };
type SaveMap = { values: readonly Entry[] };

// 界面层订阅存档字段时，变量真名是 `${manifest.id}.[字段名]`
// manifest.id 是 Studio 创建扩展时生成的(带随机后缀)，不能写死
const VAR_VALUES = `${manifest.id}.values`;

@extension({ id: "affection", label: "好感度" })
export class Affection extends Extension {
  static settings = settings((s: SettingsBuilder) => ({
    title: s.string("面板标题").default("好感度"),
  }));

  static saveSchema = defineSave({
    values: { type: "list", persistence: "slot", default: [] as Entry[] },
  });

  static add = method({
    title: "增加好感度",
    schema: {
      character: { type: "character", label: "角色", required: true },
      amount: { type: "number", label: "增减量", default: 1 },
    },
    run(_ctx, params) {
      const save = this.save as unknown as SaveAPI<SaveMap>;
      const list = save.get("values");
      const idx = list.findIndex((e) => e.characterId === params.character);
      const next = idx >= 0
        ? list.map((e, i) => i === idx ? { ...e, value: e.value + params.amount } : e)
        : [...list, { characterId: params.character, value: params.amount }];
      save.set("values", next);
    },
  });

  render() {
    return { component: AffectionPanel, props: {} };
  }
}

const AffectionPanel: React.FC = () => {
  const ctx = useExtensionContext();
  const [title] = ctx.settings.useValue<string>("title");
  const [raw] = ctx.variables.useValue(VAR_VALUES);
  const entries = (raw as unknown as readonly Entry[] | undefined) ?? [];

  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      padding: "24px 36px", borderRadius: 12,
      background: "rgba(20, 20, 30, 0.92)", color: "white",
      fontFamily: "sans-serif", minWidth: 260,
    }}>
      <h2 style={{ textAlign: "center", margin: 0 }}>{title}</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
        {entries.map((e) => {
          const ch = ctx.character.get(e.characterId);
          return (
            <li key={e.characterId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{ch?.name ?? e.characterId}</span>
              <span>💗 {e.value}</span>
            </li>
          );
        })}
        {entries.length === 0 && (
          <li style={{ textAlign: "center", opacity: 0.5 }}>还没有任何记录</li>
        )}
      </ul>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => ctx.ui.hide("affection")}>关闭</button>
      </div>
    </div>
  );
};
```

#### 使用方式

**剧本端**：在剧本里插一个「调用扩展方法」block，选「好感度 → 增加好感度」，挑角色 + 填数值。

**玩家端**：在剧本里插一个「显示界面」block 指向「好感度」就能弹出面板，或自己加个工具栏按钮触发 `ctx.ui.show("affection")`。

### 16.2 CG 鉴赏系统（完整版）

引擎内置 `gallery-screen` 的精简版——一个 `Extension` 子类同时包含界面、3 个剧本方法、1 个设置、两种存档作用域并存：

```typescript
import {
  Extension, extension, defineSave, method, settings,
  type SettingsBuilder, type SaveAPI,
} from "@avg-studio/sdk";

type GallerySaveMap = {
  unlockedShared: readonly GalleryEntry[];
  unlockedSlot: readonly GalleryEntry[];
};

@extension({ id: "gallery-screen", label: "鉴赏画面" })
export class GalleryScreen extends Extension {
  // 两种存档作用域：shared 跨存档全局解锁，slot 跟随当前存档
  static saveSchema = defineSave({
    unlockedShared: { type: "list", persistence: "shared", default: [] as GalleryEntry[] },
    unlockedSlot:   { type: "list", persistence: "slot",   default: [] as GalleryEntry[] },
  });

  // 设置：新解锁条目写入哪个桶
  static settings = settings((s: SettingsBuilder) => ({
    unlockScope: s
      .enum("解锁记录范围", ["shared", "slot"] as const)
      .labels({ shared: "全局共享", slot: "跟随存档" })
      .default("shared"),
  }));

  // 剧本方法：加入鉴赏
  static addToGallery = method({
    title: "加入鉴赏",
    schema: { scene: { type: "scene", label: "场景", required: true } },
    run(ctx, params) {
      const save = this.save as unknown as SaveAPI<GallerySaveMap>;
      const scope = ctx.settings.get<"shared" | "slot">("unlockScope") ?? "shared";
      const entry: GalleryEntry = buildEntry(params);
      if (scope === "slot") {
        save.set("unlockedSlot", [...save.get("unlockedSlot"), entry]);
      } else {
        save.set("unlockedShared", [...save.get("unlockedShared"), entry]);
      }
    },
  });

  // 界面
  render() {
    return { component: GalleryScreenComponent, props: {} };
  }
}
```

---

## 17. 最佳实践与注意事项

### 17.1 架构设计

| 实践 | 说明 |
|------|------|
| **渐进式增强** | 从纯界面扩展开始，按需初始化程序，原有可视化界面不会丢失 |
| **单一职责** | 一个 `Extension` 子类聚焦一个游戏系统 |
| **存档类型收窄** | 在 `method()` 的 `run` 回调里，必须显式收窄 `this.save` 的类型 |
| **不要缓存 view 句柄** | 界面关闭后旧句柄不再有效，下次打开应重新获取 |

### 17.2 数据管理

| 实践 | 说明 |
|------|------|
| **数组只能整体替换** | `readonly` 类型不能 `push`，必须用 `set` 整体替换 |
| **存档 vs 设置** | 项目参数用设置 Schema，玩家运行时数据用存档 Schema |
| **slot vs shared** | 跟随存档的数据用 `slot`，跨周目共享的用 `shared` |
| **不要持久化临时状态** | Promise、DOM 节点、UI 临时状态不应写进存档 |

### 17.3 UI 开发

| 实践 | 说明 |
|------|------|
| **首选 React Hook** | 方法改了状态、界面要刷新时，首选 `useValue` 而非手动 `subscribe` |
| **可视化 UI 适合布局** | 布局、表单、菜单用可视化 UI；复杂动态交互用 React |
| **onBeforeOpen 不做耗时请求** | 否则玩家会感觉按钮没有响应 |
| **引用名界面内唯一** | 没有引用名的元素不出现在程序查询中，但仍会正常渲染 |

### 17.4 系统集成

| 实践 | 说明 |
|------|------|
| **不写死界面名** | 按钮要打开系统位置时，配置系统动作而非具体界面 |
| **自定义动作加前缀** | id 必须以扩展 id 为前缀，`internal.*` 是保留命名空间 |
| **测试边界情况** | 调度策略要测试：无候选章节、目标禁用、读档恢复、关闭选择界面 |

### 17.5 常见陷阱

1. **`npm run dev` 不存在** — 监听构建用 `npm run watch`
2. **`this.save` 在 method 中类型丢失** — 必须用 `as unknown as SaveAPI<T>` 收窄
3. **`useValue` 不在 React 外使用** — 类方法、事件回调、`onRegister` 中用 `get`/`set`/`subscribe`
4. **不要手动修改 `sdk/`** — 需要更新 SDK 时通过 Studio 的扩展开发流程重新同步
5. **`onBeforeOpen` 不要执行耗时网络请求** — 否则玩家会感觉按钮没有响应
6. **`extension.json` 的 `id` 不要随意修改** — 它是设置、存档、界面引用和系统绑定的命名空间

---

## 18. 附录

### 18.1 SDK 导入速查

```typescript
// 基类与装饰器
import { Extension, extension } from "@avg-studio/sdk";

// 声明能力
import { method, settings, defineSave, scheduleStrategy } from "@avg-studio/sdk";

// 类型
import type { SettingsBuilder, SaveAPI, ExtensionContext } from "@avg-studio/sdk";

// 常量
import { INTERNAL_SYSTEM_SLOT, INTERNAL_ACTION } from "@avg-studio/sdk";

// React Hook
import { useExtensionContext } from "@avg-studio/sdk";
```

### 18.2 系统插槽常量速查

```typescript
INTERNAL_SYSTEM_SLOT.Title      // 标题画面
INTERNAL_SYSTEM_SLOT.Toolbar    // 对话工具栏
INTERNAL_SYSTEM_SLOT.Save       // 存档界面
INTERNAL_SYSTEM_SLOT.Load       // 读档界面
INTERNAL_SYSTEM_SLOT.Settings   // 设置界面
INTERNAL_SYSTEM_SLOT.History    // 历史记录
INTERNAL_SYSTEM_SLOT.Gallery    // 鉴赏画面
INTERNAL_SYSTEM_SLOT.Input      // 玩家输入
INTERNAL_SYSTEM_SLOT.Choice     // 选项界面
```

### 18.3 内置动作常量速查

```typescript
INTERNAL_ACTION.Advance         // 推进对话
INTERNAL_ACTION.Skip            // 跳过
INTERNAL_ACTION.AutoToggle      // 自动播放
INTERNAL_ACTION.HideDialogue    // 隐藏对话框
INTERNAL_ACTION.ReplayVoice     // 重放语音
```

### 18.4 事件类型速查

```typescript
ctx.subscribe("dialogue:changed", handler)   // 对话变化
ctx.subscribe("choice:opened", handler)      // 选项面板打开
ctx.subscribe("choice:closed", handler)      // 选项面板关闭
ctx.subscribe("variable:changed", handler)   // 变量变化
ctx.subscribe("archive:changed", handler)    // 存档变化
ctx.subscribe("history:changed", handler)    // 历史记录变化
ctx.subscribe("config:changed", handler)     // 引擎配置变化
ctx.subscribe("fragment:entered", handler)   // 进入 Fragment
ctx.subscribe("fragment:exited", handler)    // 离开 Fragment
```

### 18.5 官方文档索引

| 文档 | 链接 |
|------|------|
| 扩���是什么 | https://docs.avg-engine.com/extensions/intro |
| 创建第一个扩展 | https://docs.avg-engine.com/extensions/develop |
| Hello World | https://docs.avg-engine.com/extensions/hello-world |
| Extension 基类 | https://docs.avg-engine.com/extensions/extension-class |
| 程序控制可视化界面 | https://docs.avg-engine.com/extensions/visual-ui-controller |
| 可视化界面编辑器 | https://docs.avg-engine.com/advanced/visual-ui-editor |
| 剧本方法 | https://docs.avg-engine.com/extensions/method |
| 章节调度策略 | https://docs.avg-engine.com/extensions/schedule-strategy |
| 设置 Schema | https://docs.avg-engine.com/extensions/settings-schema |
| 存档 Schema | https://docs.avg-engine.com/extensions/save-schema |
| 系统插槽与内置动作 | https://docs.avg-engine.com/extensions/system-slots |
| 默认游戏壳与系统界面 | https://docs.avg-engine.com/advanced/default-shell |
| 扩展项目结构 | https://docs.avg-engine.com/extensions/project-structure |
| 运行时接口 | https://docs.avg-engine.com/extensions/api-context |
| 事件订阅 | https://docs.avg-engine.com/extensions/api-events |

### 18.6 SDK 类型定义速查

> 以下类型定义来自 SDK 源码 `types/schema.ts`，是 Studio / Engine / 扩展三方共用的业务数据契约。

#### Character

```typescript
interface Character {
  id: string;
  name: string;
  avatarUri?: string;        // 头像 URI
  portraits: CharacterPortrait[];  // 立绘列表
  customFields: Record<string, unknown>;  // 自定义字段
}

interface CharacterPortrait {
  id: string;
  uri: string;
  name?: string;  // 立绘名称
}
```

#### DialogueLine

```typescript
interface DialogueLine {
  characterId: string | null;   // 说话角色 id；旁白为 null
  speakerName?: string;         // 当前实际显示在对话框中的名字
  text: string;                 // 对话文本
  voiceUri?: string;            // 语音 URI
}
```

#### ChoiceContext

```typescript
interface ChoiceContext {
  id: string;
  choices: ChoiceItem[];
  onSelect(index: number): void;  // 选中后调用
}

interface ChoiceItem {
  id: string;
  text: string;
  enabled: boolean;  // 是否可选
}
```

#### ArchiveSlot

```typescript
interface ArchiveSlot {
  id: number;
  createdTime: number;
  modifiedTime: number;
  snapshotDataUri: string;      // 缩略图 data URI
  currentSpeaker: string;       // 当前说话角色名
  currentDialogueText: string;  // 当前对话文本
  isQuickSave?: boolean;        // 是否为快速存档
  userParams?: unknown;         // 自定义参数
}
```

#### HistoryEntry / HistorySnapshot

```typescript
interface HistoryEntry {
  uuid?: string;
  text: string;
  characterId?: string;    // 说话角色稳定 id（显示名变化时不变）
  name?: string;           // 说话角色显示名
  voiceUri?: string;
  isReadBefore?: boolean;  // 是否已读过
  isChoice?: boolean;      // 是否为选项记录
}

interface HistorySnapshot {
  entries: HistoryEntry[];
  choices: Record<string, number>;    // branchId → 选中的 originalIndex
  ifResults: Record<string, boolean>; // if 块 id → 结果
  inputs: Record<string, string>;     // 输入 id → 值
}
```

#### StoryChapter / StoryFragment / StoryBlock

```typescript
interface StoryChapterMeta {
  id: string;
  name: string;
  disabled?: boolean;
}

interface StoryChapter extends StoryChapterMeta {
  fragments: StoryFragment[];
}

interface StoryFragment {
  id: string;
  name: string;
  blocks: StoryBlock[];
  metadata?: StoryFragmentMetadata;
}

interface StoryBlock {
  id?: string;
  type?: string;
  content?: unknown[] | string;
  props?: Record<string, unknown>;
  children?: StoryBlock[];
  [key: string]: unknown;
}
```

#### AssetRef

```typescript
interface AssetRef {
  url: string;
  mime?: string;
}
```

#### VariableValue / VariableScope / VariablePersistence

```typescript
type VariableValue = string | number | boolean | null;

// 变量的逻辑作用域 — "这个变量属于谁"
type VariableScope = "project" | "character" | "scene" | "system";

// 变量的持久化作用域 — "数据存到哪里"
type VariablePersistence = "slot" | "shared";
```

| VariableScope | 说明 |
|---|---|
| `"project"` | 项目级全局变量，不绑角色不绑场景（旧称 "global"） |
| `"character"` | 角色绑定变量，通过 (characterId, attr) 引用 |
| `"scene"` | 场景绑定变量（尚未在引擎接通） |
| `"system"` | 引擎自动维护的只读变量（游玩时长/存档读取次数等） |

| VariablePersistence | 说明 |
|---|---|
| `"slot"` | 跟着存档槽位走，槽位 N 改值只影响槽位 N |
| `"shared"` | 跨所有存档共享，写到 `userData/<gameId>/profile/shared.save` |

### 18.7 快捷键工具函数

> 来自 SDK 源码 `types/shortcut.ts`。

#### 规范化字符串格式

零或多个修饰键 + 一个主键，用 `+` 连接。修饰键按 `Ctrl > Shift > Alt > Meta` 顺序排列。

```
"KeyH"                  无修饰键
"F5"                    功能键
"MouseMiddle"           鼠标键
"Ctrl+KeyH"             单修饰键
"Ctrl+Shift+Alt+KeyA"   三修饰键
```

> token 严格区分大小写。`"ctrl"` 不会被识别为修饰键，`"keyh"` 也不会被识别为主键。

#### 修饰键

```typescript
type ModifierKey = "Ctrl" | "Shift" | "Alt" | "Meta";
```

#### 鼠标键

```typescript
type MouseCode =
  | "MouseLeft" | "MouseRight" | "MouseMiddle"
  | "MouseBack" | "MouseForward";
```

> Web 标准没给鼠标键 code 命名，SDK 自定义命名空间（不以 "Mouse" 开头与 KeyboardEvent.code 不冲突）。

#### 键盘键码

```typescript
type KeyboardCode =
  // 字母
  | "KeyA" | "KeyB" | ... | "KeyZ"
  // 数字（主键盘）
  | "Digit0" | "Digit1" | ... | "Digit9"
  // 功能键
  | "F1" | "F2" | ... | "F12"
  // 编辑/导航
  | "Escape" | "Enter" | "Space" | "Tab" | "Backspace" | "Delete" | "Insert"
  | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
  | "Home" | "End" | "PageUp" | "PageDown";
```

#### 工具函数

```typescript
import { parseShortcut, formatShortcut, normalizeShortcut } from "@avg-studio/sdk";

// 解析快捷键字符串 → 结构化对象
const parsed = parseShortcut("Ctrl+Shift+KeyA");
// { key: "KeyA", modifiers: ["Ctrl", "Shift"] }

// 结构化对象 → 规范化字符串
const str = formatShortcut({ key: "KeyH", modifiers: ["Ctrl"] });
// "Ctrl+KeyH"

// 解析 + 重新格式化（规范化）
const normalized = normalizeShortcut("Shift+Ctrl+KeyA");
// "Ctrl+Shift+KeyA"（修饰键按标准顺序排列）
```

#### parseShortcut 错误处理

```typescript
parseShortcut("");           // Error: shortcut 字符串不能为空
parseShortcut("+KeyA");      // Error: shortcut 不能以 + 开头
parseShortcut("Ctrl+");      // Error: shortcut 不能以 + 结尾
parseShortcut("Ctrl+Ctrl");  // Error: 修饰键重复
parseShortcut("Ctrl+Shift"); // Error: shortcut 缺少主键（末尾必须是主键）
parseShortcut("KeyA+KeyB");  // Error: shortcut 主键必须在末尾
parseShortcut("Ctrl+KeyX");  // Error: 未知主键 "KeyX"
```

### 18.8 UI-Ref 路径解析

> 来自 SDK 源码 `types/ui-ref.ts`。

#### 路径语法

| 格式 | 含义 |
|---|---|
| `"my-panel"` | 本扩展的 uiId（不含 `/`） |
| `"@my.extension/my-panel"` | 指定扩展 id + uiId（含 `/`） |

#### resolveUIRef

```typescript
import { resolveUIRef } from "@avg-studio/sdk";

// 本扩展内引用
resolveUIRef("save-screen", "user.my-ext");
// { extensionId: "user.my-ext", uiId: "save-screen" }

// 跨扩展引用
resolveUIRef("avg.internal.default-shell/settings-screen", "user.my-ext");
// { extensionId: "avg.internal.default-shell", uiId: "settings-screen" }
```

#### 字符约束

- `extensionId`：禁 `/`（其他字符不强约束）
- `uiId`：字母数字 + `-` + `_`，禁 `.` 和 `/`
- 空字符串 / 多个 `/` → 抛错

```typescript
resolveUIRef("", "ext");               // Error: ui-ref path 不能为空
resolveUIRef("a/b/c", "ext");          // Error: ui-ref path 含多个 "/"
resolveUIRef("ext/", "ext");           // Error: ui-ref uiId 段为空
resolveUIRef("ext/bad.id", "ext");     // Error: ui-ref uiId 含非法字符
```

### 18.9 变量作用域与持久化

> 来自 SDK 源码 `types/schema.ts`，2026-05-19 存档系统完善设计。

两个独立维度：

| 维度 | 取值 | 含义 |
|---|---|---|
| **VariableScope**（逻辑分组） | `"project"` / `"character"` / `"scene"` / `"system"` | "这个变量属于谁" |
| **VariablePersistence**（数据落盘） | `"slot"` / `"shared"` | "数据存到哪里" |

- `slot`：跟着存档槽位走，槽位 N 改值只影响槽位 N。最常见。
- `shared`：跨所有存档共享，写到 `userData/<gameId>/profile/shared.save`。CG 解锁集合/成就/玩家昵称这类"档案级"数据。

存档 Schema 中每个字段的 `persistence` 属性就对应这两个值。

### 18.10 内置动作元数据表

> 来自 SDK 源码 `internal-actions.ts`，包含官方文档未提及的 `channels` 信息。

| 动作 | 常量 | ID | channels | 默认键 |
|------|------|----|---------|--------|
| 推进对话 | `INTERNAL_ACTION.Advance` | `internal.input.advance` | `["dialogue", "paragraph"]` | `["mousedown", " ", "Enter", "wheeldown"]` |
| 跳过到段尾 | `INTERNAL_ACTION.Skip` | `internal.input.skip` | `["dialogue", "paragraph"]` | `["Control"]` |
| 切换自动播放 | `INTERNAL_ACTION.AutoToggle` | `internal.input.auto-toggle` | `["dialogue", "paragraph"]` | `["a"]` |
| 临时隐藏对话框 | `INTERNAL_ACTION.HideDialogue` | `internal.input.hide-dialogue` | `["dialogue", "paragraph"]` | `["contextmenu", "Delete"]` |
| 重播角色语音 | `INTERNAL_ACTION.ReplayVoice` | `internal.input.replay-voice` | `["dialogue", "paragraph"]` | `["r"]` |

> `channels` 沿用 device-input-system 的 channel 机制，表示该 action 在哪些场景下响应。所有内置动作都在 `dialogue`（对话）和 `paragraph`（段落）两个 channel 中生效。默认键值使用 `event.key` 的原生字符串（如 `"a"` / `" "`），中键派发为 `"middleclick"`，右键派发为 `"contextmenu"`。

---

> **文档说明**：本指南基于 LetsGal Studio v1.9.0 官方文档整理编写，并整合了 `@avg-studio/sdk` 源码（`sdk-context.ts`、`extension-base.ts`、`extension-module.ts`、`save-schema.ts`、`settings-builder.ts`、`schedule-strategy.ts`、`types/` 目录下全部类型定义等）中的完整 API 签名与实现细节，补充了官方文档未覆盖的接口方法、类型定义和工具函数。供扩展开发工程师参考使用。如需了解最新更新，请访问[官方更新日志](https://avg-engine.com/changelog)。
