/**
 * Multi-Turn Conversation Context
 *
 * Tracks conversation history and resolves references like:
 * - "mach es größer" → was ist "es"?
 * - "ändere die Farbe" → welche Farbe?
 * - "der Button" → welcher Button?
 */

import type { Intent, LayoutNode } from './schema'

// =============================================================================
// Types
// =============================================================================

export interface ConversationTurn {
  /** User's request */
  userRequest: string
  /** What was changed (component names, property names) */
  affectedComponents: string[]
  /** Properties that were modified */
  affectedProperties: string[]
  /** Timestamp */
  timestamp: number
}

export interface ConversationContext {
  /** Recent conversation turns */
  turns: ConversationTurn[]
  /** Currently focused component (from selection or last modification) */
  focusedComponent: string | null
  /** Recently mentioned components */
  recentComponents: string[]
  /** Recently modified properties */
  recentProperties: string[]
  /** Maximum turns to keep */
  maxTurns: number
}

export interface ResolvedReference {
  /** The original reference text */
  original: string
  /** What it resolves to */
  resolved: string
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low'
}

// =============================================================================
// Context Management
// =============================================================================

/**
 * Creates a new conversation context
 */
export function createConversationContext(maxTurns: number = 10): ConversationContext {
  return {
    turns: [],
    focusedComponent: null,
    recentComponents: [],
    recentProperties: [],
    maxTurns
  }
}

/**
 * Adds a turn to the conversation
 */
export function addTurn(
  context: ConversationContext,
  userRequest: string,
  affectedComponents: string[],
  affectedProperties: string[]
): ConversationContext {
  const turn: ConversationTurn = {
    userRequest,
    affectedComponents,
    affectedProperties,
    timestamp: Date.now()
  }

  const newTurns = [...context.turns, turn].slice(-context.maxTurns)

  // Update recent components (keep last 5 unique)
  const allComponents = newTurns.flatMap(t => t.affectedComponents)
  const recentComponents = [...new Set(allComponents)].slice(-5)

  // Update recent properties (keep last 10 unique)
  const allProperties = newTurns.flatMap(t => t.affectedProperties)
  const recentProperties = [...new Set(allProperties)].slice(-10)

  // Update focused component to the most recently affected
  const focusedComponent = affectedComponents[0] || context.focusedComponent

  return {
    ...context,
    turns: newTurns,
    focusedComponent,
    recentComponents,
    recentProperties
  }
}

/**
 * Sets the focused component (e.g., from editor selection)
 */
export function setFocus(
  context: ConversationContext,
  componentName: string | null
): ConversationContext {
  return {
    ...context,
    focusedComponent: componentName
  }
}

// =============================================================================
// Reference Resolution
// =============================================================================

/**
 * Common reference patterns in German and English
 */
const REFERENCE_PATTERNS = {
  // Pronouns
  it: ['es', 'it', 'das', 'dies', 'dieser', 'diese', 'dieses'],
  that: ['das', 'that', 'jenes', 'jene', 'jener'],
  them: ['sie', 'them', 'diese', 'those'],

  // Articles + generic nouns
  theComponent: ['die komponente', 'the component', 'das element', 'the element'],
  theButton: ['der button', 'the button', 'den button'],
  theText: ['der text', 'the text', 'den text'],
  theCard: ['die karte', 'the card', 'die card'],
  theInput: ['das input', 'the input', 'das eingabefeld'],
  theColor: ['die farbe', 'the color', 'der farbton'],
  theSize: ['die größe', 'the size'],
  thePadding: ['das padding', 'der abstand', 'the padding', 'the spacing'],

  // Relative references
  same: ['gleich', 'same', 'dasselbe', 'dieselbe', 'the same'],
  previous: ['vorherige', 'previous', 'letzte', 'last'],
  above: ['oben', 'above', 'darüber', 'oberhalb'],
  below: ['unten', 'below', 'darunter', 'unterhalb'],
}

