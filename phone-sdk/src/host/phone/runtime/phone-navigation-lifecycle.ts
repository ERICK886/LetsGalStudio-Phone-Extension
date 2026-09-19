/**
 * @file phone-navigation-lifecycle.ts
 * @description 无 UI 依赖的手机打开生命周期协调逻辑。
 */

type PhoneOpenWaitMode = "none" | "close" | undefined;
type PhoneOpenLifecycleResult = "opened" | "failed";

/**
 * 根据调用方的等待模式协调手机显示失败与关闭事件。
 *
 * `none` 必须立即完成，不能等待 `ui.show()` 的 Promise；部分 SDK 版本会在
 * UI 关闭时才结束该 Promise，等待它会阻断后续的关闭手机与剧情片段调用。
 */
export async function resolvePhoneOpenLifecycle(
  waitUntil: PhoneOpenWaitMode,
  waitForClose: () => Promise<void>,
  showFailure: Promise<"failed"> | null,
): Promise<PhoneOpenLifecycleResult> {
  if (waitUntil === "none") return "opened";

  const phoneClosed = waitForClose().then(() => "opened" as const);
  return showFailure
    ? await Promise.race([phoneClosed, showFailure])
    : await phoneClosed;
}

/** `closePhoneApp` 默认播放动画，仅显式传入 `false` 时立即关闭。 */
export function shouldAnimatePhoneClose(animated: boolean | undefined): boolean {
  return animated !== false;
}

/** 普通打开或关闭手机时，清除仅属于上一次程序化打开的临时方位。 */
export function clearPhonePositionOverride(slot: {
  phonePositionOverride?: unknown;
}): void {
  delete slot.phonePositionOverride;
}
