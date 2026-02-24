/**
 * Intent Schema Validation with Zod
 *
 * Provides type-safe validation for LLM-generated Intent responses.
 * Uses Zod for runtime validation with full TypeScript type inference.
 */

import { z } from 'zod'
import type {
  Intent,
  TokenDefinitions,
  ComponentStyle,
  ComponentDefinition,
  LayoutNode,
  EventAction,
  Condition,
  Iterator,
  DataBinding,
  Animation,
  ElementAnimations,
  ConditionalStyle,
} from './schema'

// =============================================================================
// Token Schema
// =============================================================================

export const TokenDefinitionsSchema = z.object({
  colors: z.record(z.string(), z.string()).optional(),
  spacing: z.record(z.string(), z.number()).optional(),
  radii: z.record(z.string(), z.number()).optional(),
  sizes: z.record(z.string(), z.number()).optional(),
})

// =============================================================================
// Token Reference Schema
// =============================================================================

/**
 * Schema for token references like { type: 'token', name: 'primary' }
 * These are used when mirrorToIntent converts $primary to a structured reference.
 */
export const TokenReferenceSchema = z.object({
  type: z.literal('token'),
  name: z.string(),
})

/**
 * Schema for values that can be either a direct value or a token reference.
 */
const colorOrTokenRef = z.union([z.string(), TokenReferenceSchema])
const numberOrStringOrTokenRef = z.union([z.string(), z.number(), TokenReferenceSchema])

// =============================================================================
// Component Style Schema
// =============================================================================

// Note: This schema is more permissive than ComponentStyle interface
// because it accepts token references { type: 'token', name: string }
// which get resolved to string values during intent-to-mirror conversion.
export const ComponentStyleSchema = z.object({
  // Layout Direction
  direction: z.enum(['horizontal', 'vertical']).optional(),
  gap: z.union([z.string(), z.number()]).optional(),

  // Alignment
  alignHorizontal: z.enum(['left', 'center', 'right']).optional(),
  alignVertical: z.enum(['top', 'center', 'bottom']).optional(),
  center: z.boolean().optional(),

  // Flex Properties
  grow: z.union([z.boolean(), z.number()]).optional(),
  shrink: z.number().optional(),
  wrap: z.boolean().optional(),
  between: z.boolean().optional(),
  stacked: z.boolean().optional(),

  // Spacing
  padding: z.union([z.string(), z.number(), z.array(z.number())]).optional(),
  margin: z.union([z.string(), z.number(), z.array(z.number())]).optional(),

  // Sizing
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
  minWidth: z.union([z.string(), z.number()]).optional(),
  maxWidth: z.union([z.string(), z.number()]).optional(),
  minHeight: z.union([z.string(), z.number()]).optional(),
  maxHeight: z.union([z.string(), z.number()]).optional(),
  full: z.boolean().optional(),

  // Colors (can be direct values or token references)
  background: colorOrTokenRef.optional(),
  color: colorOrTokenRef.optional(),
  borderColor: colorOrTokenRef.optional(),

  // Border
  radius: z.union([z.string(), z.number(), z.array(z.number())]).optional(),
  border: z.union([
    z.number(),
    z.object({
      width: z.number().optional(),
      style: z.enum(['solid', 'dashed', 'dotted']).optional(),
      color: z.string().optional(),
    }),
  ]).optional(),
  borderTop: z.number().optional(),
  borderRight: z.number().optional(),
  borderBottom: z.number().optional(),
  borderLeft: z.number().optional(),

  // Typography
  fontSize: z.union([z.string(), z.number()]).optional(),
  fontWeight: z.union([z.number(), z.string()]).optional(),
  fontFamily: z.string().optional(),
  lineHeight: z.number().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  uppercase: z.boolean().optional(),
  lowercase: z.boolean().optional(),
  truncate: z.boolean().optional(),

  // Visual Effects
  shadow: z.union([z.enum(['sm', 'md', 'lg']), z.number()]).optional(),
  opacity: z.number().optional(),
  cursor: z.string().optional(),

  // Scroll
  scroll: z.enum(['vertical', 'horizontal', 'both']).optional(),
  clip: z.boolean().optional(),

  // Position
  position: z.enum(['relative', 'absolute', 'fixed']).optional(),
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
  zIndex: z.number().optional(),

  // Grid
  grid: z.union([z.number(), z.array(z.string())]).optional(),
  gridGap: z.union([z.string(), z.number()]).optional(),

  // Visibility
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),

  // Hover States (can be direct values or token references)
  hoverBackground: colorOrTokenRef.optional(),
  hoverColor: colorOrTokenRef.optional(),
  hoverScale: z.number().optional(),
  hoverOpacity: z.number().optional(),
  hoverBorderColor: colorOrTokenRef.optional(),
}).strict().partial()

