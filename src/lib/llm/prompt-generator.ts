/**
 * LLM Prompt Generator
 *
 * Generates LLM prompts from reference.json - the single source of truth.
 * Ensures all prompts stay synchronized with the documentation.
 */

import referenceData from '../../../docs/reference.json'

// =============================================================================
// Types
// =============================================================================

interface ReferenceItem {
  name: string
  description: string
}

interface ReferenceSubsection {
  id: string
  title: string
  description?: string
  syntax?: string[]
  examples?: string[]
  items?: ReferenceItem[]
}

interface ReferenceSection {
  id: string
  title: string
  description?: string
  subsections?: ReferenceSubsection[]
}

interface Reference {
  version: string
  sections: ReferenceSection[]
}

const reference = referenceData as Reference

// =============================================================================
// Section Access Helpers
// =============================================================================

function getSection(id: string): ReferenceSection | undefined {
  return reference.sections.find(s => s.id === id)
}

function getSubsection(path: string): ReferenceSubsection | undefined {
  const [sectionId, subsectionId] = path.split('/')
  const section = getSection(sectionId)
  return section?.subsections?.find(s => s.id === subsectionId)
}

function getItems(path: string): ReferenceItem[] {
  return getSubsection(path)?.items || []
}

// =============================================================================
// Property Formatters
// =============================================================================

/**
 * Format properties as a compact table for prompts
 */
function formatPropertyTable(items: ReferenceItem[], format: 'table' | 'list' = 'table'): string {
  if (format === 'list') {
    return items.map(item => {
      const names = item.name.split('/').map(n => n.trim())
      return `- ${names.join(' / ')}: ${item.description}`
    }).join('\n')
  }

  // Table format
  const maxNameLen = Math.max(...items.map(i => i.name.length), 10)
  return items.map(item => {
    const paddedName = item.name.padEnd(maxNameLen)
    return `${paddedName}  ${item.description}`
  }).join('\n')
}

/**
 * Format properties as JS-style for JS Builder prompt
 */
function formatPropertyJS(items: ReferenceItem[]): string {
  return items.map(item => {
    const names = item.name.split('/').map(n => n.trim())
    const shortName = names[names.length - 1] // Use shortest alias
    return `{ ${shortName}: ... }  // ${item.description}`
  }).join('\n')
}

// =============================================================================
// Prompt Section Generators
// =============================================================================

/**
 * Generate layout properties section
 */
export function generateLayoutSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/layout')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate alignment properties section
 */
export function generateAlignmentSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/alignment')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate sizing properties section
 */
export function generateSizingSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/sizing')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate color properties section
 */
export function generateColorSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/colors')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate border properties section
 */
export function generateBorderSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/border')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate typography properties section
 */
export function generateTypographySection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/typography')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate visual properties section
 */
export function generateVisualSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/visuals')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate hover properties section
 */
export function generateHoverSection(format: 'table' | 'list' | 'js' = 'table'): string {
  const items = getItems('properties/hover-properties')
  if (format === 'js') return formatPropertyJS(items)
  return formatPropertyTable(items, format)
}

/**
 * Generate all events section
 */
export function generateEventsSection(format: 'table' | 'list' = 'table'): string {
  const items = getItems('events/basis-events')
  return formatPropertyTable(items, format)
}

/**
 * Generate keyboard events section
 */
export function generateKeyboardSection(): string {
  const subsection = getSubsection('events/keyboard-events')
  if (!subsection?.items) return ''
  return subsection.items.map(i => i.name).join(', ')
}

/**
 * Generate all actions section
 */
export function generateActionsSection(format: 'table' | 'list' = 'table'): string {
  const paths = ['actions/navigation', 'actions/selection', 'actions/state-changes', 'actions/assignments']
  const allItems: ReferenceItem[] = []
  for (const path of paths) {
    allItems.push(...getItems(path))
  }
  return formatPropertyTable(allItems, format)
}

/**
 * Generate action targets section
 */
export function generateTargetsSection(): string {
  const items = getItems('actions/targets')
  return items.map(i => i.name).join(', ')
}

/**
 * Generate system states section
 */
export function generateSystemStatesSection(): string {
  const items = getItems('states/system-states')
  return items.map(i => i.name).join(', ')
}

/**
 * Generate behavior states section
 */
export function generateBehaviorStatesSection(): string {
  const items = getItems('states/behavior-states')
  return items.map(i => i.name).join(', ')
}

/**
 * Generate primitives section
 */
export function generatePrimitivesSection(format: 'table' | 'list' = 'table'): string {
  const items = getItems('primitives/primitives-list')
  return formatPropertyTable(items, format)
}

/**
 * Generate animations section
 */
export function generateAnimationsSection(): string {
  const showHide = getItems('animations/show-hide')
  const continuous = getItems('animations/continuous')
  return `Show/Hide: ${showHide.map(i => i.name).join(', ')}
Continuous: ${continuous.map(i => i.name).join(', ')}`
}

