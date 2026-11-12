import type { ExtensionContext } from "@avg-studio/sdk";

/**
 * 新版 Studio 在 archive/snapshot 历史重放期间公开 flow.isRestoring。
 * 本仓 SDK 合同尚未含该可选能力：运行时检测，旧宿主保持原行为；普通 seek/skip 仍写入消息。
 * 存档已包含业务状态，恢复时不能再次追加消息或重复应用玩家回复的变量效果。
 */
export function isChatRestoreReplay(ctx: ExtensionContext): boolean {
  return Reflect.get(ctx.flow, "isRestoring") === true;
}
