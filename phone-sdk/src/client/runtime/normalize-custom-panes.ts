import type {
  PhoneAppRegistration,
  ResolvePhoneEditorCustomPanes,
} from "./types";

/**
 * 从原始 styleEditor 保留经校验的自定义 pane resolver。
 * 函数本身不得包装，注册方依赖其模块级引用稳定性。
 */
export function normalizeCustomPanesResolver(
  raw: PhoneAppRegistration["styleEditor"],
): { resolveCustomPanes: ResolvePhoneEditorCustomPanes } | undefined {
  if (raw && typeof raw.resolveCustomPanes === "function") {
    return { resolveCustomPanes: raw.resolveCustomPanes };
  }
  return undefined;
}
