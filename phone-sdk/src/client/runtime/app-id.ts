/**
 * @file app-id.ts
 * @description Phone SDK 应用 id 约定：与 Studio「程序 ID」对齐，并支持扩展ID/程序ID 引用解析。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.5
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
 * 判断是否为规范的「扩展ID/程序ID」路径（两端均非空且合法）。
 *
 * @param value - 作者填写的 Phone SDK 应用 ID
 * @returns 是否为完整引用路径
 *
 * @remarks
 * 宿主「动作 · 手机内部应用」对**宿主内置**内页填程序 ID 即可；
 * 跨扩展第三方内页仍可用此完整路径格式。
 *
 * @example
 * ```ts
 * isStudioProgramRefPath("ink.zenly.app-015abe/phone-chat"); // true
 * isStudioProgramRefPath("phone-chat"); // false（那是裸程序 ID，另用 isPhoneAppId）
 * ```
 */
export function isStudioProgramRefPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = parseStudioProgramRef(value);
  return Boolean(parsed && parsed.extensionId);
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
  if (!isPhoneExtensionId(extensionId)) {
    throw new Error(`[phone-sdk] extensionId 非法: ${JSON.stringify(extensionId)}`);
  }
  if (!isPhoneAppId(programId)) {
    throw new Error(`[phone-sdk] programId 非法: ${JSON.stringify(programId)}`);
  }
  return `${extensionId.trim()}/${programId}`;
}

/**
 * 将作者填写值规范为「扩展ID/程序ID」路径。
 *
 * @param idOrRef - 已含斜杠的完整引用
 * @returns 规范化路径；缺扩展段或非法时 `null`
 *
 * @example
 * ```ts
 * toStudioProgramRefPath(" ink.zenly.app-015abe / phone-chat ");
 * // → "ink.zenly.app-015abe/phone-chat"
 * toStudioProgramRefPath("phone-chat"); // null
 * ```
 */
export function toStudioProgramRefPath(idOrRef: string): string | null {
  const parsed = parseStudioProgramRef(idOrRef);
  if (!parsed?.extensionId) return null;
  return formatStudioProgramRef(parsed.extensionId, parsed.programId);
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
  if (!isPhoneExtensionId(extensionId) || !isPhoneAppId(programId)) return null;

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

/** 扩展归属只接受单段、非空标识，避免不明确的引用。 */
export function isPhoneExtensionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value.trim());
}

/** 规范化引用但保留扩展段；toPhoneAppId 仍只负责提取旧程序 ID。 */
export function normalizePhoneAppReference(value: string): string | null {
  const parsed = parseStudioProgramRef(value);
  if (!parsed) return null;
  return parsed.extensionId ? `${parsed.extensionId}/${parsed.programId}` : parsed.programId;
}

/** 导航消费者匹配自己的程序和来源；继续接受旧版裸程序 ID。 */
export function matchesPhoneAppReference(reference: string, programId: string, extensionId: string): boolean {
  const parsed = parseStudioProgramRef(reference);
  return Boolean(parsed && parsed.programId === programId && (!parsed.extensionId || parsed.extensionId === extensionId));
}