/**
 * Resolves references in a user request based on conversation context
 */
export function resolveReferences(
  request: string,
  context: ConversationContext,
  currentIntent: Intent
): ResolvedReference[] {
  const resolved: ResolvedReference[] = []
  const requestLower = request.toLowerCase()

  // Check for pronoun references to focused component
  for (const pronoun of REFERENCE_PATTERNS.it) {
    if (requestLower.includes(pronoun) && context.focusedComponent) {
      resolved.push({
        original: pronoun,
        resolved: context.focusedComponent,
        confidence: 'high'
      })
    }
  }

  // Check for "the button", "the text", etc.
  for (const pattern of REFERENCE_PATTERNS.theButton) {
    if (requestLower.includes(pattern)) {
      const button = findComponentByType(currentIntent, 'Button', context.recentComponents)
      if (button) {
        resolved.push({
          original: pattern,
          resolved: button,
          confidence: button === context.focusedComponent ? 'high' : 'medium'
        })
      }
    }
  }

  for (const pattern of REFERENCE_PATTERNS.theText) {
    if (requestLower.includes(pattern)) {
      const text = findComponentByType(currentIntent, 'Text', context.recentComponents)
      if (text) {
        resolved.push({
          original: pattern,
          resolved: text,
          confidence: text === context.focusedComponent ? 'high' : 'medium'
        })
      }
    }
  }

  for (const pattern of REFERENCE_PATTERNS.theCard) {
    if (requestLower.includes(pattern)) {
      const card = findComponentByType(currentIntent, 'Card', context.recentComponents)
      if (card) {
        resolved.push({
          original: pattern,
          resolved: card,
          confidence: card === context.focusedComponent ? 'high' : 'medium'
        })
      }
    }
  }

  for (const pattern of REFERENCE_PATTERNS.theInput) {
    if (requestLower.includes(pattern)) {
      const input = findComponentByType(currentIntent, 'Input', context.recentComponents)
      if (input) {
        resolved.push({
          original: pattern,
          resolved: input,
          confidence: input === context.focusedComponent ? 'high' : 'medium'
        })
      }
    }
  }

  // Check for property references
  for (const pattern of REFERENCE_PATTERNS.theColor) {
    if (requestLower.includes(pattern) && context.recentProperties.includes('background')) {
      resolved.push({
        original: pattern,
        resolved: 'background',
        confidence: 'medium'
      })
    } else if (requestLower.includes(pattern) && context.recentProperties.includes('color')) {
      resolved.push({
        original: pattern,
        resolved: 'color',
        confidence: 'medium'
      })
    }
  }

  return resolved
}

/**
 * Finds a component by type, preferring recently used ones
 */
function findComponentByType(
  intent: Intent,
  componentType: string,
  recentComponents: string[]
): string | null {
  // First check recent components
  for (const comp of recentComponents) {
    if (comp.toLowerCase().includes(componentType.toLowerCase())) {
      return comp
    }
  }

  // Then search in layout
  function searchNodes(nodes: LayoutNode[]): string | null {
    for (const node of nodes) {
      if (node.component === componentType) {
        return node.id || node.component
      }
      if (node.children) {
        const found = searchNodes(node.children)
        if (found) return found
      }
    }
    return null
  }

  return searchNodes(intent.layout)
}

// =============================================================================
// Context Enrichment
// =============================================================================

/**
 * Enriches a user request with resolved references
 */
export function enrichRequest(
  request: string,
  context: ConversationContext,
  currentIntent: Intent
): string {
  const references = resolveReferences(request, context, currentIntent)

  if (references.length === 0) {
    return request
  }

  // Build context hint
  const hints = references
    .filter(r => r.confidence !== 'low')
    .map(r => `"${r.original}" bezieht sich auf ${r.resolved}`)

  if (hints.length === 0) {
    return request
  }

  return `${request}\n\n[Kontext: ${hints.join(', ')}]`
}

