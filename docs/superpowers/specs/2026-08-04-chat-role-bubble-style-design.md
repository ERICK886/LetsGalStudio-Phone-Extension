# 聊天角色预设：气泡样式与自定义 CSS

> 文件名：`2026-08-04-chat-role-bubble-style-design.md`  
> 作者：Cursor Agent  
> 日期：2026-08-04  
> 版本：1.0  
> 状态：已批准（对话确认：结构化字段 + 可选安全 CSS；自定义 CSS 优先）

## 1. 背景与目标

消息气泡样式目前完全由全局 CSS 决定。作者需要按**聊天角色预设**定制字号、文字色、名称色、气泡背景，并可选追加安全的自定义 CSS 声明；未填写的项保持默认外观。

### 目标

- 在「聊天角色预设」增加可选结构化样式字段与可选 `customCss`。
- 未填 → 使用现有默认样式（incoming / outgoing 差异保留）。
- 结构化字段与 `customCss` 同时存在时：**`customCss` 优先**（可覆盖同名属性）。
- 样式在 `show-message` 展开时写入消息快照，播放期不随设置热改。

### 非目标

- `show-message` 方法块再覆盖样式。
- 自定义显示名。
- 完整 stylesheet / 选择器 / `url()` 外链。
- 改头像框、状态角标、手机壳主题。

## 2. 预设字段

`chatRolePresets` 数组项新增（均可空，默认空字符串或省略）：

| 字段 | Studio 标签 | 类型 | 合法值 | 未填 |
|------|-------------|------|--------|------|
| `fontSize` | 字体大小 | string | 纯数字（视为 px）或带单位：`px`/`rem`/`em`；范围建议 10–32px 等价 | 默认正文 14px |
| `textColor` | 文字颜色 | string | `#RGB` / `#RRGGBB` / `#RRGGBBAA` | 默认 `#fff` |
| `nameColor` | 名称颜色 | string | 同上 | 默认 `rgba(255,255,255,0.78)` |
| `bubbleColor` | 对话框颜色 | string | 颜色（同上）或单段安全 `background` 值（同壁纸消毒：禁 `;{}@` 与 `url(`） | 默认现有气泡背景 |
| `customCss` | 自定义 CSS | string（multiline） | 仅 **声明列表**，见 §4 | 不追加 |

## 3. 数据流

### 3.1 类型

`ChatRolePreset` / `PhoneStoryMessage` 增加可选：

```ts
fontSize?: string;      // 已归一化，可直接用于 style
textColor?: string;
nameColor?: string;
bubbleColor?: string;   // 已消毒的 background 或 color
customCss?: string;     // 已消毒的声明串
```

### 3.2 归一化

`normalizeChatRolePresets`：

1. `fontSize`：trim；纯数字 → 补 `px`；校验单位与合理范围；非法丢弃。
2. `textColor` / `nameColor`：仅接受 hex 色；非法丢弃。
3. `bubbleColor`：先按 hex 色接受；否则走与 `sanitizeBackgroundCss` 同类规则（可复用或抽共享）。
4. `customCss`：见 §4；失败则整段丢弃。

### 3.3 收集快照

`collectStoryMessages` 将预设上已归一化的样式字段拷入每条 `PhoneStoryMessage`。  
`render()` 映射时同样透传；缺失视为未自定义。

## 4. 自定义 CSS 安全规则

对齐壁纸 CSS 思路并略扩展为**多声明**：

- trim；最大长度 2048。
- 拒绝：`url(`、`@`、`{`、`}`。
- 允许分号分隔的 `property: value` 列表。
- 属性名仅 `[a-zA-Z-]+`；拒绝 `expression`、`javascript:` 等（值侧再扫一遍）。
- 非法则整段 `customCss` 丢弃（结构化字段仍可生效）。

## 5. UI 应用

文件：`story-message-item.tsx`（+ 必要时 CSS 变量钩子）。

气泡节点（`.phone-story-bubble`）上：

1. 若有结构化字段，设置例如：
   - `--phone-bubble-font-size` / 或 `fontSize` 作用于 `p`
   - `--phone-bubble-text-color` → `p` 的 color
   - `--phone-bubble-name-color` → `strong` 的 color
   - `--phone-bubble-bg` → bubble `background`（填写后 **incoming/outgoing 都用该背景**，不再用默认 accent mix）
2. 将 `customCss` 解析为声明并 **合并到同一 `style` 对象之后**，覆盖同名 key（含由变量映射出的实际属性）。

实现建议：

- 结构化 → 明确的 React `CSSProperties`（`fontSize`、`color` 在子节点，`background` 在 bubble）。
- `customCss` → 解析为 `Record<string, string>` 后：
  - 已知属性（`font-size`/`color`/`background`/`background-color` 等）按约定落到 bubble / `p` / `strong`；
  - 或首版约定：`customCss` **全部挂在 bubble**，并通过嵌套不了的限制只改 bubble 盒模型；正文色用结构化字段或 bubble 的 `color` 继承。

**首版约定（锁定）：**

- 结构化：`fontSize`+`textColor` → `<p style>`；`nameColor` → `<strong style>`；`bubbleColor` → bubble `background`。
- `customCss`：声明挂在 **bubble** 的 `style` 上（camelCase 合并）；若含 `font-size`/`color`，同时写到 bubble（正文可 `color: inherit` 当未单独设 textColor 时——为减少歧义：**customCss 的 `color`/`font-size` 也同步应用到 `p`**，`customCss` 优先于结构化）。
- 名称色：仅结构化 `nameColor`；若 `customCss` 含不支持选择器则无法直接改 `strong`——允许 `customCss` 使用自定义属性，或额外识别 `--phone-bubble-name-color`。更简单：**解析时若出现 `--phone-name-color` 或已知 key `name-color`（非标准）则映射到 strong**。YAGNI：首版 customCss 只挂 bubble；改名称色请用 `nameColor` 字段；customCss 覆盖 bubble 的 background/font/color 时，color/font-size 同步到 `p`。

## 6. 文档与版本

- README §1：删除「不支持自定义气泡 CSS」限制，改为说明预设可选样式。
- README §8：补充五字段与优先级（customCss > 结构化 > 默认）。
- phone-sdk 版本：实现时 bump（建议在当前基础上 +0.0.1，若 0.4.3 未发布则可并入；已本地 0.4.3 则用 **0.4.4**）。

## 7. 测试要点

- 全空 → 与改前视觉一致（含 outgoing 默认色）。
- 仅 `textColor` / 仅 `bubbleColor` / 仅 `fontSize` → 其余默认。
- `customCss` 含 `background: ...` 覆盖 `bubbleColor`。
- 非法 `customCss`（含 `url(`）→ 忽略，结构化仍生效。
- 快照：播放中改预设不影响已显示消息。

## 8. 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 能力组合 | 结构化 + 可选 CSS | 作者选 A |
| 优先级 | customCss > 结构化 > 默认 | 作者选 1 |
| 安全 | 声明白名单，禁 url/@/花括号 | 与壁纸 CSS 一致 |
| 方法覆盖样式 | 不做 | 非目标 |
