import { method, type ExtensionContext } from "@avg-studio/sdk";
import { closePhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { addContact, beginIncomingCall, bindPhoneCallSave, defineOutgoingStory, phoneCallDebug, removeContact } from "./runtime";
import { cachePhoneCallSettings, readPhoneCallSettings } from "./settings";
import type { StoryFragmentRef } from "./types";
import type { PhoneCallPosition } from "./types";

const PHONE_POSITIONS = new Set<PhoneCallPosition>(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right", "center"]);
function position(value: unknown): PhoneCallPosition | undefined {
  const normalized = String(value ?? "").trim() as PhoneCallPosition;
  return PHONE_POSITIONS.has(normalized) ? normalized : undefined;
}

function prepare(self: unknown, ctx: ExtensionContext) {
  phoneCallDebug("prepare-start", { saveApiType: typeof self });
  bindPhoneCallSave(ctx, self as any);
  cachePhoneCallSettings(ctx, readPhoneCallSettings(ctx));
  phoneCallDebug("prepare-complete");
}
function ref(params: Record<string, unknown>, key: string): StoryFragmentRef | undefined { const fragmentId = String(params[key] ?? "").trim(); if (!fragmentId) return; const chapterId = String(params[`${key}Chapter`] ?? "").trim(); return { fragmentId, ...(chapterId ? { chapterId } : {}) }; }
async function play(ctx: ExtensionContext, value?: StoryFragmentRef) { if (value) await ctx.flow.callFragment(value.fragmentId, value.chapterId ? { chapterId: value.chapterId } : undefined); }

async function executeIncomingCall(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): Promise<void> {
  phoneCallDebug("method-execute", {
    callerRawType: typeof params.caller,
    callerRaw: typeof params.caller === "string" ? params.caller : String(params.caller ?? ""),
    requireAnswerRaw: String(params.requireAnswer ?? ""),
  });
  prepare(instanceSave, ctx);
  const session = {
    id: `incoming-${Date.now()}`,
    // required 字段在编辑器预览、旧脚本或变量尚未赋值时仍可能传空。
    // 强制来电不能因此静默跳过；用稳定占位 ID 显示“未知来电”。
    characterId: String(params.caller ?? "").trim() || "unknown-caller",
    requireAnswer:
      params.requireAnswer === true || params.requireAnswer === "true",
    position: position(params.position),
    answerStory: ref(params, "answerStory"),
    declineStory: ref(params, "declineStory"),
  };
  phoneCallDebug("method-session-normalized", {
    sessionId: session.id,
    characterId: session.characterId,
    requireAnswer: session.requireAnswer,
    position: session.position ?? null,
  });
  const choice = await beginIncomingCall(ctx, session);
  phoneCallDebug("method-choice-resolved", { sessionId: session.id, choice });
  if (choice === "cancelled") return;
  if (choice === "decline") {
    await closePhoneApp();
    await play(ctx, session.declineStory);
    return;
  }
  await closePhoneApp();
  await play(ctx, session.answerStory);
}

export const incomingCallMethod = method({ id: "incoming-call", title: "电话 · 发起强制来电", description: "显示来电界面并等待玩家接听或挂断；可分别执行可返回的剧情片段。", schema: {
  caller: { type: "character", label: "来电角色", required: true }, requireAnswer: { type: "boolean", label: "必须接听（隐藏挂断按钮）", default: false },
  position: { type: "enum", label: "手机方位", default: "bottom-right", options: [
    { label: "左上", value: "top-left" }, { label: "上中", value: "top-center" }, { label: "右上", value: "top-right" },
    { label: "左下", value: "bottom-left" }, { label: "下中", value: "bottom-center" }, { label: "右下", value: "bottom-right" },
    { label: "居中", value: "center" },
  ] },
  answerStory: { type: "fragment", label: "接听后剧情片段", chapterField: "answerStoryChapter" }, declineStory: { type: "fragment", label: "挂断后剧情片段", chapterField: "declineStoryChapter" },
}, async run(ctx, params) {
  phoneCallDebug("method-branch", { branch: "run" });
  await executeIncomingCall(
    ctx,
    params as Record<string, unknown>,
    this.save,
  );
},
  // Studio 即时预览仍须展示强制来电，否则作者无法预览和验证界面。
  async runImmediately(ctx, params) {
    phoneCallDebug("method-branch", { branch: "runImmediately" });
    await executeIncomingCall(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  // “强制来电”是剧情门控，即使宿主把预览误分派到 skip，也必须等待玩家处理。
  async skip(ctx, params) {
    phoneCallDebug("method-branch", { branch: "skip" });
    await executeIncomingCall(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  }
});

export const defineOutgoingCallMethod = method({ id: "define-outgoing-call", title: "电话 · 定义自主拨号剧情", description: "为联系人定义玩家自主拨号时执行的可返回片段；同一联系人仅保留最近一次定义。", schema: { contact: { type: "character", label: "联系人", required: true }, story: { type: "fragment", label: "拨号剧情片段", required: true, chapterField: "storyChapter" } }, run(ctx,p){ prepare(this.save,ctx); const x=p as Record<string,unknown>; const value=ref(x,"story"); const characterId=String(x.contact??"").trim(); if(value&&characterId) defineOutgoingStory(ctx,{characterId,...value,definedAt:Date.now()}); }, runImmediately(ctx,p){ prepare(this.save,ctx); const x=p as Record<string,unknown>; const value=ref(x,"story"); const characterId=String(x.contact??"").trim(); if(value&&characterId) defineOutgoingStory(ctx,{characterId,...value,definedAt:Date.now()}); }, skip(ctx,p){ prepare(this.save,ctx); const x=p as Record<string,unknown>; const value=ref(x,"story"); const characterId=String(x.contact??"").trim(); if(value&&characterId) defineOutgoingStory(ctx,{characterId,...value,definedAt:Date.now()}); } });
export const addPhoneContactMethod = method({ id:"add-contact", title:"电话 · 添加联系人", schema:{contact:{type:"character",label:"联系人",required:true}}, run(ctx,p){prepare(this.save,ctx);addContact(ctx,String(p.contact??""));},runImmediately(ctx,p){prepare(this.save,ctx);addContact(ctx,String(p.contact??""));},skip(ctx,p){prepare(this.save,ctx);addContact(ctx,String(p.contact??""));} });
export const removePhoneContactMethod = method({ id:"remove-contact", title:"电话 · 移除联系人", schema:{contact:{type:"character",label:"联系人",required:true}}, run(ctx,p){prepare(this.save,ctx);removeContact(ctx,String(p.contact??""));},runImmediately(ctx,p){prepare(this.save,ctx);removeContact(ctx,String(p.contact??""));},skip(ctx,p){prepare(this.save,ctx);removeContact(ctx,String(p.contact??""));} });
