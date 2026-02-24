/**
 * Icon utilities with caching for performance.
 */

import * as LucideIcons from 'lucide-react'
import * as PhosphorIcons from '@phosphor-icons/react'
import type { ComponentType } from 'react'

// Convert kebab-case to PascalCase: "arrow-right" -> "ArrowRight"
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Icon props (shared between Lucide and Phosphor)
export interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number  // Lucide only
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'  // Phosphor only
}

// Legacy alias for backwards compatibility
export type LucideIconProps = IconProps

// Cache for icon lookups to avoid repeated string transformations
const lucideCache = new Map<string, ComponentType<IconProps> | null>()
const phosphorCache = new Map<string, ComponentType<IconProps> | null>()

/**
 * Get Lucide icon component by name (with caching).
 * @param name - kebab-case icon name (e.g., "arrow-right")
 * @returns The icon component or null if not found
 */
export function getIcon(name: string): ComponentType<IconProps> | null {
  // Check cache first
  if (lucideCache.has(name)) {
    return lucideCache.get(name)!
  }

  const pascalName = toPascalCase(name)
  const icon = (LucideIcons as Record<string, unknown>)[pascalName]

  // Lucide icons are ForwardRef components (objects with $$typeof)
  // Check for both function and object (React components)
  const isValidComponent = typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon)

  const result = isValidComponent
    ? icon as ComponentType<IconProps>
    : null

  // Cache the result
  lucideCache.set(name, result)
  return result
}

/**
 * Get Phosphor icon component by name (with caching).
 * @param name - PascalCase icon name (e.g., "ArrowRight" or "House")
 * @returns The icon component or null if not found
 */
export function getPhosphorIcon(name: string): ComponentType<IconProps> | null {
  // Check cache first
  if (phosphorCache.has(name)) {
    return phosphorCache.get(name)!
  }

  // Phosphor icons are already PascalCase, but handle kebab-case input too
  const pascalName = name.includes('-') ? toPascalCase(name) : name
  const icon = (PhosphorIcons as Record<string, unknown>)[pascalName]

  // Phosphor icons are ForwardRef components
  const isValidComponent = typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon)

  const result = isValidComponent
    ? icon as ComponentType<IconProps>
    : null

  // Cache the result
  phosphorCache.set(name, result)
  return result
}

/**
 * Clear the icon cache (useful for testing).
 */
export function clearIconCache(): void {
  lucideCache.clear()
  phosphorCache.clear()
}
