/**
 * Centralized Logger Service
 *
 * Provides structured logging with levels and categories.
 * Debug logs are disabled in production by default.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  category: string
  message: string
  data?: unknown
  timestamp: Date
}

interface LoggerConfig {
  enabled: boolean
  minLevel: LogLevel
  categories: Set<string> | null // null means all categories
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Safely check for dev mode (works outside Vite too)
function isDev(): boolean {
  try {
    return import.meta.env?.DEV ?? false
  } catch {
    return false
  }
}

// Default config - debug disabled in production
const config: LoggerConfig = {
  enabled: true,
  minLevel: isDev() ? 'debug' : 'info',
  categories: null, // All categories enabled
}

// In-memory log buffer for debugging
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 100

function shouldLog(level: LogLevel, category: string): boolean {
  if (!config.enabled) return false
  if (LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) return false
  if (config.categories && !config.categories.has(category)) return false
  return true
}

function formatMessage(category: string, message: string): string {
  return `[${category}] ${message}`
}

function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry)
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift()
  }
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: string) {
  return {
    debug(message: string, data?: unknown) {
      if (!shouldLog('debug', category)) return
      const entry: LogEntry = { level: 'debug', category, message, data, timestamp: new Date() }
      addToBuffer(entry)
      console.debug(formatMessage(category, message), data !== undefined ? data : '')
    },

    info(message: string, data?: unknown) {
      if (!shouldLog('info', category)) return
      const entry: LogEntry = { level: 'info', category, message, data, timestamp: new Date() }
      addToBuffer(entry)
      console.info(formatMessage(category, message), data !== undefined ? data : '')
    },

    warn(message: string, data?: unknown) {
      if (!shouldLog('warn', category)) return
      const entry: LogEntry = { level: 'warn', category, message, data, timestamp: new Date() }
      addToBuffer(entry)
      console.warn(formatMessage(category, message), data !== undefined ? data : '')
    },

    error(message: string, data?: unknown) {
      if (!shouldLog('error', category)) return
      const entry: LogEntry = { level: 'error', category, message, data, timestamp: new Date() }
      addToBuffer(entry)
      console.error(formatMessage(category, message), data !== undefined ? data : '')
    },
  }
}

// Pre-configured loggers for common categories
export const logger = {
  parser: createLogger('Parser'),
  generator: createLogger('Generator'),
  ai: createLogger('AI'),
  storage: createLogger('Storage'),
  security: createLogger('Security'),
  ui: createLogger('UI'),
}

/**
 * Get the log buffer for debugging
 */
export function getLogBuffer(): readonly LogEntry[] {
  return logBuffer
}

/**
 * Clear the log buffer
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0
}

/**
 * Configure the logger
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
  Object.assign(config, options)
}

/**
 * Enable/disable debug logging
 */
export function setDebugEnabled(enabled: boolean): void {
  config.minLevel = enabled ? 'debug' : 'info'
}
