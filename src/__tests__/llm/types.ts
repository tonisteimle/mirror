/**
 * LLM Test Types
 *
 * Types for testing the LLM → React → Mirror → Edit → React workflow
 */

export type Complexity = 'simple' | 'medium' | 'hard' | 'complex'

export type CodebaseContext = 'empty' | 'with-components' | 'mixed'

/**
 * Editor context - where the user is in the code when prompting
 */
export interface EditorContext {
  // Cursor position in the code
  cursorLine: number
  cursorColumn?: number

  // Selected element (from PropertyPanel/Preview click)
  selectedNodeId?: string
  selectedNodeName?: string

  // Ancestor chain (breadcrumb path)
  ancestors?: string[]  // e.g., ["App", "Content", "Card"]

  // Surrounding code for LLM context
  surroundingCode?: {
    before: string  // Lines before cursor
    after: string   // Lines after cursor
  }

  // The component/scope the cursor is inside
  insideComponent?: string  // e.g., "Card", "ListItem"
}

export interface TestScenario {
  id: string
  name: string
  complexity: Complexity
  context: CodebaseContext

  // User's request to the LLM
  userPrompt: string

  // Existing codebase (tokens, components)
  existingCode?: string

  // Editor context - cursor position, selection, etc.
  editorContext?: EditorContext

  // System prompt additions based on context
  systemPromptAdditions?: string

  // Expected elements in the generated Mirror code
  expectedElements?: string[]

  // Expected action type based on context
  expectedAction?: 'insert' | 'modify' | 'replace' | 'wrap'

  // Property to edit after generation
  editAction?: {
    selector: string  // e.g., "Button" or "Card > Title"
    property: string  // e.g., "bg", "pad"
    newValue: string  // e.g., "#FF0000", "24"
  }

  // Validation criteria
  validation?: {
    hasTokens?: boolean
    hasComponents?: string[]
    hasProperties?: Record<string, string[]>
    minElements?: number
    insertsAt?: 'cursor' | 'inside-selected' | 'after-selected'
  }
}

export interface LLMResponse {
  react: string
  reasoning?: string
}

export interface ConversionResult {
  mirror: string
  sourceMap?: unknown
  errors?: string[]
}

export interface EditResult {
  mirror: string
  react: string
  change: {
    from: number
    to: number
    insert: string
  }
}

export interface TestResult {
  scenario: TestScenario
  llmResponse: LLMResponse
  mirrorCode: ConversionResult
  editResult?: EditResult
  validation: {
    passed: boolean
    errors: string[]
  }
  duration: number
}

// System prompts for different contexts
// Optimized for Haiku 4.5 to produce clean, semantic React/JSX
export const SYSTEM_PROMPTS = {
  base: `Generate React/JSX with COMPONENT names (not HTML tag names).

USE THESE NAMES:
- Sidebar (not aside)
- Dashboard, Card, StatCard (not div/article)
- List, ListItem (not ul/li)
- Nav, NavItem (not nav/a)
- Header, Footer (not header/footer)
- Icon, Logo, Title, Label, Value, Text, Button, Input

ROOT: Must be a component name like Sidebar, Dashboard, Card, List, Nav
CHILDREN: Use semantic names like NavItem, ListItem, StatCard

NO JAVASCRIPT: No map, filter, hooks, handlers, conditionals

EXAMPLE:
\`\`\`jsx
function Component() {
  return (
    <Sidebar style={{ width: 240, backgroundColor: '#1A1A23' }}>
      <Logo>App</Logo>
      <NavItem>Home</NavItem>
      <NavItem>Settings</NavItem>
    </Sidebar>
  )
}
\`\`\``,

  withComponents: `Generate React/JSX reusing existing components from context.

RULES:
- Reuse components and tokens from the provided context
- Match existing styling patterns
- ROOT element MUST be semantic (not <div>)
- NO JavaScript logic, hooks, or event handlers

Return ONLY the JSX function.`,

  mixed: `Generate React/JSX. Reuse existing components when available.

RULES:
- Use semantic names: Sidebar, Dashboard, Card, NavItem, etc.
- ROOT element MUST be semantic (not <div>)
- NO JavaScript logic, hooks, or event handlers
- Match existing style patterns`,

  // Template for editor context - filled in dynamically
  editorContext: `
EDITOR CONTEXT:
The user is currently editing code and their cursor/selection provides important context.

{{SELECTION_INFO}}
{{ANCESTOR_INFO}}
{{SURROUNDING_CODE}}

IMPORTANT:
- When the user says "here", "this", "add X", they refer to the current position/selection
- Generate code that fits naturally at the indicated position
- Maintain proper indentation and structure relative to the context
`,
}

