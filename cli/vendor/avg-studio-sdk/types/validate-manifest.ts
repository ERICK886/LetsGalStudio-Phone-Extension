import { EXTENSION_ID_PATTERN, EXTENSION_ENTRY_DEFAULT } from "../constants";
import type {
  BuiltinComponentId,
  ExtensionContributions,
  ExtensionDialogueBoxStyleContribution,
  ExtensionManifest,
  ExtensionNetworkDeclaration,
  ExtensionRiskTier,
  PropsSchemaField,
  PropsSchemaFieldType,
} from "./extension-manifest";

/**
 * 允许声明 `manifest.builtin: true` 的扩展 id 前缀白名单。
 * 第三方扩展声明 builtin 会被加载阶段拒绝。
 */
const BUILTIN_ID_ALLOWED_PREFIXES: readonly string[] = [
  "avg.internal.",
];

const VALID_FIELD_TYPES: ReadonlySet<PropsSchemaFieldType> = new Set([
  "string",
  "number",
  "boolean",
  "enum",
]);

const VALID_BUILTIN_COMPONENT_IDS: ReadonlySet<BuiltinComponentId> = new Set([
  "DialogueBox",
  "Choice",
  "InputBox",
]);

const VALID_RISK_TIERS: ReadonlySet<ExtensionRiskTier> = new Set([
  "safe",
  "standard",
  "privileged",
]);

// 与 Visual UI 文件名契约保持一致，但 SDK 不能反向依赖 engine。
const VISUAL_UI_FILE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export class ExtensionManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtensionManifestError";
  }
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ExtensionManifestError(`字段 "${field}" 必须是非空字符串`);
  }
  return value;
}

function validateField(name: string, raw: unknown): PropsSchemaField {
  if (!raw || typeof raw !== "object") {
    throw new ExtensionManifestError(
      `propsSchema."${name}" 必须是对象`,
    );
  }
  const r = raw as Record<string, unknown>;
  const type = r.type as PropsSchemaFieldType | undefined;
  if (!type || !VALID_FIELD_TYPES.has(type)) {
    throw new ExtensionManifestError(
      `propsSchema."${name}".type 必须是 string | number | boolean | enum`,
    );
  }
  if (type === "enum") {
    if (!Array.isArray(r.options) || r.options.length === 0) {
      throw new ExtensionManifestError(
        `propsSchema."${name}".options 在 type=enum 时必须是非空数组`,
      );
    }
  }
  const out: PropsSchemaField = { type };
  if (r.default !== undefined) out.default = r.default;
  if (typeof r.description === "string") out.description = r.description;
  if (Array.isArray(r.options)) out.options = r.options.map(String);
  return out;
}

