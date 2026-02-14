/**
 * Class Name Generator
 *
 * Generates unique, collision-free CSS class names from component names.
 */

import { toKebabCase } from './utils/to-kebab-case'

/**
 * Context for tracking used class names and generating unique ones
 */
export interface ClassNameContext {
  usedNames: Map<string, number>
}

/**
 * Create a new class name context
 */
export function createClassNameContext(): ClassNameContext {
  return {
    usedNames: new Map(),
  }
}

/**
 * Generate a unique class name for a component
 *
 * @example
 * generateClassName('Box', ctx)    // 'box'
 * generateClassName('Box', ctx)    // 'box-2'
 * generateClassName('MyCard', ctx) // 'my-card'
 */
export function generateClassName(componentName: string, ctx: ClassNameContext): string {
  const base = toKebabCase(componentName)
  const count = ctx.usedNames.get(base) || 0

  ctx.usedNames.set(base, count + 1)

  if (count === 0) {
    return base
  }

  return `${base}-${count + 1}`
}

/**
 * Reset the context for a new export
 */
export function resetClassNameContext(ctx: ClassNameContext): void {
  ctx.usedNames.clear()
}
