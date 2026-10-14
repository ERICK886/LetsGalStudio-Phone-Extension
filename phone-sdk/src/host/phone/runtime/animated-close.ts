/** One close operation owns both its animation timer and the asynchronous hide. */
export function createAnimatedClose(close: () => void | Promise<void>, delay: number) {
  let started = false;
  let settled = false;
  let timer: ReturnType<typeof globalThis.setTimeout>;
  let rejectClose: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((resolve, reject) => {
    rejectClose = reject;
    timer = globalThis.setTimeout(() => {
      started = true;
      void Promise.resolve().then(close).then(() => {
        settled = true;
        resolve();
      }, (error: unknown) => {
        settled = true;
        reject(error);
      });
    }, delay);
  });
  return {
    promise,
    isHiding: () => started && !settled,
    dispose() {
      // close() itself can synchronously unmount the component. Its hide Promise
      // must retain ownership of completion once that operation has started.
      if (started || settled) return;
      settled = true;
      globalThis.clearTimeout(timer);
      rejectClose(new Error("Phone close animation was interrupted by unmount"));
    },
  };
}
