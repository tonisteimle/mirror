/**
 * Centralized Error Handling Service
 *
 * Provides consistent error handling across the application.
 * Supports logging, user notifications, and error reporting.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ErrorContext {
  /** Where the error occurred (component/function name) */
  source: string
  /** Additional context data */
  metadata?: Record<string, unknown>
}

export interface ErrorOptions {
  /** Don't log to console */
  silent?: boolean
  /** Show error dialog to user */
  showDialog?: boolean
  /** Report to external service (future) */
  report?: boolean
  /** Error severity level */
  severity?: ErrorSeverity
}

export interface AppError {
  title: string
  message: string
  details?: string
  severity: ErrorSeverity
  timestamp: Date
  source?: string
}

// Error listeners for UI components
type ErrorListener = (error: AppError) => void
const errorListeners: Set<ErrorListener> = new Set()

/**
 * Subscribe to error events (for UI components like ErrorDialog)
 */
export function onError(listener: ErrorListener): () => void {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}

/**
 * Notify all listeners of an error
 */
function notifyListeners(error: AppError): void {
  errorListeners.forEach(listener => {
    try {
      listener(error)
    } catch (e) {
      console.error('[ErrorHandler] Listener threw:', e)
    }
  })
}

/**
 * Format error for logging
 */
function formatForLog(error: Error | string, context?: ErrorContext): string {
  const message = error instanceof Error ? error.message : error
  const source = context?.source ? `[${context.source}]` : ''
  return `${source} ${message}`.trim()
}

/**
 * Handle an error with consistent logging and optional user notification
 */
export function handleError(
  error: Error | string,
  context: ErrorContext,
  options: ErrorOptions = {}
): void {
  const {
    silent = false,
    showDialog = false,
    severity = 'error',
  } = options

  const message = error instanceof Error ? error.message : error
  const details = error instanceof Error ? error.stack : undefined

  // Log to console (unless silent)
  if (!silent) {
    const logMessage = formatForLog(error, context)
    switch (severity) {
      case 'info':
        console.info(logMessage)
        break
      case 'warning':
        console.warn(logMessage)
        break
      case 'error':
      case 'critical':
        console.error(logMessage, context.metadata || '')
        break
    }
  }

  // Create app error object
  const appError: AppError = {
    title: getTitleForSeverity(severity, context.source),
    message,
    details,
    severity,
    timestamp: new Date(),
    source: context.source,
  }

  // Notify listeners (for dialog display)
  if (showDialog) {
    notifyListeners(appError)
  }
}

/**
 * Get a user-friendly title based on severity
 */
function getTitleForSeverity(severity: ErrorSeverity, source?: string): string {
  const prefix = source ? `${source}: ` : ''
  switch (severity) {
    case 'info':
      return `${prefix}Information`
    case 'warning':
      return `${prefix}Warnung`
    case 'error':
      return `${prefix}Fehler`
    case 'critical':
      return `${prefix}Kritischer Fehler`
  }
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext,
  options: ErrorOptions = {}
): (...args: T) => Promise<R | undefined> {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(
        error instanceof Error ? error : String(error),
        context,
        options
      )
      return undefined
    }
  }
}

/**
 * Log info message
 */
export function logInfo(message: string, context: ErrorContext): void {
  handleError(message, context, { severity: 'info', silent: false })
}

/**
 * Log warning message
 */
export function logWarning(message: string, context: ErrorContext): void {
  handleError(message, context, { severity: 'warning', silent: false })
}

/**
 * Show error to user
 */
export function showError(
  message: string,
  context: ErrorContext,
  details?: string
): void {
  const error = new Error(message)
  if (details) {
    error.stack = details
  }
  handleError(error, context, { showDialog: true, severity: 'error' })
}
