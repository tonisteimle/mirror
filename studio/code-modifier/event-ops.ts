/**
 * Event Operations — addEvent, removeEvent, updateEvent.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment in code-modifier.ts.
 * They access the modifier's state through internal fields (source, lines,
 * sourceMap) and helpers (errorResult, getCharacterOffset).
 */

import type { CodeModifier, ModificationResult } from './code-modifier'

/**
 * Format an event string for code insertion
 *
 * Examples:
 *   formatEventString('onclick', 'toggle')                       → 'onclick toggle()'
 *   formatEventString('onclick', 'show', 'Menu')                 → 'onclick show(Menu)'
 *   formatEventString('onkeydown', 'toggle', undefined, 'escape') → 'onkeydown escape toggle()'
 */
export function formatEventString(
  eventName: string,
  actionName: string,
  target?: string,
  key?: string
): string {
  return (
    eventName + (key ? ` ${key}` : '') + (target ? ` ${actionName}(${target})` : ` ${actionName}()`)
  )
}

/**
 * Parse events from a line. Returns array of { eventStr, startIndex, endIndex,
 * eventName, key } for every event found.
 */
export function findEventsInLine(line: string): Array<{
  eventStr: string
  startIndex: number
  endIndex: number
  eventName: string
  key?: string
}> {
  const events: Array<{
    eventStr: string
    startIndex: number
    endIndex: number
    eventName: string
    key?: string
  }> = []

  // Pattern: onevent [key] action([target])
  // e.g. `onclick toggle()`, `onclick show(Menu)`, `onkeydown escape toggle()`
  const eventPattern = /\b(on[a-z-]+)(?:\s+([a-z-]+))?\s+([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)/g
  let match

  while ((match = eventPattern.exec(line)) !== null) {
    events.push({
      eventStr: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      eventName: match[1],
      key: match[2],
    })
  }

  return events
}

/**
 * Add an event to a node's line.
 * Example: `Button "Click", pad 12` → `Button "Click", pad 12, onclick toggle()`
 */
export function addEvent(
  this: CodeModifier,
  nodeId: string,
  eventName: string,
  actionName: string,
  target?: string,
  key?: string
): ModificationResult {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return this.errorResult(`Node not found: ${nodeId}`)

  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) return this.errorResult(`Line not found: ${nodeLine}`)

  const eventStr = formatEventString(eventName, actionName, target, key)
  const trimmedLine = line.trimEnd()

  let newLine: string
  if (trimmedLine.includes(',')) {
    newLine = `${trimmedLine}, ${eventStr}`
  } else {
    const hasTextOrProps = /\s/.test(trimmedLine.substring(trimmedLine.search(/[A-Z]/)))
    newLine = hasTextOrProps ? `${trimmedLine}, ${eventStr}` : `${trimmedLine} ${eventStr}`
  }

  const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  const newLines = [...this.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  this.source = newSource
  this.lines = newLines

  return { success: true, newSource, change: { from, to, insert: newLine } }
}

/**
 * Remove an event from a node's line. Trims surrounding comma/spacing
 * cleanly so the result reads correctly.
 */
export function removeEvent(
  this: CodeModifier,
  nodeId: string,
  eventName: string,
  key?: string
): ModificationResult {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return this.errorResult(`Node not found: ${nodeId}`)

  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) return this.errorResult(`Line not found: ${nodeLine}`)

  const events = findEventsInLine(line)
  const eventToRemove = events.find(e => {
    if (e.eventName !== eventName) return false
    if (key && e.key !== key) return false
    if (!key && e.key) return false
    return true
  })

  if (!eventToRemove) {
    return this.errorResult(`Event not found: ${eventName}${key ? ' ' + key : ''}`)
  }

  const startIdx = eventToRemove.startIndex
  const endIdx = eventToRemove.endIndex
  const beforeEvent = line.substring(0, startIdx)
  const afterEvent = line.substring(endIdx)

  let newLine: string
  if (beforeEvent.trimEnd().endsWith(',')) {
    const commaIdx = beforeEvent.lastIndexOf(',')
    newLine = line.substring(0, commaIdx) + afterEvent
  } else if (afterEvent.trimStart().startsWith(',')) {
    const afterComma = afterEvent.replace(/^\s*,\s*/, '')
    newLine = beforeEvent + afterComma
  } else {
    newLine = beforeEvent + afterEvent
  }

  newLine = newLine.replace(/\s{2,}/g, ' ').trimEnd()

  const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  const newLines = [...this.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  this.source = newSource
  this.lines = newLines

  return { success: true, newSource, change: { from, to, insert: newLine } }
}

/**
 * Update an event in-place. Replaces an existing event spec with a new
 * (eventName/key/actionName/target) tuple. Useful for the property panel's
 * event-editor inline updates.
 */
export function updateEvent(
  this: CodeModifier,
  nodeId: string,
  oldEventName: string,
  oldKey: string | undefined,
  newEventName: string,
  newActionName: string,
  newTarget?: string,
  newKey?: string
): ModificationResult {
  const nodeMapping = this.sourceMap.getNodeById(nodeId)
  if (!nodeMapping) return this.errorResult(`Node not found: ${nodeId}`)

  const nodeLine = nodeMapping.position.line
  const line = this.lines[nodeLine - 1]
  if (!line) return this.errorResult(`Line not found: ${nodeLine}`)

  const events = findEventsInLine(line)
  const eventToUpdate = events.find(e => {
    if (e.eventName !== oldEventName) return false
    if (oldKey && e.key !== oldKey) return false
    if (!oldKey && e.key) return false
    return true
  })

  if (!eventToUpdate) {
    return this.errorResult(`Event not found: ${oldEventName}${oldKey ? ' ' + oldKey : ''}`)
  }

  const newEventStr = formatEventString(newEventName, newActionName, newTarget, newKey)
  const newLine =
    line.substring(0, eventToUpdate.startIndex) +
    newEventStr +
    line.substring(eventToUpdate.endIndex)

  const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
  const from = lineStartOffset
  const to = lineStartOffset + line.length

  const newLines = [...this.lines]
  newLines[nodeLine - 1] = newLine
  const newSource = newLines.join('\n')

  this.source = newSource
  this.lines = newLines

  return { success: true, newSource, change: { from, to, insert: newLine } }
}