/**
 * Build editor context string for system prompt
 */
export function buildEditorContextPrompt(ctx: EditorContext): string {
  const parts: string[] = []

  // Selection info
  if (ctx.selectedNodeName) {
    parts.push(`SELECTED ELEMENT: "${ctx.selectedNodeName}"`)
    if (ctx.selectedNodeId) {
      parts.push(`(Node ID: ${ctx.selectedNodeId})`)
    }
  }

  // Ancestor chain (breadcrumb)
  if (ctx.ancestors && ctx.ancestors.length > 0) {
    parts.push(`\nLOCATION IN TREE: ${ctx.ancestors.join(' → ')}${ctx.selectedNodeName ? ' → ' + ctx.selectedNodeName : ''}`)
  }

  // Inside component
  if (ctx.insideComponent) {
    parts.push(`\nINSIDE COMPONENT: The cursor is inside "${ctx.insideComponent}"`)
  }

  // Surrounding code
  if (ctx.surroundingCode) {
    parts.push(`\nSURROUNDING CODE:`)
    if (ctx.surroundingCode.before) {
      parts.push(`--- Before cursor ---\n${ctx.surroundingCode.before}`)
    }
    parts.push(`--- CURSOR POSITION (line ${ctx.cursorLine}) ---`)
    if (ctx.surroundingCode.after) {
      parts.push(`--- After cursor ---\n${ctx.surroundingCode.after}`)
    }
  }

  return SYSTEM_PROMPTS.editorContext
    .replace('{{SELECTION_INFO}}', ctx.selectedNodeName ? `Selected: "${ctx.selectedNodeName}"` : 'No element selected')
    .replace('{{ANCESTOR_INFO}}', ctx.ancestors?.length ? `Path: ${ctx.ancestors.join(' → ')}` : '')
    .replace('{{SURROUNDING_CODE}}', parts.join('\n'))
}

// Predefined token sets for testing
export const TOKEN_SETS = {
  minimal: `
$primary: #3B82F6
$surface: #1A1A23
$text: #E4E4E7
`,

  full: `
// Colors
$accent.bg: #3B82F6
$primary.hover.bg: #2563EB
$secondary.bg: #10B981
$surface.bg: #1A1A23
$elevated.bg: #27272A
$text.col: #E4E4E7
$muted.col: #71717A

// Spacing
$s.pad: 4
$m.pad: 8
$l.pad: 16
$xl.pad: 24

// Radius
$s.rad: 4
$m.rad: 8
$l.rad: 12
`,
}

// Predefined component sets for testing
export const COMPONENT_SETS = {
  basic: `
Button as button:
  pad 12 24, bg $accent.bg, rad $m.rad, col white
  hover
    bg $primary.hover.bg

Card as frame:
  pad $l.pad, bg $surface.bg, rad $l.rad

Text as text:
  col $text.col
`,

  full: `
Button as button:
  pad 12 24, bg $accent.bg, rad $m.rad, col white
  cursor pointer
  hover
    bg $primary.hover.bg

IconButton as button:
  pad $m.pad, bg transparent, rad $s.rad
  hover
    bg $elevated.bg

Card as frame:
  pad $l.pad, bg $surface.bg, rad $l.rad, gap $m.gap

Title as text:
  weight 600, font-size 18, col $text.col

Subtitle as text:
  font-size 14, col $muted.col

Badge as frame:
  pad 4 8, bg $accent.bg, rad $s.rad

Badge > Label as text:
  font-size 12, col white

List as frame:
  gap $s.gap

ListItem as frame:
  pad $m.pad, rad $s.rad, hor, spread
  cursor pointer
  hover
    bg $elevated.bg

Avatar as frame:
  w 40, h 40, rad 20, bg $elevated.bg, center

Input as input:
  pad $m.pad, bg $elevated.bg, rad $s.rad, col $text.col
  bor 1 transparent
  focus
    bor 1 $accent.bg
`,
}
