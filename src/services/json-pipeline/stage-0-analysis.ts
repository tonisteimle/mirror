/**
 * Stage 0: Smart Analysis (Deterministic)
 *
 * Analyzes the prompt to understand user intent, then extracts
 * only the relevant context for optimal LLM performance.
 *
 * Steps:
 * 1. Analyze prompt → intent, UI type, capabilities
 * 2. Filter tokens → only relevant ones
 * 3. Filter components → only reusable ones
 * 4. Filter properties/states/events → only needed ones
 * 5. Format optimally → structured for LLM consumption
 */

import type {
  AnalysisContext,
  PromptAnalysis,
  PromptIntent,
  UIType,
} from './types'
import type { TokenInfo, ComponentInfo, StylePattern, CursorContext } from '../../lib/ai-context'
import { MirrorCodeIntelligence } from '../../lib/ai-context'
import {
  PROPERTIES,
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  EVENT_KEYWORDS,
  ACTION_KEYWORDS,
} from '../../dsl/properties'

// =============================================================================
// Keyword Mappings for Prompt Analysis
// =============================================================================

const UI_TYPE_KEYWORDS: Record<UIType, string[]> = {
  button: ['button', 'btn', 'schaltfläche', 'knopf', 'klick'],
  navigation: ['navigation', 'nav', 'menu', 'menü', 'sidebar', 'seitenleiste', 'link'],
  form: ['form', 'formular', 'input', 'eingabe', 'feld', 'login', 'register', 'signup'],
  list: ['list', 'liste', 'item', 'element', 'aufzählung', 'todo'],
  card: ['card', 'karte', 'box', 'container', 'panel'],
  dialog: ['dialog', 'modal', 'popup', 'overlay', 'fenster'],
  dropdown: ['dropdown', 'select', 'auswahl', 'combobox', 'picker'],
  table: ['table', 'tabelle', 'grid', 'raster', 'daten'],
  tabs: ['tab', 'tabs', 'reiter', 'segment'],
  header: ['header', 'kopfzeile', 'navbar', 'appbar', 'toolbar'],
  sidebar: ['sidebar', 'seitenleiste', 'drawer', 'aside'],
  generic: [],
}

const INTENT_KEYWORDS: Record<PromptIntent, string[]> = {
  create: ['erstell', 'bau', 'mach', 'create', 'build', 'make', 'add', 'füg', 'neu'],
  modify: ['änder', 'modif', 'change', 'update', 'edit', 'bearbeit'],
  style: ['style', 'design', 'farbe', 'color', 'aussehen', 'look', 'optik'],
  'add-behavior': ['interaktiv', 'klick', 'hover', 'animation', 'behavior', 'event'],
  layout: ['layout', 'anordnung', 'struktur', 'grid', 'flex', 'horizontal', 'vertikal'],
}

const CAPABILITY_KEYWORDS = {
  hover: ['hover', 'maus', 'mouse', 'überfahren'],
  selected: ['select', 'auswahl', 'aktiv', 'active', 'markier', 'highlight'],
  events: ['klick', 'click', 'tap', 'press', 'event', 'aktion'],
  iteration: ['liste', 'list', 'each', 'mehrere', 'multiple', 'wiederhole', 'items'],
  animation: ['animation', 'animier', 'übergang', 'transition', 'beweg'],
  icons: ['icon', 'symbol', 'zeichen', 'pfeil', 'arrow'],
  images: ['bild', 'image', 'foto', 'photo', 'grafik'],
  inputs: ['input', 'eingabe', 'feld', 'field', 'text', 'formular'],
}

// =============================================================================
// Component Suggestions per UI Type
// =============================================================================

