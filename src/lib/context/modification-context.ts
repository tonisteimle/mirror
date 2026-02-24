/**
 * Modification Context
 *
 * Provides context specifically for modifying existing code.
 * Part of Enhanced Context Provider (Increment 9).
 */

import { analyzeContext } from '../analysis/context-analyzer'
import type { CodeContext } from '../analysis/context-analyzer'
import { findConnectionPoints } from '../analysis/connection-finder'
import type { ConnectionPoint } from '../analysis/connection-finder'
import { detectPatterns } from './pattern-matcher'
import type { PatternAnalysis } from './pattern-matcher'

/**
 * Types of modifications
 */
export type ModificationType =
  | 'add-component'      // Add a new component
  | 'modify-component'   // Modify existing component
  | 'add-property'       // Add property to component
  | 'modify-property'    // Change property value
  | 'add-state'          // Add state/behavior
  | 'add-event'          // Add event handler
  | 'refactor'           // Restructure code
  | 'style-update'       // Update styling

/**
 * Context for a specific modification
 */
export interface ModificationContext {
  type: ModificationType
  target?: string                  // Component being modified
  location?: ModificationLocation  // Where in the code
  existingContext: CodeContext     // Full code context
  relevantTokens: string[]         // Tokens relevant to this modification
  relevantComponents: string[]     // Components relevant to this modification
  insertionPoints: ConnectionPoint[] // Where new code can be inserted
  constraints: ModificationConstraint[]
  suggestions: string[]            // Contextual suggestions
}

export interface ModificationLocation {
  line: number
  parent?: string
  position?: 'before' | 'after' | 'inside'
  reference?: string
}

export interface ModificationConstraint {
  type: 'naming' | 'token' | 'layout' | 'pattern'
  description: string
  required: boolean
}

/**
 * Request for modification context
 */
export interface ModificationRequest {
  code: string
  action: string          // Natural language description
  targetComponent?: string // Specific component to modify
  cursorLine?: number     // Current cursor position
}

/**
 * Analyzes a modification request and provides context
 */
export function analyzeModification(request: ModificationRequest): ModificationContext {
  const context = analyzeContext(request.code)
  const patterns = detectPatterns(context)

  // Determine modification type from action
  const type = inferModificationType(request.action)

  // Find target component
  const target = findTargetComponent(request, context)

  // Find location
  const location = findModificationLocation(request, context)

  // Get relevant tokens
  const relevantTokens = findRelevantTokens(request.action, context)

  // Get relevant components
  const relevantComponents = findRelevantComponents(request.action, context)

  // Get insertion points
  const insertionPoints = target
    ? findConnectionPoints(request.code, target)
    : []

  // Build constraints
  const constraints = buildConstraints(context, type)

  // Generate suggestions
  const suggestions = generateModificationSuggestions(type, context, patterns)

  return {
    type,
    target,
    location,
    existingContext: context,
    relevantTokens,
    relevantComponents,
    insertionPoints,
    constraints,
    suggestions
  }
}

/**
 * Infers modification type from action description
 */
function inferModificationType(action: string): ModificationType {
  const lower = action.toLowerCase()

  // Check specific patterns first (before generic add patterns)
  if (/state|zustand|hover|focus|active|disabled/i.test(lower)) {
    return 'add-state'
  }
  if (/event|onclick|onhover|onchange|oninput|handler|aktion/i.test(lower)) {
    return 'add-event'
  }

  // Add patterns
  if (/hinzufügen|add|ergänze|erstelle|create|neu/i.test(lower)) {
    if (/property|eigenschaft|attribut/i.test(lower)) return 'add-property'
    return 'add-component'
  }

  // Modify patterns
  if (/änder|change|modif|update|setz|set|mach/i.test(lower)) {
    if (/farbe|color|background|hintergrund/i.test(lower)) return 'style-update'
    if (/größe|size|width|height|breite|höhe/i.test(lower)) return 'style-update'
    if (/property|eigenschaft/i.test(lower)) return 'modify-property'
    return 'modify-component'
  }

  // Style patterns
  if (/style|styl|design|farb|color|padding|margin/i.test(lower)) {
    return 'style-update'
  }

  // Refactor patterns
  if (/refactor|umstruktur|extract|auslagern|aufteil/i.test(lower)) {
    return 'refactor'
  }

  // Default to add-component
  return 'add-component'
}

/**
 * Finds the target component for modification
 */
function findTargetComponent(
  request: ModificationRequest,
  context: CodeContext
): string | undefined {
  // Explicit target
  if (request.targetComponent) {
    return request.targetComponent
  }

  // Try to find component mentioned in action
  const action = request.action.toLowerCase()

  for (const def of context.components.definitions) {
    if (action.includes(def.name.toLowerCase())) {
      return def.name
    }
  }

  // Check slots
  for (const slot of context.components.slotNames) {
    if (action.includes(slot.toLowerCase())) {
      return slot
    }
  }

  // Check layout sections
  for (const section of context.layout.sections) {
    if (action.includes(section.toLowerCase())) {
      return section
    }
  }

  // Use root component as fallback
  return context.layout.analysis.root?.name
}

