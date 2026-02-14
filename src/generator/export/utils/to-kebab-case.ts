/**
 * Convert PascalCase/camelCase to kebab-case
 *
 * @example
 * toKebabCase('MyCard') // 'my-card'
 * toKebabCase('Button') // 'button'
 * toKebabCase('HTMLParser') // 'html-parser'
 */
export function toKebabCase(str: string): string {
  if (!str) return ''

  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}
