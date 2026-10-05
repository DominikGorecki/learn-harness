/** Presentation/log sinks may return rejecting promises despite a void signature. Never await them. */
export function observe(action: () => unknown): void {
  try {
    const result = action()
    if (result && typeof (result as Promise<unknown>).then === 'function') void Promise.resolve(result).catch(() => {})
  } catch { /* Observers cannot change inference or process acceptance. */ }
}