// =============================================================================
// Condition Schema
// =============================================================================

const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.object({
    type: z.enum(['var', 'not', 'and', 'or', 'comparison']),
    variable: z.string().optional(),
    operand: ConditionSchema.optional(),
    left: ConditionSchema.optional(),
    right: ConditionSchema.optional(),
    operator: z.enum(['==', '!=', '>', '<', '>=', '<=']).optional(),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })
)

// =============================================================================
// Animation Schema
// =============================================================================

const AnimationSchema: z.ZodType<Animation> = z.object({
  types: z.array(z.string()),
  duration: z.number().optional(),
})

const ElementAnimationsSchema: z.ZodType<ElementAnimations> = z.object({
  show: AnimationSchema.optional(),
  hide: AnimationSchema.optional(),
  continuous: AnimationSchema.optional(),
})

// =============================================================================
// Iterator & Data Binding Schemas
// =============================================================================

const IteratorSchema: z.ZodType<Iterator> = z.object({
  itemVariable: z.string(),
  source: z.string(),
  sourcePath: z.array(z.string()).optional(),
})

const DataBindingSchema: z.ZodType<DataBinding> = z.object({
  typeName: z.string(),
  filter: ConditionSchema.optional(),
})

// =============================================================================
// Event Action Schema
// =============================================================================

const EventActionSchema: z.ZodType<EventAction> = z.object({
  action: z.enum([
    'navigate', 'page',
    'toggle', 'show', 'hide', 'open', 'close',
    'assign', 'change',
    'highlight', 'select', 'deselect', 'clear-selection',
    'activate', 'deactivate', 'deactivate-siblings', 'toggle-state',
    'filter', 'focus', 'validate', 'reset',
  ]),
  target: z.string().optional(),
  value: z.string().optional(),
  position: z.enum(['below', 'above', 'left', 'right', 'center']).optional(),
  animation: z.string().optional(),
  duration: z.number().optional(),
  condition: ConditionSchema.optional(),
})

// =============================================================================
// Conditional Style Schema
// =============================================================================

const ConditionalStyleSchema = z.object({
  condition: ConditionSchema,
  then: ComponentStyleSchema,
  else: ComponentStyleSchema.optional(),
})

// =============================================================================
// Component Definition Schema
// =============================================================================

export const ComponentDefinitionSchema = z.object({
  name: z.string(),
  base: z.string().optional(),
  style: ComponentStyleSchema,
  slots: z.array(z.string()).optional(),
  states: z.record(z.string(), ComponentStyleSchema).optional(),
})

// =============================================================================
// Layout Node Schema (Recursive)
// =============================================================================

export const LayoutNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    component: z.string(),
    id: z.string().optional(),
    text: z.string().optional(),
    style: ComponentStyleSchema.optional(),
    children: z.array(LayoutNodeSchema).optional(),

    // Slots
    slots: z.record(
      z.string(),
      z.union([LayoutNodeSchema, z.array(LayoutNodeSchema), z.string()])
    ).optional(),

    // Events
    events: z.record(z.string(), z.array(EventActionSchema)).optional(),

    // Conditional rendering
    condition: ConditionSchema.optional(),
    elseChildren: z.array(LayoutNodeSchema).optional(),

    // Conditional styles
    conditionalStyle: z.array(ConditionalStyleSchema).optional(),

    // List items
    isListItem: z.boolean().optional(),

    // Iterator
    iterator: IteratorSchema.optional(),

    // Animations
    animations: ElementAnimationsSchema.optional(),

    // Data binding
    dataBinding: DataBindingSchema.optional(),

    // Primitive-specific properties
    inputType: z.enum([
      'text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time'
    ]).optional(),
    placeholder: z.string().optional(),
    rows: z.number().optional(),
    src: z.string().optional(),
    alt: z.string().optional(),
    fit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional(),
    href: z.string().optional(),
    target: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    value: z.union([z.string(), z.number()]).optional(),
  })
)

// =============================================================================
// Full Intent Schema
// =============================================================================

export const IntentSchema = z.object({
  tokens: TokenDefinitionsSchema,
  components: z.array(ComponentDefinitionSchema),
  layout: z.array(LayoutNodeSchema),
})

