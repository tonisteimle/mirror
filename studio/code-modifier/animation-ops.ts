/**
 * Animation Operations — updateAnimation, addAnimationKeyframe + DSL helpers.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type { CodeModifier, ModificationResult } from './code-modifier'

/**
 * Update or create an animation definition
 *
 * @param animationName - Name of the animation
 * @param animationData - Animation data to write
 */
export function updateAnimation(
  this: CodeModifier,
  animationName: string,
  animationData: {
    easing: string
    duration?: number
    tracks: {
      property: string
      startTime: number
      endTime: number
      fromValue: string | number
      toValue: string | number
    }[]
  }
): ModificationResult {
  // Find existing animation definition
  const animationPattern = new RegExp(`^(\\s*)${animationName}\\s+as\\s+animation:`, 'm')
  const match = this.source.match(animationPattern)

  // Generate animation DSL
  const dsl = this.generateAnimationDSL(animationName, animationData)

  if (match && match.index !== undefined) {
    // Update existing animation
    const startLine = this.source.substring(0, match.index).split('\n').length
    let endLine = startLine

    // Find end of animation block (next definition or end of indented block)
    const lines = this.source.split('\n')
    const baseIndent = match[1].length
    // Convert to 0-based index for array access
    const startIndex = startLine - 1

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue

      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
      if (currentIndent <= baseIndent && i > startIndex) {
        break
      }
      endLine = i + 1 // Convert back to 1-based for getCharacterOffset
    }

    const from = this.getCharacterOffset(startLine, 1)
    const toOffset = this.getCharacterOffset(endLine, lines[endLine - 1].length + 1)

    const newSource = this.source.substring(0, from) + dsl + this.source.substring(toOffset)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: { from, to: toOffset, insert: dsl },
    }
  } else {
    // Create new animation - insert at top of file after tokens
    const insertPosition = this.findAnimationInsertPosition()
    const newSource =
      this.source.substring(0, insertPosition) +
      dsl +
      '\n\n' +
      this.source.substring(insertPosition)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: { from: insertPosition, to: insertPosition, insert: dsl + '\n\n' },
    }
  }
}

/**
 * Generate animation DSL code from data
 */
export function generateAnimationDSL(
  this: CodeModifier,
  name: string,
  data: {
    easing: string
    tracks: {
      property: string
      startTime: number
      endTime: number
      fromValue: string | number
      toValue: string | number
    }[]
  }
): string {
  const lines: string[] = []
  lines.push(`${name} as animation: ${data.easing}`)

  // Group all unique times
  const times = new Set<number>()
  for (const track of data.tracks) {
    times.add(track.startTime)
    times.add(track.endTime)
  }

  const sortedTimes = Array.from(times).sort((a, b) => a - b)

  for (const time of sortedTimes) {
    const props: string[] = []

    for (const track of data.tracks) {
      if (track.startTime === time) {
        props.push(`${track.property} ${track.fromValue}`)
      } else if (track.endTime === time) {
        props.push(`${track.property} ${track.toValue}`)
      }
    }

    if (props.length > 0) {
      lines.push(`  ${time.toFixed(2)} ${props.join(', ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Find position to insert new animation (after tokens, before components)
 */
export function findAnimationInsertPosition(this: CodeModifier): number {
  const lines = this.source.split('\n')
  let position = 0
  let lastTokenLine = -1
  let firstComponentLine = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Token definition: $name: value
    if (line.startsWith('$')) {
      lastTokenLine = i
    }

    // Component/animation definition: Name: or Name as
    if (/^[A-Z][a-zA-Z0-9]*\s*(:|as\s)/.test(line) && firstComponentLine === -1) {
      firstComponentLine = i
    }
  }

  // Insert after tokens, before components
  if (lastTokenLine >= 0) {
    // After tokens
    const targetLine = lastTokenLine + 1
    position = this.getCharacterOffset(targetLine + 1, 1)
  } else if (firstComponentLine >= 0) {
    // Before first component
    position = this.getCharacterOffset(firstComponentLine + 1, 1)
  }

  return position
}

/**
 * Add animation keyframe
 */
export function addAnimationKeyframe(
  this: CodeModifier,
  animationName: string,
  time: number,
  properties: { property: string; value: string | number }[]
): ModificationResult {
  // Find the animation definition
  const animationPattern = new RegExp(`^(\\s*)${animationName}\\s+as\\s+animation:`, 'm')
  const match = this.source.match(animationPattern)

  if (!match || match.index === undefined) {
    return this.errorResult(`Animation not found: ${animationName}`)
  }

  const startLine = this.source.substring(0, match.index).split('\n').length
  const lines = this.source.split('\n')
  const baseIndent = match[1].length
  const keyframeIndent = '  '.repeat(baseIndent / 2 + 1)
  // Convert to 0-based index for array access
  const startIndex = startLine - 1

  // Find position to insert (sorted by time)
  // insertLine is 1-based (for getCharacterOffset)
  // Default to right after the animation definition line
  let insertLine = startLine + 1
  let lastKeyframeLine = startLine

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue

    const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
    if (currentIndent <= baseIndent && i > startIndex) {
      break // Reached end of animation block
    }

    // Track last line of animation block for fallback insert position
    lastKeyframeLine = i + 1 // 1-based

    // Check if this line is a keyframe (starts with a time value)
    const keyframeMatch = line.match(/^\s*([\d.]+)\s+/)
    if (keyframeMatch) {
      const lineTime = parseFloat(keyframeMatch[1])
      if (lineTime < time) {
        // Insert after this keyframe (sorted by time)
        insertLine = i + 2 // i is 0-based, +1 for 1-based, +1 for "after"
      }
    }
  }

  // Ensure insertLine doesn't exceed document bounds
  insertLine = Math.min(insertLine, this.lines.length + 1)

  // Build the new keyframe line
  const propsStr = properties.map(p => `${p.property} ${p.value}`).join(', ')
  const newLine = `${keyframeIndent}${time.toFixed(2)} ${propsStr}`

  // insertLine is already 1-based
  const insertPosition = this.getCharacterOffset(insertLine, 1)
  const newSource =
    this.source.substring(0, insertPosition) +
    newLine +
    '\n' +
    this.source.substring(insertPosition)

  // Persist changes for subsequent operations
  this.source = newSource
  this.lines = newSource.split('\n')

  return {
    success: true,
    newSource,
    change: { from: insertPosition, to: insertPosition, insert: newLine + '\n' },
  }
}
