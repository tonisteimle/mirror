/**
 * @module library/defaults-loader
 * @description Lädt und cached die Default-Komponenten aus defaults.mirror
 *
 * Die Defaults werden beim ersten Zugriff geparst und gecached.
 * User-Code erbt von diesen Defaults via parentRegistry.
 */

import type { ComponentTemplate } from '../parser/types'

// Raw content of defaults.mirror (embedded at build time)
import defaultsMirrorContent from './defaults.mirror?raw'

// Cached parse result
let cachedRegistry: Map<string, ComponentTemplate> | null = null
let isLoading = false

/**
 * Get the default component registry.
 * Parses defaults.mirror on first call, then returns cached result.
 *
 * Uses dynamic import to avoid circular dependency with parser.
 */
export function getDefaultRegistry(): Map<string, ComponentTemplate> {
  if (cachedRegistry) {
    return cachedRegistry
  }

  if (isLoading) {
    // Prevent infinite recursion - return empty registry during loading
    return new Map()
  }

  isLoading = true

  try {
    // Dynamic require to break circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parse } = require('../parser/parser')

    // Parse with skipDefaults to prevent recursion
    const result = parse(defaultsMirrorContent, {
      skipDefaults: true
    })

    cachedRegistry = result.registry as Map<string, ComponentTemplate>
    return cachedRegistry!
  } finally {
    isLoading = false
  }
}

/**
 * Get the raw defaults.mirror content.
 */
export function getDefaultsContent(): string {
  return defaultsMirrorContent
}

/**
 * Clear the cached registry (useful for testing or hot reload).
 */
export function clearDefaultsCache(): void {
  cachedRegistry = null
}

/**
 * Check if defaults have been loaded.
 */
export function isDefaultsLoaded(): boolean {
  return cachedRegistry !== null
}