// =============================================================================
// Validation Functions
// =============================================================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError['issues']
  errorMessage?: string
}

/**
 * Validate an Intent object with full error reporting.
 *
 * @param data - The data to validate
 * @returns Validation result with either the validated data or error details
 *
 * @example
 * ```typescript
 * const result = validateIntent(llmResponse)
 * if (result.success) {
 *   const intent: Intent = result.data
 *   // Use validated intent
 * } else {
 *   console.error("Validation errors:", result.errorMessage)
 * }
 * ```
 */
export function validateIntent(data: unknown): ValidationResult<Intent> {
  const result = IntentSchema.safeParse(data)

  if (result.success) {
    // Cast is safe - the schema validates the structure matches Intent
    return { success: true, data: result.data as Intent }
  }

  // Format errors for readability
  const errorMessage = result.error.issues
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('\n')

  return {
    success: false,
    errors: result.error.issues,
    errorMessage,
  }
}

/**
 * Validate a single LayoutNode.
 */
export function validateLayoutNode(data: unknown): ValidationResult<LayoutNode> {
  const result = LayoutNodeSchema.safeParse(data)

  if (result.success) {
    // Cast is safe - the schema validates the structure matches LayoutNode
    return { success: true, data: result.data as LayoutNode }
  }

  const errorMessage = result.error.issues
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('\n')

  return {
    success: false,
    errors: result.error.issues,
    errorMessage,
  }
}

/**
 * Validate token definitions.
 */
export function validateTokens(data: unknown): ValidationResult<TokenDefinitions> {
  const result = TokenDefinitionsSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errorMessage = result.error.issues
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('\n')

  return {
    success: false,
    errors: result.error.issues,
    errorMessage,
  }
}

/**
 * Validate component style.
 */
export function validateComponentStyle(data: unknown): ValidationResult<z.infer<typeof ComponentStyleSchema>> {
  const result = ComponentStyleSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errorMessage = result.error.issues
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('\n')

  return {
    success: false,
    errors: result.error.issues,
    errorMessage,
  }
}

// =============================================================================
// Parse & Validate JSON
// =============================================================================

/**
 * Parse JSON and validate as Intent in one step.
 * Handles JSON parsing errors gracefully.
 *
 * @param jsonString - The JSON string to parse and validate
 * @returns Validation result with parsed data or error
 *
 * @example
 * ```typescript
 * const result = parseAndValidateIntent(llmJsonResponse)
 * if (result.success) {
 *   // Use result.data
 * } else {
 *   // Log result.errorMessage
 * }
 * ```
 */
export function parseAndValidateIntent(jsonString: string): ValidationResult<Intent> {
  // Try to extract JSON from markdown code blocks
  const cleaned = extractJsonFromMarkdown(jsonString)

  try {
    const parsed = JSON.parse(cleaned)
    return validateIntent(parsed)
  } catch (e) {
    return {
      success: false,
      errorMessage: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/**
 * Extract JSON from markdown code blocks.
 */
function extractJsonFromMarkdown(input: string): string {
  // Try to extract from ```json ... ``` block
  const jsonMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }

  // Try to find JSON object/array
  const objectMatch = input.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    return objectMatch[0]
  }

  const arrayMatch = input.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    return arrayMatch[0]
  }

  return input.trim()
}

// =============================================================================
// Partial Validation (for streaming/incremental parsing)
// =============================================================================

/**
 * Validate partial Intent data with lenient mode.
 * Useful for streaming scenarios where data arrives incrementally.
 *
 * @param data - Partial data to validate
 * @returns Whether the data is structurally valid so far
 */
export function validatePartialIntent(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const obj = data as Record<string, unknown>

  // Check required top-level keys exist
  if (!('tokens' in obj || 'components' in obj || 'layout' in obj)) {
    return false
  }

  // Validate what we have
  if ('tokens' in obj) {
    const tokensResult = TokenDefinitionsSchema.safeParse(obj.tokens)
    if (!tokensResult.success) return false
  }

  if ('components' in obj && Array.isArray(obj.components)) {
    for (const comp of obj.components) {
      const compResult = ComponentDefinitionSchema.safeParse(comp)
      if (!compResult.success) return false
    }
  }

  return true
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a valid Intent.
 */
export function isValidIntent(data: unknown): data is Intent {
  return IntentSchema.safeParse(data).success
}

/**
 * Type guard to check if a value is a valid LayoutNode.
 */
export function isValidLayoutNode(data: unknown): data is LayoutNode {
  return LayoutNodeSchema.safeParse(data).success
}
