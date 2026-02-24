/**
 * Quick Actions
 *
 * Provides quick actions and code actions for the editor.
 * Part of Editor Integration (Increment 26).
 */

import { analyzeContext } from '../analysis/context-analyzer'
import { heal, previewHealing } from '../self-healing/healing-pipeline'

/**
 * Quick action definition
 */
export interface QuickAction {
  id: string
  title: string
  kind: QuickActionKind
  description?: string
  keybinding?: string
  icon?: string
  isEnabled: (code: string, selection?: Selection) => boolean
  execute: (code: string, selection?: Selection) => QuickActionResult
}

/**
 * Quick action kinds
 */
export type QuickActionKind =
  | 'refactor'
  | 'quickfix'
  | 'extract'
  | 'insert'
  | 'transform'
  | 'organize'

/**
 * Selection in editor
 */
export interface Selection {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  text: string
}

/**
 * Quick action result
 */
export interface QuickActionResult {
  success: boolean
  newCode?: string
  message?: string
  cursorPosition?: { line: number; column: number }
  selection?: Selection
}

/**
 * Action context
 */
export interface ActionContext {
  code: string
  selection?: Selection
  cursorLine: number
  cursorColumn: number
}

/**
 * Registry of all quick actions
 */
const quickActions: Map<string, QuickAction> = new Map()

/**
 * Registers a quick action
 */
export function registerQuickAction(action: QuickAction): void {
  quickActions.set(action.id, action)
}

/**
 * Gets all registered quick actions
 */
export function getQuickActions(): QuickAction[] {
  return Array.from(quickActions.values())
}

/**
 * Gets enabled quick actions for current context
 */
export function getAvailableActions(
  code: string,
  selection?: Selection
): QuickAction[] {
  return getQuickActions().filter(action => action.isEnabled(code, selection))
}

/**
 * Executes a quick action by id
 */
export function executeAction(
  actionId: string,
  code: string,
  selection?: Selection
): QuickActionResult {
  const action = quickActions.get(actionId)

  if (!action) {
    return {
      success: false,
      message: `Action not found: ${actionId}`
    }
  }

  if (!action.isEnabled(code, selection)) {
    return {
      success: false,
      message: `Action not available: ${action.title}`
    }
  }

  return action.execute(code, selection)
}

// ============================================
// Built-in Quick Actions
// ============================================

/**
 * Extract Component Action
 */
registerQuickAction({
  id: 'extract-component',
  title: 'Komponente extrahieren',
  kind: 'extract',
  description: 'Extrahiert die Auswahl in eine neue Komponente',
  keybinding: 'Ctrl+Shift+E',

  isEnabled: (code, selection) => {
    if (!selection || selection.text.trim().length === 0) return false

    // Check if selection contains a component (v1: Component prop value)
    return /[A-Z][A-Za-z0-9]*(?:\s+\w|$|\n)/.test(selection.text)
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    const componentName = generateComponentName(code, selection.text)
    // V1 definition syntax: Name: properties (indented children)
    const newDefinition = `${componentName}:\n  ${selection.text.split('\n').join('\n  ')}\n\n`

    // Replace selection with instance
    const lines = code.split('\n')
    const before = lines.slice(0, selection.startLine - 1).join('\n')
    const lineStart = lines[selection.startLine - 1].substring(0, selection.startColumn - 1)
    const lineEnd = lines[selection.endLine - 1].substring(selection.endColumn - 1)
    const after = lines.slice(selection.endLine).join('\n')

    // Find insertion point for definition (after tokens, before other definitions)
    const insertIndex = findDefinitionInsertPoint(code)
    const codeLines = code.split('\n')

    const beforeInsert = codeLines.slice(0, insertIndex).join('\n')
    const afterInsert = codeLines.slice(insertIndex).join('\n')

    // V1 instance: just the component name
    const newCode = beforeInsert + (beforeInsert ? '\n' : '') +
      newDefinition +
      afterInsert.replace(selection.text, componentName)

    return {
      success: true,
      newCode,
      message: `Komponente ${componentName} erstellt`,
      cursorPosition: { line: insertIndex + 1, column: 1 }
    }
  }
})

/**
 * Extract Token Action
 */
registerQuickAction({
  id: 'extract-token',
  title: 'Token extrahieren',
  kind: 'extract',
  description: 'Extrahiert den Wert als Token',
  keybinding: 'Ctrl+Shift+T',

  isEnabled: (code, selection) => {
    if (!selection) return false

    // Check if selection is a value (color, number, etc.)
    const text = selection.text.trim()
    return (
      /^#[0-9A-Fa-f]{3,8}$/.test(text) ||  // Color
      /^\d+$/.test(text) ||                  // Number
      /^\d+px$/.test(text)                   // Dimension
    )
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    const tokenName = generateTokenName(selection.text)
    const tokenDef = `$${tokenName}: ${selection.text}\n`

    // Insert token at top of file
    const newCode = tokenDef + code.replace(selection.text, `$${tokenName}`)

    return {
      success: true,
      newCode,
      message: `Token $${tokenName} erstellt`,
      cursorPosition: { line: 1, column: 1 }
    }
  }
})

