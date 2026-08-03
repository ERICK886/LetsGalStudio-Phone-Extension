/**
 * @file story-message-visibility.ts
 * @description 消息手机头像/名称显示开关：预设布尔归一化与方法三态覆盖解析。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.1
 */

/** `show-message` 单条对预设开关的覆盖。 */
export type StoryVisibilityOverride = "inherit" | "show" | "hide";

export const STORY_VISIBILITY_OVERRIDES = [
  "inherit",
  "show",
  "hide",
] as const satisfies readonly StoryVisibilityOverride[];

/**
 * 将预设中的「显示头像 / 显示名称」原始值规范为 boolean。
 *
 * @param value - settings 原始值
 * @returns 仅当值为严格 `false` 时返回 `false`，否则 `true`（兼容旧数据）
 *
 * @example
 * normalizePresetVisibilityFlag(false) // false
 * normalizePresetVisibilityFlag(undefined) // true
 */
export function normalizePresetVisibilityFlag(value: unknown): boolean {
  return value !== false;
}

/**
 * 按「方法优先于预设」解析最终是否显示。
 *
 * @param methodOverride - 方法字段：`inherit` | `show` | `hide`；非法或缺失视为 inherit
 * @param presetShow - 预设侧已归一化的布尔
 * @returns 播放快照应写入的最终布尔
 *
 * @example
 * resolveStoryVisibility("hide", true) // false
 * resolveStoryVisibility("inherit", false) // false
 */
export function resolveStoryVisibility(
  methodOverride: unknown,
  presetShow: boolean,
): boolean {
  if (methodOverride === "show") return true;
  if (methodOverride === "hide") return false;
  return presetShow;
}
