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
  clearPhoneNavigatePending,
  emitPhoneClosed,
  getPhoneSdkSlot,
  isPhoneCloseLocked,
  phoneSdkDebug,
  publishPhoneNavigate,
  waitForPhoneClosed,
  type ClosePhoneAppOptions,
  type OpenPhoneAppOptions,
  type OpenPhoneAppResult,
  type PhoneNavigationController,
} from "@ink-zenly/phone-sdk/plugin";
import {
  activatePhoneRuntime,
  getPhoneRuntime,
  hidePhoneUi,
} from "../extension/phone-extension";
import {
  clearPhonePositionOverride,
  resolvePhoneOpenLifecycle,
  shouldAnimatePhoneClose,
} from "./phone-navigation-lifecycle";

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
      else clearPhonePositionOverride(slot);
      phoneSdkDebug("宿主收到打开内页请求", {
        event: "host-navigation-enter",
        appId: options.appId,
        phoneMounted: runtime.phoneMounted,
        storyMessageSessionVisible: runtime.storyMessageSessionVisible,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });
      if (runtime.storyMessageSessionVisible) {
        console.warn("[phone] openPhoneApp: 消息手机占用中，已跳过");
        phoneSdkDebug("宿主阻止打开内页", {
          reason: "story-message-session",
          appId: options.appId,
        });
        return "blocked";
      }
      activatePhoneRuntime(ctx, runtime);

      // 先发布、后挂载：首次 React render 可直接命中目标 APP，避免先画桌面再切内页。
      const navigateRequest = {
        appId: options.appId,
        seq: ++phoneNavigateSeq,
        ...(options.payload ? { payload: options.payload } : {}),
      };
      publishPhoneNavigate(navigateRequest);

      let phoneShowFailure: Promise<"failed"> | null = null;
      if (!ctx.ui.isVisible("phone")) {
        try {
          const showResult = ctx.ui.show("phone", undefined, {
            size: "(100%, 100%)",
            position: "(0, 0)",
            // 程序化打开的内页同样需要接管输入；强制来电、聊天回复等
            // 都依赖玩家点击。false 会让 Studio 把整层当作不可交互展示层。
            interactable: true,
            // 明确关闭根容器指针穿透；不能依赖宿主版本的默认值，否则来电按钮
            // 可见但点击可能继续落到底层剧情画面。
            pointerEventsPassthrough: false,
          });

          // 某些 Studio / SDK 版本会让 ui.show() 的 Promise 持续到 UI 被关闭。
          // waitUntil: "none" 若在此 await，就会形成：等待 show 结束 -> 才能关闭手机
          // -> show 永远不结束的循环，来电按钮虽已响应却无法继续调用剧情片段。
          phoneShowFailure = new Promise<"failed">((resolve) => {
            void Promise.resolve(showResult).then(() => {
              phoneSdkDebug("手机 Host 显示调用结束", {
                event: "host-ui-show-resolved",
                appId: options.appId,
                phoneUiVisible: ctx.ui.isVisible("phone"),
              });
            }, (error: unknown) => {
              clearPhoneNavigatePending(navigateRequest.seq);
              console.error("[phone] openPhoneApp: 显示手机失败", error);
              resolve("failed");
            });
          });
        } catch (error) {
          clearPhoneNavigatePending(navigateRequest.seq);
          console.error("[phone] openPhoneApp: 显示手机失败", error);
          return "failed";
        }
      }

      phoneSdkDebug("内页导航已发布", {
        event: "host-navigation-published",
        appId: options.appId,
        navigateSeq: navigateRequest.seq,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });

      return await resolvePhoneOpenLifecycle(
        options.waitUntil,
        () => waitForPhoneClosed(ctx.flow.signal),
        phoneShowFailure,
      );
    },

    async closePhoneApp(options: ClosePhoneAppOptions = {}): Promise<void> {
      if (!options.force && isPhoneCloseLocked()) return;
      clearPhonePositionOverride(getPhoneSdkSlot());
      const animated = getPhoneSdkSlot().requestAnimatedClosePhone;
      if (animated && shouldAnimatePhoneClose(options.animated)) {
        await animated(options);
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
