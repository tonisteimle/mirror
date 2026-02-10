/**
 * Icon utilities with caching for performance.
 */

import * as LucideIcons from 'lucide-react'
import type { ComponentType } from 'react'

// Convert kebab-case to PascalCase: "arrow-right" -> "ArrowRight"
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Cache for icon lookups to avoid repeated string transformations
const iconCache = new Map<string, ComponentType<{ size?: number; color?: string }> | null>()

/**
 * Get Lucide icon component by name (with caching).
 * @param name - kebab-case icon name (e.g., "arrow-right")
 * @returns The icon component or null if not found
 */
export function getIcon(name: string): ComponentType<{ size?: number; color?: string }> | null {
  // Check cache first
  if (iconCache.has(name)) {
    return iconCache.get(name)!
  }

  const pascalName = toPascalCase(name)
  const icon = (LucideIcons as Record<string, unknown>)[pascalName]

  // Lucide icons are ForwardRef components (objects with $$typeof)
  // Check for both function and object (React components)
  const isValidComponent = typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon)

  const result = isValidComponent
    ? icon as ComponentType<{ size?: number; color?: string }>
    : null

  // Cache the result
  iconCache.set(name, result)
  return result
}

/**
 * Clear the icon cache (useful for testing).
 */
export function clearIconCache(): void {
  iconCache.clear()
}
