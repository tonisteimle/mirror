/**
 * CodeMirror Extension for Mirror Autocomplete
 *
 * Wraps the AutocompleteEngine for use with CodeMirror 6
 */

import type {
  CompletionContext,
  CompletionResult,
  Completion as CMCompletion,
} from '@codemirror/autocomplete'
import type { Text } from '@codemirror/state'
import { getAutocompleteEngine, type Completion } from './index'
import {
  COMPONENT_TEMPLATES,
  adjustTemplateIndentation,
} from '../../compiler/schema/component-templates'

/**
 * Map our completion types to CodeMirror completion types
 */
function mapCompletionType(type: Completion['type']): string {
  switch (type) {
    case 'property':
      return 'property'
    case 'value':
      return 'constant'
    case 'component':
      return 'class'
    case 'token':
      return 'variable'
    case 'state':
      return 'keyword'
    case 'keyword':
      return 'keyword'
    case 'constant':
      return 'constant'
    default:
      return 'text'
  }
}

/**
 * Get the indentation of the current line
 */
function getLineIndentation(lineText: string): string {
  const match = lineText.match(/^(\s*)/)
  return match ? match[1] : ''
}

/**
 * Check if cursor is at start of line (only whitespace before cursor)
 * This prevents template completions from appearing mid-line
 */
function isAtLineStart(lineText: string, cursorColumn: number): boolean {
  const textBeforeCursor = lineText.slice(0, cursorColumn)
  // Only whitespace and optionally starting to type a component name
  return /^\s*[A-Z]?[a-z]*$/.test(textBeforeCursor)
}

/**
 * CodeMirror completion source that uses the AutocompleteEngine
 */
export function mirrorCompletions(context: CompletionContext): CompletionResult | null {
  const engine = getAutocompleteEngine()

  // Get the current line text
  const line = context.state.doc.lineAt(context.pos)
  const lineText = line.text
  const cursorColumn = context.pos - line.from

  // Get full source for element extraction (target completion)
  const fullSource = context.state.doc.toString()

  // Get completions from engine
  const result = engine.getCompletions({
    lineText,
    cursorColumn,
    fullSource,
    explicit: context.explicit,
  })

  // Check if we're in a context where component templates make sense
  // Must be at start of line (only whitespace before) and typing a component name
  const canShowTemplates = isAtLineStart(lineText, cursorColumn) && context.explicit
  const baseIndent = getLineIndentation(lineText)

  // Add template completions if in valid context
  const templateCompletions: CMCompletion[] = []
  if (canShowTemplates) {
    const typed = lineText.trim().toLowerCase()

    for (const [name, template] of Object.entries(COMPONENT_TEMPLATES)) {
      // Filter by typed text
      if (typed && !name.toLowerCase().startsWith(typed)) {
        continue
      }

      templateCompletions.push({
        label: name,
        detail: template.description,
        type: 'class',
        boost: 10, // Boost templates above regular completions
        apply: (view, completion, from, to) => {
          // Insert the full template with proper indentation
          const adjustedTemplate = adjustTemplateIndentation(template.code, baseIndent)
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: adjustedTemplate },
            selection: { anchor: line.from + adjustedTemplate.length },
          })
        },
      })
    }
  }

  // No completions from either source
  if (result.completions.length === 0 && templateCompletions.length === 0) {
    return null
  }

  // Convert engine completions to CodeMirror format
  const engineOptions: CMCompletion[] = result.completions.map(c => ({
    label: c.label,
    detail: c.detail,
    type: mapCompletionType(c.type),
    info: c.info,
    boost: c.boost,
  }))

  // Merge completions, templates first
  const allOptions = [...templateCompletions, ...engineOptions]

  // Deduplicate by label (templates take precedence)
  const seen = new Set<string>()
  const uniqueOptions = allOptions.filter(opt => {
    if (seen.has(opt.label)) return false
    seen.add(opt.label)
    return true
  })

  return {
    from: line.from + result.from,
    options: uniqueOptions,
    validFor: /^[\w-]*$/,
  }
}

/**
 * Slot completion helper - finds slots for parent component
 * This needs access to the document to parse component definitions
 */
export function createSlotCompletions(
  findParentComponent: (doc: Text, pos: number) => string | null,
  extractComponentSlots: (doc: Text) => Record<string, string[]>
) {
  return function slotCompletions(context: CompletionContext): CompletionResult | null {
    const line = context.state.doc.lineAt(context.pos)
    const textBefore = line.text.slice(0, context.pos - line.from)

    // Check if we're typing a slot name (indented, starts with capital letter)
    const word = context.matchBefore(/[\w-]*/)
    const typed = word ? word.text : ''

    // Must be indented and start with capital letter
    const isIndented = textBefore.match(/^\s+$/)
    const startsWithCapital = typed.match(/^[A-Z]/)

    if (!isIndented || !startsWithCapital) {
      return null
    }

    // Find parent component
    const parentComponent = findParentComponent(context.state.doc, context.pos)
    if (!parentComponent) {
      return null
    }

    // Get slots for this component
    const componentSlots = extractComponentSlots(context.state.doc)
    const slots = componentSlots[parentComponent] || []

    if (slots.length === 0) {
      return null
    }

    // Filter by typed text
    let options = slots.map(s => ({
      label: s,
      type: 'class',
      detail: `Slot of ${parentComponent}`,
    }))

    if (typed) {
      options = options.filter(s => s.label.toLowerCase().startsWith(typed.toLowerCase()))
    }

    if (options.length === 0) {
      return null
    }

    return {
      from: word ? word.from : context.pos,
      options,
      validFor: /^[A-Za-z0-9]*$/,
    }
  }
}