const UI_TYPE_COMPONENTS: Record<UIType, string[]> = {
  button: ['Box', 'Text', 'Icon'],
  navigation: ['Box', 'Text', 'Icon', 'Link'],
  form: ['Box', 'Text', 'Input', 'Button', 'Textarea'],
  list: ['Box', 'Text', 'Icon'],
  card: ['Box', 'Text', 'Image', 'Button'],
  dialog: ['Box', 'Text', 'Button', 'Icon'],
  dropdown: ['Box', 'Text', 'Icon', 'Input'],
  table: ['Box', 'Text'],
  tabs: ['Box', 'Text', 'Icon'],
  header: ['Box', 'Text', 'Icon', 'Button', 'Image'],
  sidebar: ['Box', 'Text', 'Icon', 'Link'],
  generic: ['Box', 'Text', 'Icon', 'Button'],
}

// =============================================================================
// Property Categories per UI Type
// =============================================================================

const UI_TYPE_PROPERTY_CATEGORIES: Record<UIType, string[]> = {
  button: ['layout', 'spacing', 'colors', 'typography', 'border', 'cursor'],
  navigation: ['layout', 'spacing', 'colors', 'typography', 'states'],
  form: ['layout', 'spacing', 'colors', 'typography', 'border', 'sizing'],
  list: ['layout', 'spacing', 'colors', 'states'],
  card: ['layout', 'spacing', 'colors', 'border', 'shadow'],
  dialog: ['layout', 'spacing', 'colors', 'border', 'shadow', 'sizing'],
  dropdown: ['layout', 'spacing', 'colors', 'border', 'states', 'visibility'],
  table: ['layout', 'spacing', 'colors', 'border', 'sizing'],
  tabs: ['layout', 'spacing', 'colors', 'states'],
  header: ['layout', 'spacing', 'colors', 'sizing'],
  sidebar: ['layout', 'spacing', 'colors', 'sizing', 'states'],
  generic: ['layout', 'spacing', 'colors', 'typography'],
}

