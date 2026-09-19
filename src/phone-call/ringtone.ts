/**
 * @file ringtone.ts
 * @description 强制来电期间循环播放并可靠清理作者选择的铃声素材。
 */

export const PHONE_CALL_RINGTONE_PLAYBACK_ID =
  "ink.zenly.phone-call:incoming-ringtone";

export interface PhoneCallRingtoneSound {
  play(
    uri: string,
    options?: Record<string, unknown>,
  ): Promise<void> | void;
  stop(idOrUri: string): Promise<void> | void;
}

async function stopRingtone(sound: PhoneCallRingtoneSound): Promise<void> {
  try {
    await sound.stop(PHONE_CALL_RINGTONE_PLAYBACK_ID);
  } catch (error) {
    console.warn("[phone-call] 停止来电铃声失败", error);
  }
}

/**
 * 启动循环来电铃声，并返回幂等停止函数。
 *
 * 先停止同 ID 的旧轨道，可恢复热重载遗留的铃声；清理发生在启动 Promise
 * 完成之前时，启动流程也会被取消或在完成后再次停止。
 */
export function startIncomingRingtone(
  sound: PhoneCallRingtoneSound,
  uri: string | undefined,
): () => void {
  const source = uri?.trim() ?? "";
  if (!source) return () => undefined;

  let disposed = false;
  void (async () => {
    await stopRingtone(sound);
    if (disposed) return;

    try {
      await sound.play(source, {
        id: PHONE_CALL_RINGTONE_PLAYBACK_ID,
        channel: "SE",
        loop: true,
      });
    } catch (error) {
      console.warn("[phone-call] 播放来电铃声失败", error);
    }

    if (disposed) await stopRingtone(sound);
  })();

  return () => {
    if (disposed) return;
    disposed = true;
    void stopRingtone(sound);
  };
}
