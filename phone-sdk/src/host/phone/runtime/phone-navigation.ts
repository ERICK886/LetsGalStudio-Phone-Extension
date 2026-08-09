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
  publishPhoneNavigate,
  waitForPhoneClosed,
  type OpenPhoneAppOptions,
  type PhoneNavigationController,
} from "@ink-zenly/phone-sdk/plugin";
import {
  activatePhoneRuntime,
  getPhoneRuntime,
  hidePhoneUi,
} from "../extension/phone-extension";

/** `waitUntil: "close"` 的保险释放时间，避免宿主 show 失败时永久挂起调用方。 */
const PHONE_CLOSE_WAIT_TIMEOUT_MS = 8_000;

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
 * - 未显示时以 `interactable: false` 显示手机，交由内页应用接管交互。
 * - `waitUntil: "none"` 立即返回；否则等待 `emitPhoneClosed`，并在 8s 超时后 warn + resolve。
 */
export function createPhoneNavigationController(
  ctx: ExtensionContext,
): PhoneNavigationController {
  return {
    async openPhoneApp(options: OpenPhoneAppOptions): Promise<void> {
      const runtime = getPhoneRuntime(ctx);
      if (runtime.storyMessageSessionVisible) {
        console.warn("[phone] openPhoneApp: 消息手机占用中，已跳过");
        return;
      }
      activatePhoneRuntime(runtime);

      if (!ctx.ui.isVisible("phone")) {
        try {
          await ctx.ui.show("phone", undefined, {
            size: "(100%, 100%)",
            position: "(0, 0)",
            interactable: false,
          });
        } catch (error) {
          console.error("[phone] openPhoneApp: 显示手机失败", error);
          return;
        }
      }

      publishPhoneNavigate({
        appId: options.appId,
        seq: ++phoneNavigateSeq,
        ...(options.payload ? { payload: options.payload } : {}),
      });

      if (options.waitUntil === "none") return;
      await waitForPhoneClosedWithTimeout();
    },

    async closePhoneApp(): Promise<void> {
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
 * 等待手机关闭，超时后 warn 并 resolve，避免调用方永久挂起。
 */
async function waitForPhoneClosedWithTimeout(): Promise<void> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    await Promise.race([
      waitForPhoneClosed(),
      new Promise<void>((resolve) => {
        timer = globalThis.setTimeout(() => {
          console.warn(
            "[phone] openPhoneApp: 等待手机关闭超时，已释放调用方",
          );
          resolve();
        }, PHONE_CLOSE_WAIT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) globalThis.clearTimeout(timer);
  }
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
