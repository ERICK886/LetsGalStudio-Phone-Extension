/**
 * @file phone-navigation.ts
 * @description 宿主侧手机导航控制器：把 `openPhoneApp` / `closePhoneApp` 落到 PhoneExtension 的 ctx 上。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.1
 *
 * @remarks
 * 聊天扩展的 ctx 不是手机扩展的 ctx，不能用聊天 ctx 去 `ui.show("phone")`。
 * 控制器在 `PhoneExtension.onRegister` 中通过 `bindPhoneNavigationController(ctx)` 闭包住手机 ctx，
 * 写入全局槽位 `getPhoneSdkSlot().navigation`，供插件侧 `openPhoneApp` / `closePhoneApp` 委托调用。
 *
 * 与 `phone-extension.tsx` 存在循环引用：phone-extension 导入 `bindPhoneNavigationController`，
 * 本文件导入 `getPhoneRuntime` / `activatePhoneRuntime` / `hidePhoneUi`。两端均在运行时（函数调用）才使用对方绑定，
 * 且被导入的是 hoisted 的 `export function` 声明，循环求值阶段即可见，故安全。
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import {
  emitPhoneClosed,
  getPhoneSdkSlot,
  isPhoneCloseLocked,
  publishPhoneNavigate,
  waitForPhoneClosed,
  type OpenPhoneAppOptions,
  type OpenPhoneAppResult,
  type PhoneNavigationController,
} from "@ink-zenly/phone-sdk/plugin";
import {
  activatePhoneRuntime,
  getPhoneRuntime,
  hidePhoneUi,
} from "../extension/phone-extension";

/** 调用方维护的单调递增序号，便于宿主去重 / 排序。模块级以跨 onRegister 重建保持递增。 */
let phoneNavigateSeq = 0;

/**
 * 创建绑定到指定手机 ctx 的导航控制器。
 *
 * @param ctx 手机扩展的 ExtensionContext（来自 onRegister）
 * @returns 实现 `PhoneNavigationController` 的控制器
 *
 * @remarks
 * - 剧情消息会话占用时 warn 并跳过，避免抢占当前 Preview 的 phone 容器。
 * - 未显示时以 `interactable: true` 显示手机，使内页应用能够接管交互。
 * - `waitUntil: "none"` 立即返回；否则等待 `emitPhoneClosed`，引擎销毁时由 flow signal 取消等待。
 */
export function createPhoneNavigationController(
  ctx: ExtensionContext,
): PhoneNavigationController {
  return {
    async openPhoneApp(
      options: OpenPhoneAppOptions,
    ): Promise<OpenPhoneAppResult> {
      const runtime = getPhoneRuntime(ctx);
      const slot = getPhoneSdkSlot();
      if (options.position) slot.phonePositionOverride = options.position;
      else delete slot.phonePositionOverride;
      console.info("[phone-call:incoming]", {
        event: "host-navigation-enter",
        appId: options.appId,
        phoneMounted: runtime.phoneMounted,
        storyMessageSessionVisible: runtime.storyMessageSessionVisible,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });
      if (runtime.storyMessageSessionVisible) {
        console.warn("[phone] openPhoneApp: 消息手机占用中，已跳过");
        console.warn("[phone-call:incoming] host-navigation-blocked", {
          reason: "story-message-session",
          appId: options.appId,
        });
        return "blocked";
      }
      activatePhoneRuntime(ctx, runtime);

      if (!ctx.ui.isVisible("phone")) {
        try {
          await ctx.ui.show("phone", undefined, {
            size: "(100%, 100%)",
            position: "(0, 0)",
            // 程序化打开的内页同样需要接管输入；强制来电、聊天回复等
            // 都依赖玩家点击。false 会让 Studio 把整层当作不可交互展示层。
            interactable: true,
          });
          console.info("[phone-call:incoming]", {
            event: "host-ui-show-resolved",
            appId: options.appId,
            phoneUiVisible: ctx.ui.isVisible("phone"),
          });
        } catch (error) {
          console.error("[phone] openPhoneApp: 显示手机失败", error);
          return "failed";
        }
      }

      publishPhoneNavigate({
        appId: options.appId,
        seq: ++phoneNavigateSeq,
        ...(options.payload ? { payload: options.payload } : {}),
      });
      console.info("[phone-call:incoming]", {
        event: "host-navigation-published",
        appId: options.appId,
        navigateSeq: phoneNavigateSeq,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });

      if (options.waitUntil !== "none") {
        await waitForPhoneClosed(ctx.flow.signal);
      }
      return "opened";
    },

    async closePhoneApp(): Promise<void> {
      if (isPhoneCloseLocked()) return;
      delete getPhoneSdkSlot().phonePositionOverride;
      const animated = getPhoneSdkSlot().requestAnimatedClosePhone;
      if (animated) {
        await animated();
        return;
      }

      if (!ctx.ui.isVisible("phone")) return;

      try {
        await hidePhoneUi(ctx);
      } catch (error) {
        console.error("[phone] closePhoneApp: 隐藏手机失败", error);
      } finally {
        emitPhoneClosed();
      }
    },
  };
}

/**
 * 把导航控制器写入全局槽位，供插件侧 `openPhoneApp` 委托调用。
 *
 * @param ctx 手机扩展的 ExtensionContext（来自 onRegister）
 *
 * @remarks
 * 必须在 `PhoneExtension.onRegister(ctx)` 中调用，确保控制器闭包住手机 ctx 而非聊天 ctx。
 * 重复调用（热重载）会覆盖旧控制器，旧控制器闭包的 ctx 失效后自然不再被使用。
 */
export function bindPhoneNavigationController(ctx: ExtensionContext): void {
  getPhoneSdkSlot().navigation = createPhoneNavigationController(ctx);
}
