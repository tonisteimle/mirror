/**
 * Code Context Extractor
 *
 * Smart extraction of relevant code context for LLM prompts.
 * Similar to how AI coding assistants work:
 * 1. Analyze user request to understand what's needed
 * 2. Find relevant code sections
 * 3. Build optimized context
 */

import type { Intent, LayoutNode, ComponentDefinition } from './schema'
import { estimateTokenCount } from './context'

// =============================================================================
// Types
// =============================================================================

export interface CodeContextOptions {
  /** Maximum tokens for context */
  maxTokens?: number
  /** Currently selected component/line in editor */
  selection?: {
    componentId?: string
    lineRange?: { start: number; end: number }
  }
  /** Recent conversation turns for reference resolution */
  recentComponents?: string[]
  /** User's request for semantic analysis */
  userRequest?: string
}

export interface CodeContext {
  /** The optimized intent to send */
  intent: Intent
  /** Components that were included */
  includedComponents: string[]
  /** Explanation of what was included and why */
  reasoning: string
  /** Estimated token count */
  tokenCount: number
}

export interface RequestAnalysis {
  /** Components mentioned in the request */
  mentionedComponents: string[]
  /** Properties mentioned (color, size, padding, etc.) */
  mentionedProperties: string[]
  /** Action type (add, change, remove, style, etc.) */
  actionType: 'add' | 'modify' | 'remove' | 'style' | 'layout' | 'event' | 'unknown'
  /** Scope (specific component, all, selection) */
  scope: 'specific' | 'all' | 'selection' | 'unknown'
}

// =============================================================================
// Request Analysis
// =============================================================================

/**
 * Analyzes a user request to understand what context is needed
 */
export function analyzeRequest(
  request: string,
  intent: Intent
): RequestAnalysis {
  const requestLower = request.toLowerCase()

  // Detect action type
  let actionType: RequestAnalysis['actionType'] = 'unknown'

  const addPatterns = ['füge', 'add', 'erstelle', 'create', 'neue', 'new', 'hinzufügen']
  const modifyPatterns = ['ändere', 'change', 'mach', 'make', 'setze', 'set', 'update']
  const removePatterns = ['entferne', 'remove', 'lösche', 'delete', 'weg']
  const stylePatterns = ['farbe', 'color', 'größe', 'size', 'padding', 'margin', 'style', 'design']
  const layoutPatterns = ['layout', 'anordnung', 'position', 'align', 'center', 'grid', 'flex']
  const eventPatterns = ['klick', 'click', 'hover', 'event', 'aktion', 'action', 'navigat']

  if (addPatterns.some(p => requestLower.includes(p))) actionType = 'add'
  else if (removePatterns.some(p => requestLower.includes(p))) actionType = 'remove'
  else if (stylePatterns.some(p => requestLower.includes(p))) actionType = 'style'
  else if (layoutPatterns.some(p => requestLower.includes(p))) actionType = 'layout'
  else if (eventPatterns.some(p => requestLower.includes(p))) actionType = 'event'
  else if (modifyPatterns.some(p => requestLower.includes(p))) actionType = 'modify'

  // Detect scope
  let scope: RequestAnalysis['scope'] = 'unknown'

  const allPatterns = ['alle', 'all', 'jede', 'every', 'überall', 'everywhere']
  const selectionPatterns = ['markiert', 'selected', 'ausgewählt', 'dieses', 'this']

  if (allPatterns.some(p => requestLower.includes(p))) {
    scope = 'all'
  } else if (selectionPatterns.some(p => requestLower.includes(p))) {
    scope = 'selection'
  }

  // Find mentioned components
  const mentionedComponents: string[] = []

  // Check component definitions
  for (const comp of intent.components) {
    if (requestLower.includes(comp.name.toLowerCase())) {
      mentionedComponents.push(comp.name)
    }
  }

  // Check layout nodes
  function checkNodes(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      const nodeName = node.id || node.component
      if (requestLower.includes(nodeName.toLowerCase())) {
        mentionedComponents.push(nodeName)
      }
      // Also check text content
      if (node.text && requestLower.includes(node.text.toLowerCase())) {
        mentionedComponents.push(nodeName)
      }
      if (node.children) {
        checkNodes(node.children)
      }
    }
  }
  checkNodes(intent.layout)

  // Check for common component types
  const commonTypes = ['button', 'text', 'card', 'input', 'image', 'box', 'header', 'footer', 'nav', 'menu']
  for (const type of commonTypes) {
    if (requestLower.includes(type)) {
      // Find first matching component of this type
      const match = findComponentOfType(intent, type)
      if (match && !mentionedComponents.includes(match)) {
        mentionedComponents.push(match)
        scope = 'specific'
      }
    }
  }

  if (mentionedComponents.length > 0 && scope === 'unknown') {
    scope = 'specific'
  }

  // Find mentioned properties
  const mentionedProperties: string[] = []

  const propertyPatterns: Record<string, string[]> = {
    background: ['hintergrund', 'background', 'bg', 'farbe', 'color'],
    color: ['textfarbe', 'text color', 'schriftfarbe'],
    padding: ['padding', 'innenabstand', 'polsterung'],
    margin: ['margin', 'außenabstand', 'abstand'],
    radius: ['radius', 'rundung', 'ecken', 'corners'],
    fontSize: ['schriftgröße', 'font size', 'textgröße', 'größe', 'size'],
    fontWeight: ['fett', 'bold', 'weight', 'gewicht'],
    width: ['breite', 'width'],
    height: ['höhe', 'height'],
    gap: ['gap', 'abstand', 'zwischenraum'],
    shadow: ['schatten', 'shadow'],
    opacity: ['transparenz', 'opacity', 'durchsichtig'],
  }

  for (const [prop, patterns] of Object.entries(propertyPatterns)) {
    if (patterns.some(p => requestLower.includes(p))) {
      mentionedProperties.push(prop)
    }
  }

  return {
    mentionedComponents,
    mentionedProperties,
    actionType,
    scope
  }
}

