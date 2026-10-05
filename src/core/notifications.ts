/** Notification failures, including rejecting async listeners, cannot change persisted/domain outcomes. */
export function observeNotification(action: () => unknown): void {
  try {
    const result = action()
    if (result && typeof (result as Promise<unknown>).then === 'function') void Promise.resolve(result).catch(() => {})
  } catch { /* Presentation is independent of acceptance. */ }
}
