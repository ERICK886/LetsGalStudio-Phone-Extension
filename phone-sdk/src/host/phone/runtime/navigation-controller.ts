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
  clearPhonePositionOverride,
  resolvePhoneOpenLifecycle,
  shouldAnimatePhoneClose,
} from "./phone-navigation-lifecycle";

export interface PhoneNavigationRuntime {
  getState(): { phoneMounted: boolean; storyMessageSessionVisible: boolean };
  activate(): void;
  hide(): Promise<void>;
}

export function createNavigationController(
  ctx: ExtensionContext,
  signal: AbortSignal,
  runtime: PhoneNavigationRuntime,
): PhoneNavigationController {
  return {
    async openPhoneApp(
      options: OpenPhoneAppOptions,
    ): Promise<OpenPhoneAppResult> {
      if (signal.aborted) return "unavailable";
      const state = runtime.getState();
      const slot = getPhoneSdkSlot();
      if (options.position) slot.phonePositionOverride = options.position;
      else clearPhonePositionOverride(slot);
      phoneSdkDebug("宿主收到打开内页请求", {
        event: "host-navigation-enter",
        appId: options.appId,
        phoneMounted: state.phoneMounted,
        storyMessageSessionVisible: state.storyMessageSessionVisible,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });
      if (state.storyMessageSessionVisible) {
        console.warn("[phone] openPhoneApp: 消息手机占用中，已跳过");
        phoneSdkDebug("宿主阻止打开内页", {
          reason: "story-message-session",
          appId: options.appId,
        });
        return "blocked";
      }
      runtime.activate();

      // 先发布、后挂载：首次 React render 可直接命中目标 APP，避免先画桌面再切内页。
      const navigateRequest = {
        appId: options.appId,
        seq: slot.phoneNavigateSequence = (slot.phoneNavigateSequence ?? 0) + 1,
        ...(options.payload ? { payload: options.payload } : {}),
      };
      publishPhoneNavigate(navigateRequest, ctx.flow.signal);

      let failShow: () => void = () => undefined;
      const phoneShowFailure = new Promise<"failed">((resolve) => { failShow = () => resolve("failed"); });
      // Subscribe before show: a synchronous close must not be missed.
      const completion = resolvePhoneOpenLifecycle(
        options.waitUntil,
        (waitSignal) => waitForPhoneClosed(waitSignal, ctx.flow.signal),
        phoneShowFailure,
        signal,
      );
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
          {
            void Promise.resolve(showResult).then(() => {
              phoneSdkDebug("手机 Host 显示调用结束", {
                event: "host-ui-show-resolved",
                appId: options.appId,
                phoneUiVisible: ctx.ui.isVisible("phone"),
              });
            }, (error: unknown) => {
              clearPhoneNavigatePending(navigateRequest.seq);
              console.error("[phone] openPhoneApp: 显示手机失败", error);
              failShow();
            });
          }
        } catch (error) {
          clearPhoneNavigatePending(navigateRequest.seq);
          console.error("[phone] openPhoneApp: 显示手机失败", error);
          failShow();
          return "failed";
        }
      }

      phoneSdkDebug("内页导航已发布", {
        event: "host-navigation-published",
        appId: options.appId,
        navigateSeq: navigateRequest.seq,
        phoneUiVisible: ctx.ui.isVisible("phone"),
      });

      return await completion;
    },

    async closePhoneApp(options: ClosePhoneAppOptions = {}): Promise<void> {
      if (signal.aborted) return;
      if (!options.force && isPhoneCloseLocked()) return;
      clearPhonePositionOverride(getPhoneSdkSlot());
      const animated = getPhoneSdkSlot().requestAnimatedClosePhone;
      if (animated && getPhoneSdkSlot().animatedCloseSignal === ctx.flow.signal && shouldAnimatePhoneClose(options.animated)) {
        await animated(options);
        return;
      }

      if (!ctx.ui.isVisible("phone")) { emitPhoneClosed(ctx.flow.signal); return; }

      try {
        await runtime.hide();
      } catch (error) {
        console.error("[phone] closePhoneApp: 隐藏手机失败", error);
        throw error;
      } finally {
        emitPhoneClosed(ctx.flow.signal);
      }
    },
  };
}
