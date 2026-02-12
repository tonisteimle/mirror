/**
 * String utility functions for the generator.
 */

/**
 * Convert kebab-case to PascalCase: "arrow-right" -> "ArrowRight"
 */
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