// =============================================================================
// Compact Quick Reference
// =============================================================================

/**
 * Generate a compact quick reference for prompts (minimal tokens)
 */
export function generateQuickReference(): string {
  const quickRef = getSubsection('quick-reference/kompaktreferenz')
  if (quickRef?.syntax?.[0]) {
    return quickRef.syntax[0]
  }

  // Fallback - generate from sections
  return `SYNTAX      Component property value
            Name: = definition | Name = instance

LAYOUT      hor, ver, gap N, spread, wrap, stacked, grid N
ALIGN       left, right, hor-center, top, bottom, ver-center, center
SIZE        w N, h N, w hug/full, h hug/full, grow
SPACING     pad N, pad left/right/top/bottom N
COLOR       col (text), bg (background), boc (border-color)
BORDER      bor [width] [style] [color], rad [corners]
TYPE        fs (font-size), weight, italic, underline, truncate
VISUAL      o (opacity), shadow, hidden, disabled

STATES      hover, focus, active (indented block)
            state highlighted, state selected

EVENTS      onclick, onhover, onfocus, onblur, onchange, oninput
ACTIONS     toggle, show, hide, open, close, page
            highlight, select, activate, deactivate
TARGETS     self, next, prev, first, last, highlighted, selected

CONDITION   if $cond (indented) else (indented)
ITERATOR    each $x in $list, data Collection where $field == value

TOKENS      $name: value (definition), $name (usage)`
}

// =============================================================================
// Full Prompt Builders
// =============================================================================

/**
 * Generate comprehensive properties documentation for prompts
 */
export function generatePropertiesDocumentation(): string {
  return `## PROPERTIES (from reference.json v${reference.version})

### Layout
${generateLayoutSection('list')}

### Alignment
${generateAlignmentSection('list')}

### Sizing
${generateSizingSection('list')}

### Spacing
pad N, pad N N (vertical horizontal), pad left/right/top/bottom N

### Colors
${generateColorSection('list')}

### Border & Radius
${generateBorderSection('list')}

### Typography
${generateTypographySection('list')}

### Visual
${generateVisualSection('list')}

### Hover
${generateHoverSection('list')}`
}

/**
 * Generate events and actions documentation
 */
export function generateEventsDocumentation(): string {
  return `## EVENTS & ACTIONS

### Events
${generateEventsSection('list')}

### Keyboard Keys
${generateKeyboardSection()}

### Actions
${generateActionsSection('list')}

### Targets
${generateTargetsSection()}`
}

/**
 * Generate states documentation
 */
export function generateStatesDocumentation(): string {
  return `## STATES

### System States (automatic)
${generateSystemStatesSection()}

### Behavior States (via actions)
${generateBehaviorStatesSection()}`
}

// =============================================================================
// Prompt Template Helpers
// =============================================================================

/**
 * Build the Mirror syntax section for prompts
 */
export function buildMirrorSyntaxSection(): string {
  const grundlagen = getSubsection('grundlagen/inline-syntax')
  const syntaxLines = grundlagen?.syntax || []

  return `## MIRROR SYNTAX

\`\`\`
${syntaxLines.join('\n')}
\`\`\`

WICHTIG: Einrückung = Verschachtelung (2 Spaces), KEINE { }`
}

/**
 * Build the DRY principle section for prompts
 */
export function buildDryPrincipleSection(): string {
  return `## DRY-PRINZIP

Bei 2+ gleichen Strukturen: IMMER erst definieren, dann wiederverwenden!
\`\`\`
Field:
  Label:
  Input: w-max, pad $md.pad, bg $input.bg

Field
  Label "Name"
Field
  Label "Email"
\`\`\``
}

/**
 * Build token section for prompts
 *
 * Tokens use the Bound Property Format: $name.property
 * - Basis-Palette: Rohe Werte ($grey-800, $blue-500)
 * - Semantische Tokens: Mit Bedeutung ($primary.bg, $muted.col)
 */
export function buildTokenSection(): string {
  return `## TOKEN SYSTEM (Bound Property Format)

Zwei-Stufen-System:
1. Basis-Palette: Rohe Werte ($grey-800, $blue-500)
2. Semantische Tokens: Mit Bedeutung ($primary.bg, $muted.col)

Format: $name.property
- .bg → background
- .col → color
- .pad → padding
- .gap → gap
- .rad → radius
- .font.size → font-size

Beispiel:
\`\`\`
$grey-800: #27272A
$elevated.bg: $grey-800
$sm.pad: 4
$md.gap: 6
\`\`\`

IMMER die verfügbaren Tokens aus dem Kontext nutzen!`
}

// =============================================================================
// Export reference version for cache invalidation
// =============================================================================

export const REFERENCE_VERSION = reference.version
