# 设计规格：手机编辑器外壳（phone-editor shell）

| 项 | 内容 |
| --- | --- |
| 日期 | 2026-08-10 |
| 状态 | 待用户审阅规格 |
| 作者 | 池水三两升 |
| 宿主包 | `ink.zenly.ext-7a9373` |
| 参考 | 旁路仓 `ext-27b96b`（场景交互）的 `EditorShell` + `ThemeProvider` |
| 主题强调色 | `#DB2777` |

## 1. 背景与目标

在宿主扩展内新增作者侧「手机编辑器」程序模块，第一版**只交付编辑器外壳**（品牌顶栏、分区 Tab、左中右三栏 chrome、主题），布局与交互习惯对齐场景交互编辑器，后续再填真实样式编辑能力。

### 1.1 已确认决策

| # | 决策 |
| --- | --- |
| D1 | 界面形态：扩展自有程序 UI（Studio「显示界面」打开），非 settings 面板、非方法块内联卡 |
| D2 | 模块 id：`phone-editor`（标签「手机编辑器」） |
| D3 | 实现路径：镜像场景交互壳（推荐）——自研轻量壳，不整包拷贝 `ext-27b96b` 业务 |
| D4 | 第一版范围：**仅外壳**；样式编辑、自由布局、与 `phone` settings 写回均不做 |
| D5 | 强调色固定 `#DB2777` |
| D6 | 代码归属：`@ink-zenly/phone-sdk` 的 `host/editor/`（与 Phone / Toast 并列）；宿主仅 re-export |

### 1.2 非目标（外壳期）

- 真实手机预览画布 / 拖拽自由布局
- 写回 `PhoneExtension` 或其他模块的 settings
- 撤销栈、导入导出、设计分辨率菜单
- Fragment 方法、`saveSchema`
- `bootstrapPhonePluginApps` 注册（本模块不是手机内页 APP）
- 从 `ext-27b96b` 拷贝场景/物品/配方业务逻辑

## 2. 工程落点与模块身份

| 项 | 定案 |
| --- | --- |
| 目录 | `phone-sdk/src/host/editor/`（跟随 phone-sdk，与 phone / toast 并列） |
| 程序 id | `phone-editor` |
| `@extension` | `{ id: "phone-editor", label: "手机编辑器" }` |
| 包 id | 宿主仍为 `ink.zenly.ext-7a9373`；实现包 `@ink-zenly/phone-sdk` |
| 入口 | phone-sdk `index.ts` 导出；宿主 `src/index.tsx` re-export |
| `exposeUI` | 默认 true（可被「显示界面」选中） |
| `autonomous` | 否（作者主动打开） |

## 3. 壳布局与占位

### 3.1 组件树

```text
PhoneEditorExtension
└─ PhoneEditorApp
   └─ ThemeProvider (accent #DB2777)
      └─ PhoneEditorShell
         ├─ header
         │   ├─ 品牌「手机」+ 强调色点缀
         │   ├─ Tab：外壳 | 桌面 | 聊天气泡 | 其他
         │   └─ 右侧：主题切换（light/dark）| 「运行预览」灰态禁用占位
         └─ body（flex 三栏）
             ├─ left   ← editorLeftWidth
             ├─ center ← flex: 1
             └─ right  ← editorRightWidth
```

### 3.2 占位 Tab

切换 Tab 只改变选中态与三栏空态标题/说明，不挂真实子面板。

| Tab id | 显示名 | 中栏占位文案 |
| --- | --- | --- |
| `shell` | 外壳 | 手机外壳预览（即将推出） |
| `desktop` | 桌面 | 桌面图标样式（即将推出） |
| `chat` | 聊天气泡 | 气泡主题预览（即将推出） |
| `misc` | 其他 | 其它手机样式（即将推出） |

左栏占位标题：「导航 / 列表」；右栏：「属性」。随当前 Tab 可附加分区名后缀（例如「外壳 · 属性」）。

### 3.3 主题 token

- 默认深色：背景量级对齐场景交互（约 `bgBase #17171B` / `bgElevated #1F1F26` / `bgSunken #121217`）
- `accent`：`#DB2777`（深色）；浅色模式可用同色或略深 `#BE185D`
- 顶栏选中 Tab：accent 描边 + 浅粉底（`#DB277722`）；主按钮在 accent 底上用白字
- 通过 `ThemeProvider` + `useTheme()` 下发 token；尽量用内联 style（与参考一致）

### 3.4 settings（壳级最小集）

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `theme` | enum light/dark | `dark` | 界面主题 |
| `editorLeftWidth` | number | `260`（180–480） | 左栏宽 |
| `editorRightWidth` | number | `300`（220–520） | 右栏宽 |

- 无 `saveSchema`
- 无 Fragment 方法

## 4. 文件树与接线

```text
phone-sdk/src/host/editor/
  constants.ts
  phone-editor-extension.tsx
  theme/
    tokens.ts
    theme-provider.tsx
  app/
    phone-editor-app.tsx
  shell/
    phone-editor-shell.tsx
    placeholder-pane.tsx
```

接线：

- `phone-sdk/src/index.ts`：`export { PhoneEditorExtension }`
- 宿主 `src/index.tsx`：从 `@ink-zenly/phone-sdk` re-export
- **不**加入 `bootstrapPhonePluginApps` 注册表

## 5. 验收标准

1. Studio 重载本扩展后，程序列表出现「手机编辑器」
2. 打开 UI：顶栏品牌强调色为 `#DB2777`，四个 Tab 可切换选中态
3. 左中右三栏占位文案随 Tab 变化；主题 light/dark 可切换且无控制台报错
4. 「运行预览」按钮可见但禁用（占位）

## 6. 后续（本规格不实施）

- 中栏真实预览（手机壳实时渲染）
- 右栏属性表单写回 `phone` / 内页模块 settings（或本模块自有样式 JSON）
- UI 子分区细化（对齐 `UiEditorPanel`）
- 可选：运行预览沙箱

## 7. 风险与约束

- Studio 侧「显示界面」打开编辑器时，宿主 scope 的 `useExtensionContext` 为本模块；跨模块读 `phone` 设置须用 `settings.cross`（后续样式期再做）
- `cli/vendor` 旧 SDK 不作为样式 API 源；本仓 `sdk` 已与 Studio 对齐，外壳本身不依赖新字段类型
