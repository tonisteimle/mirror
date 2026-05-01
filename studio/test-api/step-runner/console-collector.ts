/**
 * Console error/warning collector for step scenarios.
 *
 * Hooks console.error, console.warn and window.onerror so the runner
 * can detect new entries per step. Scenarios assume `consoleClean: true`
 * by default — any unexpected error or warning fails the step it
 * appeared in, instead of silently passing because the test author
 * didn't think to assert it. Steps that legitimately emit warnings
 * (deprecations, intentional fallbacks) opt out via
 * `expect.consoleClean: 'errors-only'` or `false`.
 */

export interface ConsoleCollector {
  /** Total errors collected since install. */
  errorCount(): number
  /** Total warnings collected since install. */
  warnCount(): number
  /** Errors after a previous count (i.e. since last step). */
  errorsSince(previousCount: number): string[]
  /** Warnings after a previous count. */
  warningsSince(previousCount: number): string[]
  /** Restore original console handlers. */
  dispose(): void

  // Backwards-compatible aliases for callers that still use the
  // pre-warning API. Treat these as deprecated; new code uses
  // errorCount/warnCount/...Since explicitly.
  count(): number
}

type OnErrorFn = NonNullable<typeof window.onerror>
type OnRejectionFn = NonNullable<typeof window.onunhandledrejection>

export function installConsoleCollector(): ConsoleCollector {
  const errors: string[] = []
  const warnings: string[] = []
  const originalError = console.error
  const originalWarn = console.warn
  const originalWindowError: OnErrorFn | null = window.onerror
  const originalUnhandled: OnRejectionFn | null = window.onunhandledrejection

  console.error = (...args: unknown[]): void => {
    errors.push(args.map(stringify).join(' '))
    originalError.apply(console, args)
  }

  console.warn = (...args: unknown[]): void => {
    warnings.push(args.map(stringify).join(' '))
    originalWarn.apply(console, args)
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
    errorCount: () => errors.length,
    warnCount: () => warnings.length,
    errorsSince: (previousCount: number) => errors.slice(previousCount),
    warningsSince: (previousCount: number) => warnings.slice(previousCount),
    count: () => errors.length,
    dispose: () => {
      console.error = originalError
      console.warn = originalWarn
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