/**
 * Wrap with Container Action
 */
registerQuickAction({
  id: 'wrap-container',
  title: 'Mit Container umschließen',
  kind: 'transform',
  description: 'Umschließt die Auswahl mit einem Container',

  isEnabled: (code, selection) => {
    if (!selection) return false
    // V1: Component prop value (no braces)
    return /[A-Z][A-Za-z0-9]*(?:\s+\w|$|\n)/.test(selection.text)
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    // V1 uses indentation for nesting
    const indentedContent = selection.text
      .split('\n')
      .map(line => '  ' + line)
      .join('\n')

    const wrapped = `Container\n${indentedContent}`

    const newCode = code.replace(selection.text, wrapped)

    return {
      success: true,
      newCode,
      message: 'Mit Container umschlossen'
    }
  }
})

/**
 * Convert to Horizontal Action
 */
registerQuickAction({
  id: 'convert-horizontal',
  title: 'Horizontal anordnen',
  kind: 'transform',

  isEnabled: (code, selection) => {
    if (!selection) return false
    // V1: Check if selection is a component without horizontal/hor
    return (
      /[A-Z][A-Za-z0-9]*(?:\s+\w|$|\n)/.test(selection.text) &&
      !/\b(horizontal|hor)\b/.test(selection.text)
    )
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    // V1: Add hor after component name
    const newText = selection.text.replace(
      /^([A-Z][A-Za-z0-9]*)\s*/,
      '$1 hor, '
    )

    const newCode = code.replace(selection.text, newText)

    return {
      success: true,
      newCode,
      message: 'Horizontal Layout hinzugefügt'
    }
  }
})

/**
 * Convert to Vertical Action
 */
registerQuickAction({
  id: 'convert-vertical',
  title: 'Vertikal anordnen',
  kind: 'transform',

  isEnabled: (code, selection) => {
    if (!selection) return false
    // V1: Check if selection has horizontal/hor
    return (
      /[A-Z][A-Za-z0-9]*(?:\s+\w|$|\n)/.test(selection.text) &&
      /\b(horizontal|hor)\b/.test(selection.text)
    )
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    // V1: Remove hor/horizontal
    const newText = selection.text.replace(/\b(horizontal|hor)\b,?\s*/, '')

    const newCode = code.replace(selection.text, newText)

    return {
      success: true,
      newCode,
      message: 'Auf Vertikal Layout geändert'
    }
  }
})

/**
 * Auto-Heal Action
 */
registerQuickAction({
  id: 'auto-heal',
  title: 'Automatisch reparieren',
  kind: 'quickfix',
  description: 'Repariert alle automatisch behebaren Fehler',
  keybinding: 'Ctrl+.',

  isEnabled: (code) => {
    const preview = previewHealing(code)
    return preview.fixes.length > 0
  },

  execute: (code) => {
    const result = heal(code)

    if (result.appliedFixes.length === 0) {
      return {
        success: false,
        message: 'Keine automatischen Korrekturen verfügbar'
      }
    }

    return {
      success: true,
      newCode: result.healedCode,
      message: `${result.appliedFixes.length} Korrekturen angewendet`
    }
  }
})

/**
 * Add State Action
 */
registerQuickAction({
  id: 'add-state',
  title: 'State hinzufügen',
  kind: 'insert',

  isEnabled: (code, selection) => {
    if (!selection) return false
    // V1: Check if selection is a component
    return /[A-Z][A-Za-z0-9]*(?:\s+\w|$|\n)/.test(selection.text)
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    // V1 uses indentation for state blocks
    const stateBlock = `
  hover
    // Hover styles
`
    // Append state block after component (indented)
    const newText = selection.text.trimEnd() + stateBlock

    const newCode = code.replace(selection.text, newText)

    return {
      success: true,
      newCode,
      message: 'State Block hinzugefügt'
    }
  }
})

/**
 * Duplicate Component Action
 */
registerQuickAction({
  id: 'duplicate',
  title: 'Duplizieren',
  kind: 'insert',
  keybinding: 'Ctrl+D',

  isEnabled: (code, selection) => {
    if (!selection) return false
    return selection.text.trim().length > 0
  },

  execute: (code, selection) => {
    if (!selection) {
      return { success: false, message: 'Keine Auswahl' }
    }

    const lines = code.split('\n')
    const insertLine = selection.endLine

    lines.splice(insertLine, 0, selection.text)

    return {
      success: true,
      newCode: lines.join('\n'),
      message: 'Dupliziert',
      selection: {
        startLine: insertLine + 1,
        startColumn: 1,
        endLine: insertLine + selection.text.split('\n').length,
        endColumn: selection.text.split('\n').pop()!.length + 1,
        text: selection.text
      }
    }
  }
})

