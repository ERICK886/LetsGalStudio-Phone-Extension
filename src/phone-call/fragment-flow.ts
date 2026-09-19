import type { ExtensionContext } from "@avg-studio/sdk";
import { closePhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { phoneCallDebug } from "./runtime";
import type { StoryFragmentRef } from "./types";

/** 出现在运行日志中，用于确认 Studio 实际加载到了包含片段链路诊断的构建。 */
export const PHONE_CALL_FRAGMENT_TRACE_VERSION = "2026-09-07.fragment-trace.1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function idText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/**
 * 解析 Studio 的 fragment 参数。
 *
 * 正式 SDK 会传稳定的片段 ID 字符串；同时兼容旧预览/检查器可能遗留的
 * `{ fragmentId, chapterId }`、`{ id }` 或 `{ value }` 对象，避免把对象误转成
 * 字面量 `[object Object]` 后交给剧情系统。
 */
export function resolveStoryFragmentRef(
  params: Record<string, unknown>,
  key: string,
): StoryFragmentRef | undefined {
  const raw = params[key];
  const rawRecord = isRecord(raw) ? raw : undefined;
  const nestedValue = rawRecord?.value;
  const nestedRecord = isRecord(nestedValue) ? nestedValue : undefined;
  const fragmentId = idText(
    rawRecord?.fragmentId ??
      rawRecord?.id ??
      nestedRecord?.fragmentId ??
      nestedRecord?.id ??
      nestedValue ??
      raw,
  );
  if (!fragmentId) return undefined;

  const chapterId = idText(
    params[`${key}Chapter`] ??
      rawRecord?.chapterId ??
      nestedRecord?.chapterId,
  );
  return { fragmentId, ...(chapterId ? { chapterId } : {}) };
}

export function fragmentRawDetails(
  params: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const raw = params[key];
  return {
    [`${key}Type`]: Array.isArray(raw) ? "array" : typeof raw,
    [`${key}Value`]: typeof raw === "string" ? raw : null,
    [`${key}Keys`]: isRecord(raw) ? Object.keys(raw) : [],
    [`${key}ChapterType`]: typeof params[`${key}Chapter`],
    [`${key}ChapterValue`]:
      typeof params[`${key}Chapter`] === "string"
        ? params[`${key}Chapter`]
        : null,
  };
}

async function playPhoneCallStory(
  ctx: ExtensionContext,
  value: StoryFragmentRef | undefined,
  choice: "answer" | "decline",
  sessionId: string,
): Promise<void> {
  if (!value) {
    phoneCallDebug("fragment-call-skipped", {
      traceVersion: PHONE_CALL_FRAGMENT_TRACE_VERSION,
      sessionId,
      choice,
      reason: "missing-fragment",
    });
    return;
  }

  const details = {
    traceVersion: PHONE_CALL_FRAGMENT_TRACE_VERSION,
    sessionId,
    choice,
    fragmentId: value.fragmentId,
    chapterId: value.chapterId ?? null,
    flowAborted: ctx.flow.signal.aborted,
  };
  phoneCallDebug("fragment-call-start", details);
  try {
    await ctx.flow.callFragment(
      value.fragmentId,
      value.chapterId ? { chapterId: value.chapterId } : undefined,
    );
    phoneCallDebug("fragment-call-returned", {
      ...details,
      flowAborted: ctx.flow.signal.aborted,
    });
  } catch (error) {
    console.error("[phone-call:fragment] call-failed", {
      ...details,
      flowAborted: ctx.flow.signal.aborted,
      error,
    });
    throw error;
  }
}

/** 完成一次来电选择：必须先等待手机关闭，再调用对应剧情片段。 */
export async function completeIncomingCallChoice(
  ctx: ExtensionContext,
  choice: "answer" | "decline",
  story: StoryFragmentRef | undefined,
  sessionId: string,
): Promise<void> {
  phoneCallDebug("method-close-start", { sessionId, choice });
  try {
    // 来电选择已完成，此处立即关闭手机后再运行片段，不播放收起动画。
    // force 只绕过热重载可能遗留的关闭锁；玩家在来电未处理前的普通关闭
    // 仍会被锁阻止。
    await closePhoneApp({ animated: false, force: true });
  } catch (error) {
    console.error("[phone-call:fragment] close-failed", {
      traceVersion: PHONE_CALL_FRAGMENT_TRACE_VERSION,
      sessionId,
      choice,
      error,
    });
    throw error;
  }
  phoneCallDebug("method-close-complete", { sessionId, choice });
  phoneCallDebug("method-fragment-start", {
    sessionId,
    choice,
    fragmentId: story?.fragmentId ?? null,
    chapterId: story?.chapterId ?? null,
  });
  await playPhoneCallStory(ctx, story, choice, sessionId);
  phoneCallDebug("method-fragment-complete", { sessionId, choice });
}