/**
 * Finds a component of a given type in the intent
 */
function findComponentOfType(intent: Intent, type: string): string | null {
  const typeLower = type.toLowerCase()

  // Check component definitions
  for (const comp of intent.components) {
    if (comp.name.toLowerCase().includes(typeLower)) {
      return comp.name
    }
  }

  // Check layout nodes
  function searchNodes(nodes: LayoutNode[]): string | null {
    for (const node of nodes) {
      if (node.component.toLowerCase().includes(typeLower)) {
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
// Context Building
// =============================================================================

/**
 * Builds optimized code context for an LLM request
 */
export function buildCodeContext(
  intent: Intent,
  options: CodeContextOptions = {}
): CodeContext {
  const {
    maxTokens = 4000,
    selection,
    recentComponents = [],
    userRequest = ''
  } = options

  // Analyze the request
  const analysis = userRequest ? analyzeRequest(userRequest, intent) : null

  // Start with full intent
  const contextIntent = JSON.parse(JSON.stringify(intent)) as Intent
  let includedComponents: string[] = []
  let reasoning = ''

  const fullTokens = estimateTokenCount(intent)

  // If under limit, include everything
  if (fullTokens <= maxTokens) {
    reasoning = 'Vollständiger Kontext (unter Token-Limit)'
    includedComponents = extractAllComponentNames(intent)
    return {
      intent: contextIntent,
      includedComponents,
      reasoning,
      tokenCount: fullTokens
    }
  }

  // Otherwise, build focused context
  const focusedNodes: LayoutNode[] = []
  const focusedComponents: ComponentDefinition[] = []

  // 1. Include selected component
  if (selection?.componentId) {
    const node = findNodeById(intent.layout, selection.componentId)
    if (node) {
      focusedNodes.push(node)
      includedComponents.push(selection.componentId)
      reasoning += `Selektiert: ${selection.componentId}. `
    }
  }

  // 2. Include mentioned components
  if (analysis?.mentionedComponents.length) {
    for (const compName of analysis.mentionedComponents) {
      // Add from layout
      const node = findNodeById(intent.layout, compName) ||
                   findNodeByComponent(intent.layout, compName)
      if (node && !focusedNodes.includes(node)) {
        focusedNodes.push(node)
        includedComponents.push(compName)
      }

      // Add from component definitions
      const compDef = intent.components.find(c => c.name === compName)
      if (compDef && !focusedComponents.includes(compDef)) {
        focusedComponents.push(compDef)
      }
    }
    reasoning += `Erwähnt: ${analysis.mentionedComponents.join(', ')}. `
  }

  // 3. Include recent components
  for (const compName of recentComponents.slice(0, 3)) {
    const node = findNodeById(intent.layout, compName) ||
                 findNodeByComponent(intent.layout, compName)
    if (node && !focusedNodes.includes(node)) {
      focusedNodes.push(node)
      if (!includedComponents.includes(compName)) {
        includedComponents.push(compName)
      }
    }
  }

  // 4. For "add" actions, include relevant context
  if (analysis?.actionType === 'add') {
    // Include parent containers for context
    if (focusedNodes.length === 0 && intent.layout.length > 0) {
      focusedNodes.push(intent.layout[0])
      reasoning += 'Container für neues Element. '
    }
  }

  // 5. For "all" scope, include summary
  if (analysis?.scope === 'all') {
    reasoning += 'Alle Elemente betroffen - vollständiger Kontext. '
    return {
      intent: contextIntent,
      includedComponents: extractAllComponentNames(intent),
      reasoning,
      tokenCount: fullTokens
    }
  }

  // Build reduced intent
  const reducedIntent: Intent = {
    tokens: extractReferencedTokens(focusedNodes, intent.tokens),
    components: focusedComponents.length > 0 ? focusedComponents : intent.components.slice(0, 5),
    layout: focusedNodes.length > 0 ? focusedNodes : intent.layout.slice(0, 3)
  }

  const reducedTokens = estimateTokenCount(reducedIntent)

  return {
    intent: reducedIntent,
    includedComponents,
    reasoning: reasoning || 'Reduzierter Kontext basierend auf Relevanz',
    tokenCount: reducedTokens
  }
}

/**
 * Finds a node by ID
 */
function findNodeById(nodes: LayoutNode[], id: string): LayoutNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Finds a node by component type
 */
function findNodeByComponent(nodes: LayoutNode[], component: string): LayoutNode | null {
  for (const node of nodes) {
    if (node.component === component) return node
    if (node.children) {
      const found = findNodeByComponent(node.children, component)
      if (found) return found
    }
  }
  return null
}

/**
 * Extracts all component names from an intent
 */
function extractAllComponentNames(intent: Intent): string[] {
  const names: string[] = []

  // From definitions
  for (const comp of intent.components) {
    names.push(comp.name)
  }

  // From layout
  function addFromNodes(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      names.push(node.id || node.component)
      if (node.children) addFromNodes(node.children)
    }
  }
  addFromNodes(intent.layout)

  return [...new Set(names)]
}

/**
 * Extracts only tokens that are referenced by the given nodes
 */
function extractReferencedTokens(
  nodes: LayoutNode[],
  allTokens: Intent['tokens']
): Intent['tokens'] {
  const referencedTokenNames = new Set<string>()

  function extractFromNodes(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      if (node.style) {
        for (const value of Object.values(node.style)) {
          if (typeof value === 'string' && value.startsWith('$')) {
            referencedTokenNames.add(value.slice(1))
          }
        }
      }
      if (node.children) {
        extractFromNodes(node.children)
      }
    }
  }

  extractFromNodes(nodes)

  // Build reduced tokens
  const result: Intent['tokens'] = {
    colors: {},
    spacing: {},
    radii: {},
    sizes: {}
  }

  for (const name of referencedTokenNames) {
    if (allTokens.colors?.[name]) result.colors![name] = allTokens.colors[name]
    if (allTokens.spacing?.[name]) result.spacing![name] = allTokens.spacing[name]
    if (allTokens.radii?.[name]) result.radii![name] = allTokens.radii[name]
    if (allTokens.sizes?.[name]) result.sizes![name] = allTokens.sizes[name]
  }

  return result
}

// =============================================================================
// Prompt Building with Context
// =============================================================================

/**
 * Builds a complete prompt with optimized context
 */
export function buildContextAwarePrompt(
  intent: Intent,
  userRequest: string,
  options: CodeContextOptions & {
    conversationContext?: string
    historyContext?: string
  } = {}
): { systemPrompt: string; userPrompt: string; context: CodeContext } {
  const { conversationContext, historyContext, ...contextOptions } = options

  // Build optimized code context
  const context = buildCodeContext(intent, {
    ...contextOptions,
    userRequest
  })

  // Build system prompt sections
  const systemParts: string[] = []

  // Add conversation context if available
  if (conversationContext) {
    systemParts.push(conversationContext)
  }

  // Add history context if available
  if (historyContext) {
    systemParts.push(historyContext)
  }

  // Add context reasoning
  if (context.reasoning) {
    systemParts.push(`## Kontext-Info\n${context.reasoning}\nToken-Budget: ${context.tokenCount}/${options.maxTokens || 4000}`)
  }

  const additionalContext = systemParts.length > 0 ? '\n\n' + systemParts.join('\n\n') : ''

  return {
    systemPrompt: additionalContext,
    userPrompt: userRequest,
    context
  }
}