/**
 * Sort Tokens Action
 */
registerQuickAction({
  id: 'sort-tokens',
  title: 'Tokens sortieren',
  kind: 'organize',
  description: 'Sortiert Token-Definitionen alphabetisch',

  isEnabled: (code) => {
    return /^\$[\w-]+\s*:/m.test(code)
  },

  execute: (code) => {
    const lines = code.split('\n')
    const tokenLines: { name: string; line: string; index: number }[] = []
    const otherLines: { line: string; index: number }[] = []

    lines.forEach((line, index) => {
      const tokenMatch = line.match(/^\$(\w[\w-]*)\s*:/)
      if (tokenMatch) {
        tokenLines.push({ name: tokenMatch[1], line, index })
      } else {
        otherLines.push({ line, index })
      }
    })

    if (tokenLines.length <= 1) {
      return {
        success: false,
        message: 'Nicht genug Tokens zum Sortieren'
      }
    }

    // Sort tokens alphabetically
    tokenLines.sort((a, b) => a.name.localeCompare(b.name))

    // Rebuild code: sorted tokens first, then other lines
    const sortedTokens = tokenLines.map(t => t.line).join('\n')
    const rest = otherLines.map(o => o.line).join('\n')

    const newCode = sortedTokens + (sortedTokens && rest ? '\n' : '') + rest

    return {
      success: true,
      newCode: newCode.trim(),
      message: 'Tokens sortiert'
    }
  }
})

// ============================================
// Helper Functions
// ============================================

/**
 * Generates a component name from content
 */
function generateComponentName(code: string, content: string): string {
  // Try to find a descriptive name from content (V1: Component prop value)
  const componentMatch = content.match(/([A-Z][A-Za-z0-9]*)(?:\s|$)/)
  if (componentMatch) {
    const baseName = componentMatch[1]
    // Check if name is already used
    if (!code.includes(`${baseName}:`)) {
      return `Custom${baseName}`
    }
  }

  // Generate unique name
  let counter = 1
  while (code.includes(`CustomComponent${counter}:`)) {
    counter++
  }
  return `CustomComponent${counter}`
}

/**
 * Generates a token name from value
 */
function generateTokenName(value: string): string {
  const trimmed = value.trim()

  // Color
  if (/^#[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
    return 'custom-color'
  }

  // Number - likely spacing
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed)
    if (num <= 8) return 'spacing-xs'
    if (num <= 16) return 'spacing-sm'
    if (num <= 24) return 'spacing-md'
    return 'spacing-lg'
  }

  // Dimension
  if (/^\d+px$/.test(trimmed)) {
    return 'size-custom'
  }

  return 'custom-value'
}

/**
 * Finds insertion point for definitions
 */
function findDefinitionInsertPoint(code: string): number {
  const lines = code.split('\n')
  let lastTokenLine = 0
  let firstDefinitionLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Token definition
    if (/^\$[\w-]+\s*:/.test(line)) {
      lastTokenLine = i + 1
    }

    // Component definition
    if (/^[A-Z][A-Za-z0-9]*\s*:/.test(line)) {
      firstDefinitionLine = Math.min(firstDefinitionLine, i)
      break
    }
  }

  // Insert after tokens but before existing definitions
  return Math.max(lastTokenLine, 0)
}

/**
 * Gets quick actions for a specific line
 */
export function getActionsForLine(
  code: string,
  line: number
): QuickAction[] {
  const lines = code.split('\n')
  const lineText = lines[line - 1] || ''

  const selection: Selection = {
    startLine: line,
    startColumn: 1,
    endLine: line,
    endColumn: lineText.length + 1,
    text: lineText
  }

  return getAvailableActions(code, selection)
}

/**
 * Gets code actions (LSP compatible format)
 */
export function getCodeActions(
  code: string,
  range: { startLine: number; endLine: number }
): Array<{
  title: string
  kind: string
  command: string
  arguments: unknown[]
}> {
  const lines = code.split('\n')
  const selectedLines = lines.slice(range.startLine - 1, range.endLine)
  const text = selectedLines.join('\n')

  const selection: Selection = {
    startLine: range.startLine,
    startColumn: 1,
    endLine: range.endLine,
    endColumn: selectedLines[selectedLines.length - 1]?.length + 1 || 1,
    text
  }

  const actions = getAvailableActions(code, selection)

  return actions.map(action => ({
    title: action.title,
    kind: action.kind,
    command: `mirror.${action.id}`,
    arguments: [code, selection]
  }))
}
