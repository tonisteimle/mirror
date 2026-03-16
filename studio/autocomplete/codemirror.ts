/**
 * CodeMirror Extension for Mirror Autocomplete
 *
 * Wraps the AutocompleteEngine for use with CodeMirror 6
 */

import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { getAutocompleteEngine, type Completion } from './index'

/**
 * Map our completion types to CodeMirror completion types
 */
function mapCompletionType(type: Completion['type']): string {
  switch (type) {
    case 'property': return 'property'
    case 'value': return 'constant'
    case 'component': return 'class'
    case 'token': return 'variable'
    case 'state': return 'keyword'
    case 'keyword': return 'keyword'
    case 'constant': return 'constant'
    default: return 'text'
  }
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

  // No completions
  if (result.completions.length === 0) {
    return null
  }

  // Convert to CodeMirror format
  const options = result.completions.map(c => ({
    label: c.label,
    detail: c.detail,
    type: mapCompletionType(c.type),
    info: c.info,
    boost: c.boost,
  }))

  return {
    from: line.from + result.from,
    options,
    validFor: /^[\w-]*$/,
  }
}

/**
 * Slot completion helper - finds slots for parent component
 * This needs access to the document to parse component definitions
 */
export function createSlotCompletions(
  findParentComponent: (doc: any, pos: number) => string | null,
  extractComponentSlots: (doc: any) => Record<string, string[]>
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
      options = options.filter(s =>
        s.label.toLowerCase().startsWith(typed.toLowerCase())
      )
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