/**
 * Finds where the modification should happen
 */
function findModificationLocation(
  request: ModificationRequest,
  context: CodeContext
): ModificationLocation | undefined {
  if (request.cursorLine !== undefined) {
    return {
      line: request.cursorLine
    }
  }

  // Try to infer from action
  const action = request.action.toLowerCase()

  // Position keywords
  if (/am anfang|first|oben|top/i.test(action)) {
    return {
      line: 0,
      position: 'before',
      parent: context.layout.analysis.root?.name
    }
  }

  if (/am ende|last|unten|bottom/i.test(action)) {
    const root = context.layout.analysis.root
    return {
      line: -1,
      position: 'inside',
      parent: root?.name
    }
  }

  // After/before specific components
  const afterMatch = action.match(/nach\s+([A-Za-z]\w*)|after\s+([A-Za-z]\w*)/i)
  if (afterMatch) {
    const ref = afterMatch[1] || afterMatch[2]
    // Find the correctly cased component name from context
    const correctRef = findCorrectCase(ref, context)
    return {
      line: -1,
      position: 'after',
      reference: correctRef
    }
  }

  const beforeMatch = action.match(/vor\s+([A-Za-z]\w*)|before\s+([A-Za-z]\w*)/i)
  if (beforeMatch) {
    const ref = beforeMatch[1] || beforeMatch[2]
    // Find the correctly cased component name from context
    const correctRef = findCorrectCase(ref, context)
    return {
      line: -1,
      position: 'before',
      reference: correctRef
    }
  }

  return undefined
}

/**
 * Finds the correct case for a component name from context
 */
