/**
 * @file tokens.ts
 * @description 手机编辑器主题 token：light / dark 两套配色，accent 为粉色系。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 深色背景与边框/文本对齐场景交互（`#17171B` 系），accent 使用 `#DB2777`。
 * - 浅色模式 accent 使用 `#BE185D`，浅底深字。
 */

/** 主题模式：浅色或深色。 */
export type ThemeMode = "light" | "dark";

/**
 * 主题 token 集合，供 UI 组件统一引用颜色变量。
 */
export interface ThemeTokens {
  /** 当前主题模式 */
  mode: ThemeMode;

  /** 强调色（品牌粉） */
  accent: string;

  /** 基础背景色 */
  bgBase: string;

  /** 抬升层背景色（顶栏、侧栏、卡片） */
  bgElevated: string;

  /** 下沉层背景色（输入框、凹槽区域） */
  bgSunken: string;

  /** 普通边框色 */
  border: string;

  /** 强边框色（分隔线、选中框） */
  borderStrong: string;

  /** 主文本色 */
  textPrimary: string;

  /** 次要文本色 */
  textSecondary: string;

  /** 弱化文本色（占位符、提示） */
  textMuted: string;
}

/**
 * 根据主题模式返回对应的 token 集合。
 *
 * @param mode - 主题模式，`"light"` 或 `"dark"`
 * @returns 完整的 ThemeTokens 对象
 *
 * @example
 * ```ts
 * const tokens = getThemeTokens("dark");
 * console.log(tokens.bgBase); // "#17171B"
 * console.log(tokens.accent); // "#DB2777"
 * ```
 */
export function getThemeTokens(mode: ThemeMode): ThemeTokens {
  if (mode === "dark") {
    return {
      mode,
      accent: "#DB2777",
      bgBase: "#17171B",
      bgElevated: "#1F1F26",
      bgSunken: "#121217",
      border: "#2E2E38",
      borderStrong: "#3C3C48",
      textPrimary: "#F2F2F4",
      textSecondary: "#C8C8D0",
      textMuted: "#9A9AA6",
    };
  }

  return {
    mode,
    accent: "#BE185D",
    bgBase: "#F4F6F5",
    bgElevated: "#FFFFFF",
    bgSunken: "#E8ECEA",
    border: "#D5DCD8",
    borderStrong: "#C2CBC6",
    textPrimary: "#1A1F1D",
    textSecondary: "#3F4A45",
    textMuted: "#7A8680",
  };
}
