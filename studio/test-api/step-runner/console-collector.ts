/**
 * Console error collector for step scenarios.
 *
 * Hooks console.error and window.onerror so the runner can detect new
 * errors per step. Scenarios assume `consoleClean: true` by default —
 * any unexpected error fails the step it appeared in, instead of silently
 * passing because the test author didn't think to assert it.
 */

export interface ConsoleCollector {
  /** Total number of errors collected since install. */
  count(): number
  /** Errors collected after a given previous count (i.e. since last step). */
  errorsSince(previousCount: number): string[]
  /** Restore original console handlers. */
  dispose(): void
}

type OnErrorFn = NonNullable<typeof window.onerror>
type OnRejectionFn = NonNullable<typeof window.onunhandledrejection>

export function installConsoleCollector(): ConsoleCollector {
  const errors: string[] = []
  const originalError = console.error
  const originalWindowError: OnErrorFn | null = window.onerror
  const originalUnhandled: OnRejectionFn | null = window.onunhandledrejection

  console.error = (...args: unknown[]): void => {
    errors.push(args.map(stringify).join(' '))
    originalError.apply(console, args)
  }

  window.onerror = (message, source, lineno, colno, error): boolean | undefined => {
    errors.push(`Uncaught: ${stringify(error ?? message)}`)
    if (originalWindowError) {
      const r = originalWindowError(message, source, lineno, colno, error)
      return r === true ? true : undefined
    }
    return undefined
  }

  window.onunhandledrejection = (e: PromiseRejectionEvent): void => {
    errors.push(`Unhandled rejection: ${stringify(e.reason)}`)
    if (originalUnhandled) {
      originalUnhandled.call(window, e)
    }
  }

  return {
    count: () => errors.length,
    errorsSince: (previousCount: number) => errors.slice(previousCount),
    dispose: () => {
      console.error = originalError
      window.onerror = originalWindowError
      window.onunhandledrejection = originalUnhandled
    },
  }
}

function stringify(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
