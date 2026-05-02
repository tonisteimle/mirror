/**
 * Debounce utility with cancel support.
 *
 * Used by app.ts for compile + auto-save throttling. The cancel()
 * affordance is necessary because file-switches must drop any
 * pending save targeting the previous file.
 */

export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const debounced = ((...args: A) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }) as Debounced<A>
  debounced.cancel = (): void => {
    clearTimeout(timeout)
  }
  return debounced
}
