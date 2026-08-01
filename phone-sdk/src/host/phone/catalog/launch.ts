/**
 * @file launch.ts
 * @description 按受限目标启动 Studio Runtime API。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import type { PhoneTarget } from "./types";

/**
 * 按受限目标类型调用 Studio Runtime API。
 * 程序 UI 使用 `ctx.ui.show`，可视化 UI 使用 `ctx.visualUI.open`，系统槽始终模态调用；Fragment 与扩展方法适配都会
 * 通过 `ctx.flow.callFragment` 执行。扩展方法分支不会直接执行 `methodRef`，因为 SDK 尚未公开该 API。
 * 本地命令仅允许快速存档、快速读档和切换全屏；宿主 API 的异步错误会向上传播给 UI 统一处理。
 * `in-phone-app` 不在此函数执行：必须由手机 UI 保持外壳打开并渲染 SDK 注册组件。
 */
export async function launchPhoneTarget(
  ctx: ExtensionContext,
  target: PhoneTarget,
): Promise<void> {
  switch (target.kind) {
    case "program-ui":
      await ctx.ui.show(target.ref, target.props);
      return;
    case "visual-ui":
      await ctx.visualUI.open(target.name, { modal: target.modal !== false });
      return;
    case "system-slot":
      await ctx.system.invoke(target.slot, undefined, { modal: true });
      return;
    case "extension-method":
      // SDK 暂无运行时 method invoke API；由作者提供的 Fragment 中的
      // “调用扩展方法”动作块执行 target.methodRef 对应方法。
      await ctx.flow.callFragment(
        target.fragmentId,
        target.chapterId ? { chapterId: target.chapterId } : undefined,
      );
      return;
    case "fragment":
      await ctx.flow.callFragment(
        target.fragmentId,
        target.chapterId ? { chapterId: target.chapterId } : undefined,
      );
      return;
    case "local-command":
      if (target.commandId === "quick-save") await ctx.archive.quickSave();
      else if (target.commandId === "quick-load") await ctx.archive.quickLoad();
      else if (target.commandId === "toggle-fullscreen")
        await ctx.game.window.toggleFullscreen();
      return;
    case "in-phone-app":
      throw new Error(
        `[phone] in-phone-app（${target.phoneAppId}）必须由手机 UI 内页处理，不能经 launchPhoneTarget 关闭手机后启动`,
      );
  }
}
