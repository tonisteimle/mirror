/**
 * Compiler Logger
 *
 * Centralized logging for the Mirror compiler.
 * Can be configured to suppress output in production.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

interface LoggerConfig {
  level: LogLevel
  prefix?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

let globalLevel: LogLevel = 'warn'

/**
 * Set the global log level.
 * Messages below this level will be suppressed.
 */
export function setLogLevel(level: LogLevel): void {
  globalLevel = level
}

/**
 * Get the current global log level.
 */
export function getLogLevel(): LogLevel {
  return globalLevel
}

/**
 * Create a logger with a specific prefix.
 *
 * @example
 * const log = createLogger('PropertyExtractor')
 * log.warn('Node not found:', nodeId)
 * // Output: [PropertyExtractor] Node not found: abc123
 */
export function createLogger(prefix: string) {
  const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= LOG_LEVELS[globalLevel]
  }

  return {
    debug(...args: unknown[]): void {
      if (shouldLog('debug')) {
        console.log(`[${prefix}]`, ...args)
      }
    },

    info(...args: unknown[]): void {
      if (shouldLog('info')) {
        console.log(`[${prefix}]`, ...args)
      }
    },

    warn(...args: unknown[]): void {
      if (shouldLog('warn')) {
        console.warn(`[${prefix}]`, ...args)
      }
    },

    error(...args: unknown[]): void {
      if (shouldLog('error')) {
        console.error(`[${prefix}]`, ...args)
      }
    },
  }
}

// Pre-configured loggers for common modules
export const logPropertyExtractor = createLogger('PropertyExtractor')
export const logCodeModifier = createLogger('CodeModifier')
export const logSelectionManager = createLogger('SelectionManager')
export const logIR = createLogger('IR')
export const logParser = createLogger('Parser')
export const logZagTransformer = createLogger('ZagTransformer')
export const logValidator = createLogger('Validator')

// Studio module loggers
export const logBootstrap = createLogger('Bootstrap')
export const logSync = createLogger('Sync')
export const logState = createLogger('State')
export const logAgent = createLogger('Agent')
export const logPreview = createLogger('Preview')
export const logEditor = createLogger('Editor')
export const logPanel = createLogger('Panel')
export const logPicker = createLogger('Picker')
export const logRuntime = createLogger('Runtime')
