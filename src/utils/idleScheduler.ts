/**
 * ─── Idle Callback & Debounce Scheduler ─────────────────────────
 * Offloads secondary derivations (headings, backlinks, flashcards)
 * to browser idle slices using requestIdleCallback with setTimeout fallback.
 */

export type CancelFn = () => void;

/**
 * Schedule a task to run after a debounce period during a browser idle slice.
 *
 * @param fn Callback function to execute when idle
 * @param timeoutMs Debounce delay before queueing idle slice (default: 350ms)
 * @param idleTimeoutMax Maximum deadline wait for requestIdleCallback (default: 250ms)
 */
export function scheduleIdle(
  fn: () => void,
  timeoutMs = 350,
  idleTimeoutMax = 250
): CancelFn {
  let timerId: any = null;
  let idleId: any = null;

  timerId = setTimeout(() => {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => {
        fn();
      }, { timeout: idleTimeoutMax });
    } else {
      fn();
    }
  }, timeoutMs);

  return () => {
    if (timerId) clearTimeout(timerId);
    if (idleId && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(idleId);
    }
  };
}
