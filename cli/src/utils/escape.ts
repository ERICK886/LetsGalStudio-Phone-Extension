/**
 * @file escape.ts
 * @description 将用户标题安全嵌入 JSON / JS（双引号）字符串字面量的转义工具。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

/**
 * 转义字符串，使其可安全嵌入 JSON 双引号字符串字面量（不含外层引号）。
 *
 * 覆盖 `"`、`\`、换行等控制字符；不做 HTML 转义。
 *
 * @param value - 原始字符串（如用户输入的显示标题）
 * @returns 已转义、可直接拼进 `"..."` 的内容
 *
 * @example
 * ```ts
 * escapeForJsonString('商店 "特价"');
 * // => '商店 \\"特价\\"'
 * // 完整 JSON：`{"name":"${escapeForJsonString(title)}"}`
 * ```
 *
 * @throws 无（对任意字符串均返回可嵌入形式）
 */
export function escapeForJsonString(value: string): string {
  // JSON.stringify 产出带引号的合法 JSON 字符串；去掉首尾引号即得内容转义
  return JSON.stringify(value).slice(1, -1);
}

/**
 * 转义字符串，使其可安全嵌入 TypeScript / JavaScript 双引号字符串字面量。
 *
 * 与 JSON 双引号字符串转义规则一致（`"`、`\`、控制字符），YAGNI：不单独维护第二套表。
 *
 * @param value - 原始字符串
 * @returns 已转义、可直接拼进 `"..."` 的内容
 *
 * @example
 * ```ts
 * // 模板：title: "{{title}}"
 * // vars.title = escapeForJsString('Say "Hi"') → Say \"Hi\"
 * ```
 *
 * @throws 无
 */
export function escapeForJsString(value: string): string {
  return escapeForJsonString(value);
}
