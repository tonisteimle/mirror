/**
 * @module sugar/component-type-matcher
 * @description Component Type Matcher - Zentralisierte Component-Typ-Erkennung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Erkennt Component-Typen für Sugar-Syntax-Handling
 *
 * Bestimmt Component-Kategorie basierend auf:
 * - Node-Namen (Button, Input, etc.)
 * - _primitiveType Property
 * - Namen-Suffix (SubmitButton → button)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KATEGORIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type ComponentCategory
 *   'image'      → Image-Komponenten (Image, AvatarImage)
 *   'input'      → Input-Felder (Input, SearchInput)
 *   'textarea'   → Textarea-Felder
 *   'link'       → Link-Komponenten (Link, NavLink)
 *   'item'       → List-Items (Item, MenuItem, Option)
 *   'button'     → Button-Komponenten
 *   'text'       → Text-Komponenten (Text, P, Span)
 *   'heading'    → Headings (H1-H6)
 *   'segment'    → Segment für Masked-Input
 *   'select'     → Native Select
 *   'container'  → Default für Box, Card, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TYPE CHECKER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function isImageComponent(node) → boolean
 * @function isInputComponent(node) → boolean
 * @function isTextareaComponent(node) → boolean
 * @function isLinkComponent(node) → boolean
 * @function isButtonComponent(node) → boolean
 * @function isIconComponent(node) → boolean
 * @function isItemComponent(node) → boolean
 * @function isSelectComponent(node) → boolean
 * @function isHeadingComponent(node) → boolean
 * @function isTextComponent(node) → boolean
 * @function isSegmentComponent(node) → boolean
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function getComponentCategory(node) → ComponentCategory
 *   Bestimmt Kategorie für Sugar-Handling
 *
 * @function getHeadingLevel(node) → HeadingLevel | null
 *   Gibt Heading-Level (1-6) zurück
 *
 * @function getStringPropertyForCategory(category) → string | null
 *   Gibt Default-String-Property für Kategorie zurück
 *   - image → 'src'
 *   - input/textarea/select → 'placeholder'
 *   - link → 'href'
 *   - item → null (verwendet content)
 *   - container → null (erstellt Text-Child)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Category Detection
 *   Button           → 'button'
 *   SubmitButton     → 'button' (endet mit Button)
 *   Input            → 'input'
 *   SearchInput      → 'input' (endet mit Input)
 *   Avatar           → 'container' (Default)
 *
 * @used-by handlers/string-handler.ts, handlers/dimension-handler.ts
 */

import type { ASTNode } from '../types'

/**
 * Component type categories for sugar handling.
 */
export type ComponentCategory =
  | 'image'
  | 'input'
  | 'textarea'
  | 'link'
  | 'item'
  | 'button'
  | 'text'
  | 'heading'  // H1-H6
  | 'segment'  // Masked input segment
  | 'select'   // Native select with appearance: base-select
  | 'container'

/**
 * Heading level type (1-6)
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Check if a node represents an Image component.
 */
export function isImageComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Image' ||
    node.name === 'Image' ||
    node.name.endsWith('Image')
  )
}

/**
 * Check if a node represents an Input component.
 */
export function isInputComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Input' ||
    node.name === 'Input' ||
    node.name.endsWith('Input')
  )
}

/**
 * Check if a node represents a Textarea component.
 */
export function isTextareaComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Textarea' ||
    node.name === 'Textarea' ||
    node.name.endsWith('Textarea')
  )
}

/**
 * Check if a node represents a Link component.
 */
export function isLinkComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Link' ||
    node.name === 'Link' ||
    node.name.endsWith('Link')
  )
}

/**
 * Check if a node represents a Button component.
 */
export function isButtonComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Button' ||
    node.name === 'Button' ||
    node.name.endsWith('Button')
  )
}

/**
 * Check if a node represents an Icon component.
 * Case-insensitive: matches "Icon", "icon", "SearchIcon", etc.
 */
export function isIconComponent(node: ASTNode): boolean {
  const nameLower = node.name.toLowerCase()
  return (
    node.properties._primitiveType === 'Icon' ||
    nameLower === 'icon' ||
    nameLower.endsWith('icon')
  )
}

/**
 * Check if a node represents an Item or Option component.
 */
export function isItemComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Item' ||
    node.properties._primitiveType === 'Option' ||
    node.name === 'Item' ||
    node.name.endsWith('Item') ||
    node.name === 'Option' ||
    node.name.endsWith('Option')
  )
}

/**
 * Check if a node represents a Select component.
 */
export function isSelectComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Select' ||
    node.name === 'Select' ||
    node.name.endsWith('Select')
  )
}

/**
 * Check if a node represents a Heading component (H1-H6).
 */
export function isHeadingComponent(node: ASTNode): boolean {
  const primitiveType = node.properties._primitiveType as string | undefined
  if (primitiveType && /^H[1-6]$/.test(primitiveType)) return true
  if (/^H[1-6]$/.test(node.name)) return true
  // Also match names ending with H1-H6, like "PageH1" or "CardH2"
  if (/H[1-6]$/.test(node.name)) return true
  return false
}

/**
 * Get the heading level (1-6) for a heading component.
 * Returns null if not a heading.
 */
export function getHeadingLevel(node: ASTNode): HeadingLevel | null {
  const primitiveType = node.properties._primitiveType as string | undefined

  // Check _primitiveType first
  if (primitiveType) {
    const match = primitiveType.match(/^H([1-6])$/)
    if (match) return parseInt(match[1], 10) as HeadingLevel
  }

  // Check node name
  const nameMatch = node.name.match(/H([1-6])$/)
  if (nameMatch) return parseInt(nameMatch[1], 10) as HeadingLevel

  return null
}

/**
 * Check if a node represents a Text component (including P, Span).
 */
export function isTextComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Text' ||
    node.properties._primitiveType === 'P' ||
    node.properties._primitiveType === 'Span' ||
    node.name === 'Text' ||
    node.name === 'P' ||
    node.name === 'Span' ||
    node.name.endsWith('Text')
  )
}

/**
 * Check if a node represents a Segment component (for masked input).
 */
export function isSegmentComponent(node: ASTNode): boolean {
  return (
    node.properties._primitiveType === 'Segment' ||
    node.name === 'Segment' ||
    node.name.endsWith('Segment')
  )
}

/**
 * Get the component category for a node.
 * Used for determining sugar handling behavior.
 */
export function getComponentCategory(node: ASTNode): ComponentCategory {
  if (isImageComponent(node)) return 'image'
  if (isInputComponent(node)) return 'input'
  if (isTextareaComponent(node)) return 'textarea'
  if (isLinkComponent(node)) return 'link'
  if (isButtonComponent(node)) return 'button'
  if (isItemComponent(node)) return 'item'
  if (isHeadingComponent(node)) return 'heading'
  if (isSegmentComponent(node)) return 'segment'
  if (isSelectComponent(node)) return 'select'
  if (isTextComponent(node)) return 'text'

  // Default to container for Box, Card, etc.
  return 'container'
}

/**
 * Get the default string property for a component category.
 * Returns null if strings should create text children instead.
 */
export function getStringPropertyForCategory(category: ComponentCategory): string | null {
  switch (category) {
    case 'image':
      return 'src'
    case 'input':
    case 'textarea':
    case 'select':
      return 'placeholder'
    case 'link':
      return 'href'
    case 'item':
      return null // Uses content instead of a property
    default:
      return null // Creates text child
  }
}