function findCorrectCase(name: string, context: CodeContext): string {
  const lower = name.toLowerCase()

  // Check definitions
  for (const def of context.components.definitions) {
    if (def.name.toLowerCase() === lower) {
      return def.name
    }
  }

  // Check slots
  for (const slot of context.components.slotNames) {
    if (slot.toLowerCase() === lower) {
      return slot
    }
  }

  // Check sections
  for (const section of context.layout.sections) {
    if (section.toLowerCase() === lower) {
      return section
    }
  }

  // Return original with first letter uppercase as fallback
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Finds tokens relevant to the modification
 */
function findRelevantTokens(action: string, context: CodeContext): string[] {
  const relevant: string[] = []
  const lower = action.toLowerCase()

  // Check for color-related keywords
  if (/farbe|color|background|hintergrund|border/i.test(lower)) {
    context.tokens.categorized.colors.forEach(t => {
      relevant.push(t.name)
    })
  }

  // Check for spacing-related keywords
  if (/padding|margin|abstand|spacing|gap/i.test(lower)) {
    context.tokens.categorized.spacing.forEach(t => {
      relevant.push(t.name)
    })
  }

  // Check for radius
  if (/radius|ecke|corner|round/i.test(lower)) {
    context.tokens.categorized.radius.forEach(t => {
      relevant.push(t.name)
    })
  }

  // If no specific tokens, include primary tokens
  if (relevant.length === 0 && context.tokens.all.length > 0) {
    // Add first of each category
    if (context.tokens.categorized.colors.length > 0) {
      relevant.push(context.tokens.categorized.colors[0].name)
    }
    if (context.tokens.categorized.spacing.length > 0) {
      relevant.push(context.tokens.categorized.spacing[0].name)
    }
  }

  return relevant
}

/**
 * Finds components relevant to the modification
 */
function findRelevantComponents(action: string, context: CodeContext): string[] {
  const relevant: string[] = []
  const lower = action.toLowerCase()

  // Find mentioned components
  for (const def of context.components.definitions) {
    if (lower.includes(def.name.toLowerCase())) {
      relevant.push(def.name)

      // Also add slots of this component
      def.slots.forEach(slot => relevant.push(slot))
    }
  }

  // Add related components based on inheritance
  for (const def of context.components.definitions) {
    if (def.inheritsFrom && relevant.includes(def.inheritsFrom)) {
      relevant.push(def.name)
    }
  }

  return [...new Set(relevant)]
}

/**
 * Builds constraints for the modification
 */
function buildConstraints(
  context: CodeContext,
  type: ModificationType
): ModificationConstraint[] {
  const constraints: ModificationConstraint[] = []

  // Naming constraints
  if (context.naming.componentPrefixes.length > 0) {
    constraints.push({
      type: 'naming',
      description: `Verwende Präfix "${context.naming.componentPrefixes[0]}" für neue Komponenten`,
      required: false
    })
  }

  if (context.naming.tokenPrefixes.length > 0 &&
      (type === 'style-update' || type === 'add-property')) {
    constraints.push({
      type: 'naming',
      description: `Verwende Token-Präfix "${context.naming.tokenPrefixes[0]}"`,
      required: false
    })
  }

  // Token constraints
  if (context.tokens.hasColors && type === 'style-update') {
    constraints.push({
      type: 'token',
      description: 'Verwende existierende Farb-Tokens für Konsistenz',
      required: true
    })
  }

  // Layout constraints
  if (context.layout.rootLayout && type === 'add-component') {
    const layout = context.layout.rootLayout
    if (layout === 'horizontal') {
      constraints.push({
        type: 'layout',
        description: 'Neue Komponenten benötigen width-Angabe in horizontalem Layout',
        required: true
      })
    }
  }

  return constraints
}

/**
 * Generates suggestions for the modification
 */
function generateModificationSuggestions(
  type: ModificationType,
  context: CodeContext,
  patterns: PatternAnalysis
): string[] {
  const suggestions: string[] = []

  switch (type) {
    case 'add-component':
      if (context.components.definitions.length > 0) {
        suggestions.push(`Erwäge Vererbung von: ${context.components.definitionNames.slice(0, 3).join(', ')}`)
      }
      if (context.tokens.hasColors) {
        suggestions.push(`Verwende Farben: ${context.tokens.colorPalette.slice(0, 3).join(', ')}`)
      }
      break

    case 'add-state':
      suggestions.push('Definiere States in der Komponenten-Definition')
      suggestions.push('Nutze state-Blöcke für Zustandsänderungen')
      break

    case 'add-event':
      suggestions.push('Verwende onclick, onhover, onchange für Events')
      if (patterns.primaryPattern === 'form') {
        suggestions.push('Für Formulare: oninput, onsubmit, onvalidate')
      }
      break

    case 'style-update':
      if (context.tokens.all.length > 0) {
        suggestions.push('Nutze existierende Design-Tokens')
        suggestions.push(`Verfügbare Tokens: ${context.tokens.all.slice(0, 5).map(t => t.name).join(', ')}`)
      }
      break

    case 'refactor':
      suggestions.push('Extrahiere wiederverwendbare Komponenten als Definitionen')
      suggestions.push('Gruppiere gemeinsame Styles in Tokens')
      break
  }

  return suggestions
}

/**
 * Formats modification context for LLM prompt
 */
export function formatModificationContext(ctx: ModificationContext): string {
  const lines: string[] = ['## Modifikations-Kontext\n']

  // Modification type
  lines.push(`Typ: ${formatModificationType(ctx.type)}`)

  // Target
  if (ctx.target) {
    lines.push(`Ziel: ${ctx.target}`)
  }

  // Location
  if (ctx.location) {
    lines.push(`Position: ${formatLocation(ctx.location)}`)
  }

  // Relevant tokens
  if (ctx.relevantTokens.length > 0) {
    lines.push(`\nRelevante Tokens: ${ctx.relevantTokens.join(', ')}`)
  }

  // Relevant components
  if (ctx.relevantComponents.length > 0) {
    lines.push(`Relevante Komponenten: ${ctx.relevantComponents.join(', ')}`)
  }

  // Constraints
  if (ctx.constraints.length > 0) {
    lines.push('\nConstraints:')
    ctx.constraints.forEach(c => {
      const marker = c.required ? '!' : '-'
      lines.push(`${marker} ${c.description}`)
    })
  }

  // Suggestions
  if (ctx.suggestions.length > 0) {
    lines.push('\nEmpfehlungen:')
    ctx.suggestions.forEach(s => {
      lines.push(`- ${s}`)
    })
  }

  return lines.join('\n')
}

/**
 * Formats modification type for display
 */
function formatModificationType(type: ModificationType): string {
  const names: Record<ModificationType, string> = {
    'add-component': 'Komponente hinzufügen',
    'modify-component': 'Komponente ändern',
    'add-property': 'Property hinzufügen',
    'modify-property': 'Property ändern',
    'add-state': 'State hinzufügen',
    'add-event': 'Event hinzufügen',
    'refactor': 'Refactoring',
    'style-update': 'Styling ändern'
  }
  return names[type]
}

/**
 * Formats location for display
 */
function formatLocation(loc: ModificationLocation): string {
  const parts: string[] = []

  if (loc.position === 'before' && loc.reference) {
    parts.push(`vor ${loc.reference}`)
  } else if (loc.position === 'after' && loc.reference) {
    parts.push(`nach ${loc.reference}`)
  } else if (loc.position === 'inside' && loc.parent) {
    parts.push(`in ${loc.parent}`)
  }

  if (loc.line >= 0) {
    parts.push(`Zeile ${loc.line + 1}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'nicht spezifiziert'
}

/**
 * Quick check if modification needs validation
 */
export function needsValidation(ctx: ModificationContext): boolean {
  return ctx.constraints.some(c => c.required) ||
         ctx.type === 'refactor' ||
         (ctx.type === 'add-component' && ctx.existingContext.layout.maxDepth > 3)
}