function validateDialogueBoxStyles(
  raw: unknown,
): ExtensionDialogueBoxStyleContribution[] {
  if (!Array.isArray(raw)) {
    throw new ExtensionManifestError(
      "contributes.dialogueBoxStyles 必须是数组",
    );
  }

  const styles: ExtensionDialogueBoxStyleContribution[] = [];
  const seenIds = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    const field = `contributes.dialogueBoxStyles[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ExtensionManifestError(`${field} 必须是对象`);
    }
    const value = item as Record<string, unknown>;
    const id = ensureString(value.id, `${field}.id`);
    if (seenIds.has(id)) {
      throw new ExtensionManifestError(
        `contributes.dialogueBoxStyles 出现重复 id "${id}"`,
      );
    }
    seenIds.add(id);

    const visualUI = ensureString(value.visualUI, `${field}.visualUI`);
    if (!VISUAL_UI_FILE_NAME_PATTERN.test(visualUI)) {
      throw new ExtensionManifestError(
        `${field}.visualUI "${visualUI}" 不是安全的 Visual UI 文件名`,
      );
    }

    const style: ExtensionDialogueBoxStyleContribution = {
      id,
      name: ensureString(value.name, `${field}.name`),
      visualUI,
    };
    if (value.description !== undefined) {
      if (typeof value.description !== "string") {
        throw new ExtensionManifestError(`${field}.description 必须是字符串`);
      }
      style.description = value.description;
    }
    if (value.dialogueBox !== undefined) {
      if (
        !value.dialogueBox ||
        typeof value.dialogueBox !== "object" ||
        Array.isArray(value.dialogueBox)
      ) {
        throw new ExtensionManifestError(`${field}.dialogueBox 必须是对象`);
      }
      style.dialogueBox = {
        ...(value.dialogueBox as Record<string, unknown>),
      };
    }
    styles.push(style);
  }
  return styles;
}

export function validateExtensionManifest(raw: unknown): ExtensionManifest {
  if (!raw || typeof raw !== "object") {
    throw new ExtensionManifestError("manifest 必须是 JSON 对象");
  }
  const r = raw as Record<string, unknown>;

  const id = ensureString(r.id, "id");
  if (!EXTENSION_ID_PATTERN.test(id)) {
    throw new ExtensionManifestError(
      `id "${id}" 不合法:不能包含空格 / \\ : * ? " < > | 等路径特殊字符,长度 2-128`,
    );
  }

  // 原始 manifest 是否显式声明了 entry —— 决定 hasProgram(纯资源扩展不写 entry)。
  const declaredEntry = typeof r.entry === "string" && r.entry.length > 0;

  const manifest: ExtensionManifest = {
    id,
    name: ensureString(r.name, "name"),
    // author 可以为空(新建扩展时 UI 没强制填)
    author: typeof r.author === "string" ? r.author : "",
    version: ensureString(r.version, "version"),
    entry: declaredEntry ? (r.entry as string) : EXTENSION_ENTRY_DEFAULT,
    // 声明了 entry = 带程序;没声明 = 纯资源扩展。老 manifest 都声明了 entry。
    hasProgram: declaredEntry,
    sdkVersion: ensureString(r.sdkVersion, "sdkVersion"),
  };

  if (typeof r.description === "string") manifest.description = r.description;
  if (typeof r.icon === "string") manifest.icon = r.icon;

  if (r.contributes !== undefined) {
    if (
      !r.contributes ||
      typeof r.contributes !== "object" ||
      Array.isArray(r.contributes)
    ) {
      throw new ExtensionManifestError("contributes 必须是对象");
    }
    const rawContributions = r.contributes as Record<string, unknown>;
    const contributes: ExtensionContributions = {};
    if (rawContributions.dialogueBoxStyles !== undefined) {
      contributes.dialogueBoxStyles = validateDialogueBoxStyles(
        rawContributions.dialogueBoxStyles,
      );
    }
    manifest.contributes = contributes;
  }

  if (r.propsSchema !== undefined) {
    if (typeof r.propsSchema !== "object" || r.propsSchema === null) {
      throw new ExtensionManifestError("propsSchema 必须是对象");
    }
    const out: Record<string, PropsSchemaField> = {};
    for (const [key, val] of Object.entries(r.propsSchema)) {
      out[key] = validateField(key, val);
    }
    manifest.propsSchema = out;
  }

  if (r.overrides !== undefined) {
    if (!Array.isArray(r.overrides)) {
      throw new ExtensionManifestError("overrides 必须是字符串数组");
    }
    const overrides: BuiltinComponentId[] = [];
    const seen = new Set<string>();
    for (const o of r.overrides) {
      if (
        typeof o !== "string" ||
        !VALID_BUILTIN_COMPONENT_IDS.has(o as BuiltinComponentId)
      ) {
        throw new ExtensionManifestError(
          `overrides 项 "${String(o)}" 不是已知的内置组件 ID(允许:DialogueBox / Choice / InputBox)`,
        );
      }
      if (seen.has(o)) {
        throw new ExtensionManifestError(
          `overrides 出现重复项 "${o}"`,
        );
      }
      seen.add(o);
      overrides.push(o as BuiltinComponentId);
    }
    manifest.overrides = overrides;
  }

  if (r.builtin !== undefined) {
    if (typeof r.builtin !== "boolean") {
      throw new ExtensionManifestError("builtin 必须是布尔值");
    }
    if (
      r.builtin === true &&
      !BUILTIN_ID_ALLOWED_PREFIXES.some((prefix) => id.startsWith(prefix))
    ) {
      throw new ExtensionManifestError(
        `扩展 "${id}" 声明 builtin: true,但 id 不在白名单前缀(` +
          BUILTIN_ID_ALLOWED_PREFIXES.join(", ") +
          `)内。builtin 仅供 avg.internal.* 扩展使用。`,
      );
    }
    manifest.builtin = r.builtin;
  }

  // 阶段二权限模型的声明字段:阶段一只静态校验"形状",不锁 permissions 枚举、不 gating。
  if (r.permissions !== undefined) {
    if (!Array.isArray(r.permissions)) {
      throw new ExtensionManifestError("permissions 必须是字符串数组");
    }
    const perms: string[] = [];
    for (const p of r.permissions) {
      if (typeof p !== "string") {
        throw new ExtensionManifestError(`permissions 项 "${String(p)}" 不是字符串`);
      }
      perms.push(p);
    }
    manifest.permissions = perms;
  }

  if (r.network !== undefined) {
    if (typeof r.network !== "object" || r.network === null) {
      throw new ExtensionManifestError("network 必须是对象");
    }
    const net = r.network as { domains?: unknown };
    const decl: ExtensionNetworkDeclaration = {};
    if (net.domains !== undefined) {
      if (!Array.isArray(net.domains) || net.domains.some((d) => typeof d !== "string")) {
        throw new ExtensionManifestError("network.domains 必须是字符串数组");
      }
      decl.domains = net.domains as string[];
    }
    manifest.network = decl;
  }

  if (r.riskTier !== undefined) {
    if (typeof r.riskTier !== "string" || !VALID_RISK_TIERS.has(r.riskTier as ExtensionRiskTier)) {
      throw new ExtensionManifestError(
        `riskTier "${String(r.riskTier)}" 非法(允许:safe / standard / privileged)`,
      );
    }
    manifest.riskTier = r.riskTier as ExtensionRiskTier;
  }

  if (r.minHostVersion !== undefined) {
    if (typeof r.minHostVersion !== "string") {
      throw new ExtensionManifestError("minHostVersion 必须是字符串");
    }
    manifest.minHostVersion = r.minHostVersion;
  }

  return manifest;
}
