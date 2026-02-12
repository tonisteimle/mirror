/**
 * Lazy Icon Component
 *
 * Loads icons dynamically to avoid bundling all lucide-react icons
 * in the main bundle. Icons are loaded on-demand and cached.
 */

import { lazy, Suspense, memo, type ComponentType } from 'react'

// Cache for loaded icon components
const iconCache = new Map<string, ComponentType<{ size?: number; color?: string }>>()

// Convert kebab-case to PascalCase: "arrow-right" -> "ArrowRight"
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

// Placeholder while icon loads
function IconPlaceholder({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: 'transparent'
      }}
    />
  )
}

/**
 * Create a lazy-loaded icon component
 */
function createLazyIcon(name: string) {
  const pascalName = toPascalCase(name)

  return lazy(async () => {
    try {
      // Dynamic import of specific icon
      const icons = await import('lucide-react')
      const IconComponent = (icons as Record<string, unknown>)[pascalName]

      if (typeof IconComponent === 'function' ||
          (typeof IconComponent === 'object' && IconComponent !== null && '$$typeof' in IconComponent)) {
        return {
          default: IconComponent as ComponentType<{ size?: number; color?: string }>
        }
      }

      // Return empty component if icon not found
      return {
        default: () => null
      }
    } catch {
      return { default: () => null }
    }
  })
}

interface LazyIconProps {
  name: string
  size?: number
  color?: string
}

/**
 * Lazy Icon Component
 *
 * Renders a Lucide icon by name, loading it dynamically.
 *
 * @example
 * <LazyIcon name="arrow-right" size={24} color="#000" />
 */
export const LazyIcon = memo(function LazyIcon({ name, size = 24, color }: LazyIconProps) {
  // Get or create cached lazy component
  let IconComponent = iconCache.get(name)

  if (!IconComponent) {
    IconComponent = createLazyIcon(name)
    iconCache.set(name, IconComponent)
  }

  return (
    <Suspense fallback={<IconPlaceholder size={size} />}>
      <IconComponent size={size} color={color} />
    </Suspense>
  )
})

/**
 * Clear the icon cache (useful for testing)
 */
export function clearLazyIconCache(): void {
  iconCache.clear()
}
