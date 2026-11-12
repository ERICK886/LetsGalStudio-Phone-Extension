import { parseStudioProgramRef } from "./app-id";
import type { PhoneAppRegistration } from "./types";

export interface PhoneAppResolution {
  status: "ready" | "invalid" | "missing" | "owner-mismatch";
  app?: PhoneAppRegistration;
  /** 无来源的旧应用通过程序 ID 匹配；供诊断区分兼容路径。 */
  legacy?: boolean;
}

/** 不改变数据；完整引用仅匹配相同来源或旧版未声明来源的应用。 */
export function resolvePhoneAppReference(
  reference: string,
  apps: readonly PhoneAppRegistration[],
): PhoneAppResolution {
  const parsed = parseStudioProgramRef(reference);
  if (!parsed) return { status: "invalid" };
  const app = apps.find((candidate) => candidate.id === parsed.programId);
  if (!app) return { status: "missing" };
  if (parsed.extensionId && app.extensionId && parsed.extensionId !== app.extensionId) {
    return { status: "owner-mismatch" };
  }
  return { status: "ready", app, legacy: !app.extensionId };
}