/**
 * Generates conversation context for the LLM prompt
 */
export function generateConversationPrompt(context: ConversationContext): string {
  if (context.turns.length === 0) {
    return ''
  }

  const lines: string[] = ['## Konversationsverlauf']

  // Show last 3 turns
  const recentTurns = context.turns.slice(-3)
  for (const turn of recentTurns) {
    lines.push(`- "${turn.userRequest}"`)
    if (turn.affectedComponents.length > 0) {
      lines.push(`  → Geändert: ${turn.affectedComponents.join(', ')}`)
    }
  }

  // Show focused component
  if (context.focusedComponent) {
    lines.push(`\nAktuell fokussiert: ${context.focusedComponent}`)
  }

  return lines.join('\n')
}

// =============================================================================
// Change Detection
// =============================================================================

/**
 * Detects what components were affected between two intents
 */
export function detectAffectedComponents(
  oldIntent: Intent,
  newIntent: Intent
): string[] {
  const affected = new Set<string>()

  // Compare layout nodes
  function compareNodes(oldNodes: LayoutNode[], newNodes: LayoutNode[], path: string = ''): void {
    const maxLen = Math.max(oldNodes.length, newNodes.length)

    for (let i = 0; i < maxLen; i++) {
      const oldNode = oldNodes[i]
      const newNode = newNodes[i]

      if (!oldNode && newNode) {
        // Added
        affected.add(newNode.id || newNode.component)
      } else if (oldNode && !newNode) {
        // Removed
        affected.add(oldNode.id || oldNode.component)
      } else if (oldNode && newNode) {
        // Check if changed
        if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
          affected.add(newNode.id || newNode.component)
        }
        // Recurse into children
        if (oldNode.children || newNode.children) {
          compareNodes(oldNode.children || [], newNode.children || [])
        }
      }
    }
  }

  compareNodes(oldIntent.layout, newIntent.layout)

  // Compare components
  const oldCompNames = new Set(oldIntent.components.map(c => c.name))
  const newCompNames = new Set(newIntent.components.map(c => c.name))

  for (const name of newCompNames) {
    if (!oldCompNames.has(name)) {
      affected.add(name)
    }
  }

  for (const comp of newIntent.components) {
    const oldComp = oldIntent.components.find(c => c.name === comp.name)
    if (oldComp && JSON.stringify(oldComp) !== JSON.stringify(comp)) {
      affected.add(comp.name)
    }
  }

  return [...affected]
}

/**
 * Detects what properties were affected between two intents
 */
export function detectAffectedProperties(
  oldIntent: Intent,
  newIntent: Intent
): string[] {
  const affected = new Set<string>()

  // Compare tokens
  const tokenCategories = ['colors', 'spacing', 'radii', 'sizes'] as const
  for (const category of tokenCategories) {
    const oldTokens = oldIntent.tokens[category] || {}
    const newTokens = newIntent.tokens[category] || {}

    for (const key of Object.keys(newTokens)) {
      if (oldTokens[key] !== newTokens[key]) {
        affected.add(category)
        affected.add(key)
      }
    }
  }

  // Compare styles in layout
  function compareStyles(oldNodes: LayoutNode[], newNodes: LayoutNode[]): void {
    for (let i = 0; i < Math.min(oldNodes.length, newNodes.length); i++) {
      const oldStyle = oldNodes[i]?.style || {}
      const newStyle = newNodes[i]?.style || {}

      for (const key of Object.keys(newStyle)) {
        const oldVal = (oldStyle as Record<string, unknown>)[key]
        const newVal = (newStyle as Record<string, unknown>)[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          affected.add(key)
        }
      }

      if (oldNodes[i]?.children && newNodes[i]?.children) {
        compareStyles(oldNodes[i].children!, newNodes[i].children!)
      }
    }
  }

  compareStyles(oldIntent.layout, newIntent.layout)

  return [...affected]
}