// Property name groupings
const PROPERTY_CATEGORIES: Record<string, string[]> = {
  layout: ['horizontal', 'vertical', 'center', 'spread', 'wrap', 'stacked', 'grid'],
  spacing: ['padding', 'margin', 'gap'],
  colors: ['background', 'color', 'border-color'],
  typography: ['font-size', 'weight', 'line', 'font', 'align', 'truncate'],
  border: ['border', 'radius'],
  sizing: ['width', 'height', 'min-width', 'max-width', 'grow', 'fill'],
  shadow: ['shadow', 'opacity'],
  cursor: ['cursor'],
  visibility: ['hidden', 'visible', 'opacity'],
  states: [], // States are handled separately
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze the prompt and code context to extract optimal information
 * for the generation pipeline.
 */
export function analyzeContext(
  prompt: string,
  tokensCode: string,
  componentsCode: string,
  layoutCode: string,
  cursorLine: number
): AnalysisContext {
  // Step 1: Analyze the prompt
  const promptAnalysis = analyzePrompt(prompt)

  // Combine all code for full context
  const fullCode = [tokensCode, componentsCode, layoutCode].filter(Boolean).join('\n\n')
  const intelligence = new MirrorCodeIntelligence(fullCode)

  // Step 2: Extract and filter tokens
  const allTokens = intelligence.getTokens()
  const tokens = filterTokens(allTokens, promptAnalysis)

  // Step 3: Extract and filter components
  const allComponents = intelligence.getComponents()
  const components = filterComponents(allComponents, promptAnalysis)

  // Step 4: Detect style patterns
  const stylePatterns = intelligence.detectStylePatterns()

  // Step 5: Cursor context
  const cursorContext = layoutCode
    ? intelligence.analyzeCursorContext(cursorLine, 0)
    : null

  // Step 6: Filter properties, states, events, actions
  const validProperties = filterProperties(promptAnalysis)
  const validStates = filterStates(promptAnalysis)
  const validEvents = filterEvents(promptAnalysis)
  const validActions = filterActions(promptAnalysis)

  // Step 7: Create optimized formatted context
  const formattedContext = formatContextForLLM(
    promptAnalysis,
    tokens,
    components,
    stylePatterns,
    cursorContext
  )

  return {
    promptAnalysis,
    tokens,
    components,
    stylePatterns,
    cursorContext,
    validProperties,
    validStates,
    validEvents,
    validActions,
    formattedContext,
  }
}

// =============================================================================
// Prompt Analysis
// =============================================================================

/**
 * Analyze the prompt to understand user intent and requirements
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
  const promptLower = prompt.toLowerCase()

  // Detect UI type
  const uiType = detectUIType(promptLower)

  // Detect intent
  const intent = detectIntent(promptLower)

  // Extract keywords
  const keywords = extractKeywords(promptLower)

  // Detect required capabilities
  const capabilities = detectCapabilities(promptLower)

  // Get suggested components
  const suggestedComponents = UI_TYPE_COMPONENTS[uiType]

  // Get relevant property categories
  const relevantPropertyCategories = UI_TYPE_PROPERTY_CATEGORIES[uiType]

  return {
    intent,
    uiType,
    keywords,
    capabilities,
    suggestedComponents,
    relevantPropertyCategories,
  }
}

function detectUIType(promptLower: string): UIType {
  // Score each UI type by keyword matches
  const scores: Record<UIType, number> = {
    button: 0, navigation: 0, form: 0, list: 0, card: 0,
    dialog: 0, dropdown: 0, table: 0, tabs: 0, header: 0,
    sidebar: 0, generic: 0,
  }

  for (const [uiType, keywords] of Object.entries(UI_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        scores[uiType as UIType] += keyword.length // Longer matches = more specific
      }
    }
  }

  // Find highest scoring type
  let maxScore = 0
  let bestType: UIType = 'generic'
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      bestType = type as UIType
    }
  }

  return bestType
}

function detectIntent(promptLower: string): PromptIntent {
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        return intent as PromptIntent
      }
    }
  }
  return 'create' // Default intent
}

function extractKeywords(promptLower: string): string[] {
  const allKeywords = [
    ...Object.values(UI_TYPE_KEYWORDS).flat(),
    ...Object.values(INTENT_KEYWORDS).flat(),
    ...Object.values(CAPABILITY_KEYWORDS).flat(),
  ]

  return allKeywords.filter(kw => promptLower.includes(kw))
}

function detectCapabilities(promptLower: string): PromptAnalysis['capabilities'] {
  const check = (category: keyof typeof CAPABILITY_KEYWORDS) =>
    CAPABILITY_KEYWORDS[category].some(kw => promptLower.includes(kw))

  return {
    needsHover: check('hover') || promptLower.includes('hover'),
    needsSelected: check('selected'),
    needsEvents: check('events'),
    needsIteration: check('iteration'),
    needsAnimation: check('animation'),
    needsIcons: check('icons'),
    needsImages: check('images'),
    needsInputs: check('inputs'),
  }
}

// =============================================================================
// Token Filtering
// =============================================================================

/**
 * Filter tokens to only include relevant ones based on prompt analysis
 */
function filterTokens(tokens: TokenInfo[], analysis: PromptAnalysis): TokenInfo[] {
  const { uiType, capabilities, relevantPropertyCategories } = analysis

  // Always include these important token types
  const priorityPatterns = [
    /primary/i,
    /surface/i,
    /background/i,
    /text/i,
    /muted/i,
  ]

  // Filter and score tokens
  const scored = tokens.map(token => {
    let score = 0
    const nameLower = token.name.toLowerCase()

    // Priority tokens get high score
    if (priorityPatterns.some(p => p.test(nameLower))) {
      score += 10
    }

    // Color tokens for visual components
    if (token.type === 'color') {
      if (relevantPropertyCategories.includes('colors')) score += 5
      if (nameLower.includes('hover')) score += 3
      if (nameLower.includes('active')) score += 3
      if (nameLower.includes('selected')) score += 3
    }

    // Spacing tokens for layout
    if (token.type === 'number') {
      if (relevantPropertyCategories.includes('spacing')) score += 4
      if (nameLower.includes('pad')) score += 2
      if (nameLower.includes('gap')) score += 2
      if (nameLower.includes('rad')) score += 2
    }

    // UI-type specific boosts
    if (uiType === 'navigation' && nameLower.includes('nav')) score += 5
    if (uiType === 'button' && nameLower.includes('button')) score += 5
    if (uiType === 'card' && nameLower.includes('card')) score += 5

    return { token, score }
  })

  // Sort by score and take top relevant ones
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20) // Limit to top 20
    .map(s => s.token)
}

