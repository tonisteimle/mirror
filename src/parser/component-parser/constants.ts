/**
 * Component Parser Constants Module
 *
 * Constants used across the component parser modules.
 */

/**
 * HTML Primitive keywords that need special handling for named instances.
 * These primitives support the pattern: Input Email: "placeholder"
 */
export const HTML_PRIMITIVES = ['Image', 'Input', 'Textarea', 'Link', 'Button', 'Segment']

/**
 * Generic containers that should NOT inherit implicitly.
 * When these are used without explicit definition, they don't create templates.
 */
export const GENERIC_CONTAINERS = ['Box', 'Container', 'Wrapper', 'Group', 'Row', 'Column', 'Stack', 'View']
