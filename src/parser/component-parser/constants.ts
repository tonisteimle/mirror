/**
 * @module component-parser/constants
 * @description Konstanten für Component-Parser Module
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HTML PRIMITIVES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @constant HTML_PRIMITIVES
 *   Keywords für HTML-Primitives die Named-Instance-Syntax unterstützen
 *
 * @list Image, Input, Textarea, Link, Button, Segment
 *
 * @syntax Pattern: PrimitiveType InstanceName: props
 *   Input Email: "placeholder" type email
 *   Image Avatar: 48 48 radius 24
 *   Button Submit: "Submit" background #3B82F6
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERIC CONTAINERS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @constant GENERIC_CONTAINERS
 *   Container-Komponenten die NICHT implizit vererben
 *
 * @list Box, Container, Wrapper, Group, Row, Column, Stack, View
 *
 * @behavior
 *   Normale Components: Erste Verwendung definiert, weitere erben
 *   Generic Containers: Keine implizite Template-Erstellung
 *
 * @example
 *   Box 200 padding 16     // Kein Template erstellt
 *   Box 300 padding 8      // Unabhängige Instanz
 *
 *   Card padding 16        // Template erstellt
 *   Card padding 8         // Erbt von Card Template
 */

/**
 * HTML Primitive keywords that need special handling for named instances.
 * These primitives support both patterns:
 * - OLD: Input Email: "placeholder"
 * - NEW: Email as Input "placeholder" (define + render)
 *
 * Box and Text are included for explicit typing:
 * - Container as Box bg #333 (explicit box type)
 * - Label as Text size 14 (text primitive)
 */
export const HTML_PRIMITIVES = ['Box', 'Text', 'Icon', 'Image', 'Input', 'Textarea', 'Link', 'Button', 'Segment', 'Select', 'Option']

/**
 * Generic containers that should NOT inherit implicitly.
 * When these are used without explicit definition, they don't create templates.
 */
export const GENERIC_CONTAINERS = ['Box', 'Container', 'Wrapper', 'Group', 'Row', 'Col', 'Column', 'Stack', 'View']

/**
 * All built-in components (Source of Truth for validation).
 * This is the comprehensive list of all components that don't need to be defined.
 *
 * Note: Only include true primitives and generic containers here.
 * Components like Card, Header, Footer are typically user-defined with custom styling.
 */
export const BUILT_IN_COMPONENTS = new Set([
  // HTML Primitives
  ...HTML_PRIMITIVES,
  // Generic Containers
  ...GENERIC_CONTAINERS,
  // Layout helpers
  'Grid',
  'Divider',
  'Spacer',
])