// =============================================================================
// Component Filtering
// =============================================================================

/**
 * Filter components to only include relevant/reusable ones
 */
function filterComponents(components: ComponentInfo[], analysis: PromptAnalysis): ComponentInfo[] {
  const { uiType, suggestedComponents } = analysis

  // Score components by relevance
  const scored = components.map(comp => {
    let score = 0
    const nameLower = comp.name.toLowerCase()

    // Direct UI type match
    if (nameLower.includes(uiType)) score += 10

    // Suggested component base type
    if (suggestedComponents.some(sc => comp.name === sc || comp.extends === sc)) {
      score += 5
    }

    // Generic useful components
    if (['Button', 'Card', 'Input', 'Icon'].some(n => comp.name.includes(n))) {
      score += 3
    }

    // Has slots = more reusable
    if (comp.slots.length > 0) score += 2

    return { comp, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.comp)
}

// =============================================================================
// Property/State/Event Filtering
// =============================================================================

function filterProperties(analysis: PromptAnalysis): Set<string> {
  const { relevantPropertyCategories, capabilities } = analysis

  const relevantProps = new Set<string>()

  // Add properties from relevant categories
  for (const category of relevantPropertyCategories) {
    const props = PROPERTY_CATEGORIES[category] || []
    for (const prop of props) {
      relevantProps.add(prop)
    }
  }

  // Add capability-specific properties
  if (capabilities.needsIcons) {
    relevantProps.add('icon-size')
    relevantProps.add('icon-color')
  }
  if (capabilities.needsAnimation) {
    relevantProps.add('animate')
    relevantProps.add('show')
    relevantProps.add('hide')
  }

  // Always include essential properties
  const essentials = ['horizontal', 'vertical', 'padding', 'gap', 'background', 'color', 'radius']
  for (const prop of essentials) {
    relevantProps.add(prop)
  }

  return relevantProps
}

function filterStates(analysis: PromptAnalysis): Set<string> {
  const { capabilities, uiType } = analysis
  const states = new Set<string>()

  // System states based on capabilities
  if (capabilities.needsHover) states.add('hover')
  states.add('focus') // Almost always useful
  states.add('active')

  // Behavior states based on UI type
  if (capabilities.needsSelected || uiType === 'navigation' || uiType === 'tabs' || uiType === 'list') {
    states.add('selected')
  }
  if (uiType === 'dropdown' || uiType === 'dialog') {
    states.add('expanded')
    states.add('collapsed')
  }
  if (uiType === 'form') {
    states.add('valid')
    states.add('invalid')
    states.add('disabled')
  }

  return states
}

function filterEvents(analysis: PromptAnalysis): Set<string> {
  const { capabilities, uiType } = analysis
  const events = new Set<string>()

  // Basic click for most interactive elements
  if (capabilities.needsEvents || uiType !== 'generic') {
    events.add('onclick')
  }

  // Hover events
  if (capabilities.needsHover) {
    events.add('onhover')
  }

  // Form events
  if (uiType === 'form' || capabilities.needsInputs) {
    events.add('onchange')
    events.add('oninput')
    events.add('onfocus')
    events.add('onblur')
  }

  // Keyboard events for dropdowns, dialogs
  if (uiType === 'dropdown' || uiType === 'dialog') {
    events.add('onkeydown')
  }

  return events
}

function filterActions(analysis: PromptAnalysis): Set<string> {
  const { uiType, capabilities } = analysis
  const actions = new Set<string>()

  // Basic actions
  actions.add('toggle')
  actions.add('show')
  actions.add('hide')

  // Selection actions for lists, navigation, tabs
  if (uiType === 'navigation' || uiType === 'tabs' || uiType === 'list' || capabilities.needsSelected) {
    actions.add('select')
    actions.add('deselect')
    actions.add('deactivate-siblings')
    actions.add('highlight')
  }

  // Dialog/dropdown actions
  if (uiType === 'dialog' || uiType === 'dropdown') {
    actions.add('open')
    actions.add('close')
  }

  // Form actions
  if (uiType === 'form') {
    actions.add('validate')
    actions.add('reset')
    actions.add('focus')
  }

  return actions
}

// =============================================================================
// Optimized LLM Context Formatting
// =============================================================================

/**
 * Format the filtered context optimally for LLM consumption
 */
function formatContextForLLM(
  analysis: PromptAnalysis,
  tokens: TokenInfo[],
  components: ComponentInfo[],
  patterns: StylePattern[],
  cursor: CursorContext | null
): string {
  const sections: string[] = []

  // 1. Intent Summary (helps LLM understand the goal)
  sections.push(formatIntentSummary(analysis))

  // 2. Available Tokens (most important for design consistency)
  if (tokens.length > 0) {
    sections.push(formatTokensCompact(tokens))
  }

  // 3. Reusable Components (avoid reinventing)
  if (components.length > 0) {
    sections.push(formatComponentsCompact(components))
  }

  // 4. Suggested Structure (based on UI type)
  sections.push(formatSuggestedStructure(analysis))

  // 5. Required States/Events (based on capabilities)
  sections.push(formatCapabilities(analysis))

  // 6. Cursor Context (if inserting into existing code)
  if (cursor) {
    sections.push(formatCursorContext(cursor))
  }

  return sections.join('\n\n')
}

function formatIntentSummary(analysis: PromptAnalysis): string {
  const lines: string[] = ['## TASK UNDERSTANDING']

  lines.push(`UI Type: ${analysis.uiType.toUpperCase()}`)
  lines.push(`Intent: ${analysis.intent}`)

  if (analysis.capabilities.needsHover) lines.push('Requires: Hover states')
  if (analysis.capabilities.needsSelected) lines.push('Requires: Selection handling')
  if (analysis.capabilities.needsEvents) lines.push('Requires: Click events')
  if (analysis.capabilities.needsIcons) lines.push('Requires: Icons')
  if (analysis.capabilities.needsIteration) lines.push('Requires: List/iteration')

  return lines.join('\n')
}

function formatTokensCompact(tokens: TokenInfo[]): string {
  const lines: string[] = ['## DESIGN TOKENS (USE THESE!)']

  // Group by type
  const colors = tokens.filter(t => t.type === 'color')
  const numbers = tokens.filter(t => t.type === 'number')

  if (colors.length > 0) {
    lines.push('Colors: ' + colors.map(t => t.name).join(', '))
  }
  if (numbers.length > 0) {
    lines.push('Spacing: ' + numbers.map(t => t.name).join(', '))
  }

  return lines.join('\n')
}

function formatComponentsCompact(components: ComponentInfo[]): string {
  const lines: string[] = ['## EXISTING COMPONENTS (REUSE!)']

  for (const comp of components.slice(0, 5)) {
    let line = `- ${comp.name}`
    if (comp.slots.length > 0) {
      line += ` [slots: ${comp.slots.join(', ')}]`
    }
    lines.push(line)
  }

  return lines.join('\n')
}

function formatSuggestedStructure(analysis: PromptAnalysis): string {
  const lines: string[] = ['## SUGGESTED STRUCTURE']

  lines.push(`Use components: ${analysis.suggestedComponents.join(', ')}`)

  // UI-type specific suggestions
  switch (analysis.uiType) {
    case 'navigation':
      lines.push('Pattern: Box (vertical) > Box (horizontal per item) > Icon + Text')
      lines.push('States: hover, selected on each item')
      lines.push('Events: onclick: select, onclick: deactivate-siblings')
      break
    case 'button':
      lines.push('Pattern: Box (horizontal) > Icon? + Text')
      lines.push('States: hover, active, disabled')
      break
    case 'card':
      lines.push('Pattern: Box (vertical) > Image? + content area')
      lines.push('States: hover (optional)')
      break
    case 'form':
      lines.push('Pattern: Box (vertical) > labeled inputs + submit button')
      lines.push('States: focus, valid, invalid on inputs')
      break
    case 'dropdown':
      lines.push('Pattern: Box (trigger) + Box (menu, hidden)')
      lines.push('States: expanded on trigger, selected on items')
      lines.push('Events: onclick toggle, onkeydown escape: close')
      break
    case 'tabs':
      lines.push('Pattern: Box (horizontal tabs) + Box (content panels)')
      lines.push('States: selected on active tab')
      break
    default:
      lines.push('Pattern: Box with appropriate children')
  }

  return lines.join('\n')
}

function formatCapabilities(analysis: PromptAnalysis): string {
  const lines: string[] = ['## REQUIRED CAPABILITIES']

  const caps = analysis.capabilities
  const capList: string[] = []

  if (caps.needsHover) capList.push('hover state')
  if (caps.needsSelected) capList.push('selected state')
  if (caps.needsEvents) capList.push('click events')
  if (caps.needsIcons) capList.push('icons')
  if (caps.needsInputs) capList.push('input fields')
  if (caps.needsIteration) capList.push('list iteration')
  if (caps.needsAnimation) capList.push('animations')

  if (capList.length === 0) {
    capList.push('basic structure only')
  }

  lines.push('Include: ' + capList.join(', '))

  return lines.join('\n')
}

function formatCursorContext(cursor: CursorContext): string {
  const lines: string[] = ['## INSERTION CONTEXT']

  if (cursor.parent) {
    lines.push(`Inserting inside: ${cursor.parent.name}`)
  }
  lines.push(`Indent level: ${cursor.indent} spaces`)

  return lines.join('\n')
}

// =============================================================================
// Legacy Exports (for backward compatibility)
// =============================================================================

export function formatTokensForPrompt(tokens: TokenInfo[]): string {
  return formatTokensCompact(tokens)
}

export function formatComponentsForPrompt(components: ComponentInfo[]): string {
  return formatComponentsCompact(components)
}

export function formatStylePatternsForPrompt(patterns: StylePattern[]): string {
  if (patterns.length === 0) return ''

  const lines: string[] = ['## STYLE PATTERNS']
  for (const pattern of patterns.slice(0, 3)) {
    lines.push(`- ${pattern.name}: ${pattern.components.join(', ')}`)
  }
  return lines.join('\n')
}

export function formatCursorContextForPrompt(context: CursorContext | null): string {
  if (!context) return ''
  return formatCursorContext(context)
}

export function formatAnalysisForPrompt(context: AnalysisContext): string {
  return context.formattedContext
}

// Helper exports
export function extractTokenNames(tokens: TokenInfo[]): string[] {
  return tokens.map(t => t.name.replace(/^\$/, ''))
}

export function extractComponentNames(components: ComponentInfo[]): string[] {
  return components.map(c => c.name)
}

export function getValidPropertyNames(): string[] {
  return Array.from(PROPERTIES)
}

export function getValidStateNames(): string[] {
  return [...SYSTEM_STATES, ...BEHAVIOR_STATES]
}

export function getValidEventNames(): string[] {
  return Array.from(EVENT_KEYWORDS)
}

export function getValidActionNames(): string[] {
  return Array.from(ACTION_KEYWORDS)
}
