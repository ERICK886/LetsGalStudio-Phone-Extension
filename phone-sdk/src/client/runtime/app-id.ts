/**
 * @file app-id.ts
 * @description Phone SDK 应用 id 约定：与 Studio「程序 ID」对齐，并支持扩展ID/程序ID 引用解析。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.2.0
 */

/**
 * Studio 程序 ID（`@extension({ id })`）字符规则。
 * 与 SDK `ui-ref` 的 uiId 一致：字母数字、连字符、下划线。
 */
const PROGRAM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Studio 程序引用：`扩展ID/程序ID`。
 *
 * @example `ink.zenly.ext-phone-snake/phone-snake`
 */
export interface StudioProgramRef {
  /** `extension.json` 的 `id` */
  extensionId: string;
  /** `@extension({ id })` 的程序 ID */
  programId: string;
}

/**
 * 判断是否为合法的 Studio 程序 ID（Phone SDK 应用 id 的规范形态）。
 *
 * @param id 待校验字符串
 * @returns 是否合法
 *
 * @example
 * ```ts
 * isPhoneAppId("phone-snake"); // true
 * isPhoneAppId("ink.zenly.ext-phone-snake"); // false（那是扩展 ID，不是程序 ID）
 * ```
 */
export function isPhoneAppId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64 && PROGRAM_ID_PATTERN.test(id);
}

/**
 * 拼接 Studio 程序引用路径。
 *
 * @param extensionId 扩展清单 id（`extension.json`）
 * @param programId `@extension({ id })` 程序 id
 * @returns `extensionId/programId`
 *
 * @throws 当任一段非法时抛出 Error
 *
 * @example
 * ```ts
 * formatStudioProgramRef("ink.zenly.ext-phone-snake", "phone-snake");
 * // → "ink.zenly.ext-phone-snake/phone-snake"
 * ```
 */
export function formatStudioProgramRef(extensionId: string, programId: string): string {
  if (!extensionId || extensionId.includes("/")) {
    throw new Error(`[phone-sdk] extensionId 非法: ${JSON.stringify(extensionId)}`);
  }
  if (!isPhoneAppId(programId)) {
    throw new Error(`[phone-sdk] programId 非法: ${JSON.stringify(programId)}`);
  }
  return `${extensionId}/${programId}`;
}

/**
 * 解析 Studio 程序引用，或纯程序 ID。
 *
 * - `phone-snake` → `{ extensionId: "", programId: "phone-snake" }`
 * - `ink.zenly.ext-phone-snake/phone-snake` → 两段均解析
 *
 * @param refOrProgramId Studio 路径或程序 ID
 * @returns 解析结果；非法时返回 `null`
 */
export function parseStudioProgramRef(refOrProgramId: string): StudioProgramRef | null {
  if (typeof refOrProgramId !== "string") return null;
  const trimmed = refOrProgramId.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("/")) {
    if (!isPhoneAppId(trimmed)) return null;
    return { extensionId: "", programId: trimmed };
  }

  const slash = trimmed.indexOf("/");
  if (trimmed.indexOf("/", slash + 1) !== -1) return null;

  const extensionId = trimmed.slice(0, slash).trim();
  const programId = trimmed.slice(slash + 1).trim();
  if (!extensionId || extensionId.includes("/") || !isPhoneAppId(programId)) return null;

  return { extensionId, programId };
}

/**
 * 将作者填写的 phoneAppId / 注册 id 规范为 Phone SDK 应用 id（= Studio 程序 ID）。
 *
 * 一个扩展可注册多个 app：每个 `@extension` 程序对应一个 `registerPhoneApp`，
 * id 必须与该程序的 `@extension({ id })` 一致。
 *
 * @param idOrStudioRef 程序 ID，或 `扩展ID/程序ID`
 * @returns 规范化后的程序 ID；无法解析时返回 `null`
 *
 * @example
 * ```ts
 * toPhoneAppId("phone-snake");
 * // → "phone-snake"
 *
 * toPhoneAppId("ink.zenly.ext-phone-snake/phone-snake");
 * // → "phone-snake"
 * ```
 */
export function toPhoneAppId(idOrStudioRef: string): string | null {
  const parsed = parseStudioProgramRef(idOrStudioRef);
  return parsed ? parsed.programId : null;
}
