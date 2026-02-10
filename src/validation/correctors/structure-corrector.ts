/**
 * Structure correction - indentation, missing definitions, etc.
 */

import type { Correction, TabType } from '../types'
import { structureConfidence } from '../utils/confidence'

/**
 * Analyze and fix indentation
 */
export function correctIndentation(lines: string[], tab: TabType): {
  correctedLines: string[]
  corrections: Correction[]
} {
  const corrections: Correction[] = []
  const correctedLines: string[] = []

  // Detect indentation style (2 spaces, 4 spaces, or tabs)
  let indentUnit = 2 // default
  for (const line of lines) {
    const match = line.match(/^(\s+)/)
    if (match) {
      const indent = match[1]
      if (indent.includes('\t')) {
        indentUnit = -1 // tabs
        break
      }
      if (indent.length > 0) {
        indentUnit = Math.min(indentUnit, indent.length)
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      correctedLines.push('')
      continue
    }

    // Calculate current indent
    const currentIndent = line.match(/^(\s*)/)?.[1].length || 0

    // Check if this is a root-level component (no indent expected)
    const isRootComponent = /^[A-Z][a-zA-Z0-9]*:?[\s]/.test(trimmed) || /^[A-Z][a-zA-Z0-9]*$/.test(trimmed)

    if (isRootComponent && !trimmed.startsWith(' ')) {
      // Root component - should have no indent
      correctedLines.push(trimmed)
    } else {
      // Child component - should have consistent indent
      // Check if indent is valid (should be a multiple of indent unit)
      if (indentUnit > 0 && currentIndent % indentUnit !== 0) {
        // Round to nearest valid indent
        const correctedIndentLevel = Math.round(currentIndent / indentUnit)
        const newIndent = ' '.repeat(correctedIndentLevel * indentUnit)
        const correctedLine = newIndent + trimmed

        corrections.push({
          tab,
          line: i + 1,
          original: line,
          corrected: correctedLine,
          reason: `Fixed indentation from ${currentIndent} to ${correctedIndentLevel * indentUnit} spaces`,
          confidence: structureConfidence('fix_indent')
        })

        correctedLines.push(correctedLine)
      } else {
        correctedLines.push(line)
      }
    }
  }

  return { correctedLines, corrections }
}

/**
 * Generate a basic component definition for a missing component
 */
export function generateMissingDefinition(componentName: string): string {
  // Generate a minimal definition
  return `${componentName}: pad 8`
}

/**
 * Find components used in layout but not defined in components
 */
export function findMissingDefinitions(
  layoutLines: string[],
  definedComponents: Set<string>
): string[] {
  const usedComponents = new Set<string>()
  const missing: string[] = []

  // Built-in components that don't need definitions
  const builtIns = new Set(['Box', 'Text', 'Row', 'Column', 'Stack', 'Image', 'Icon', 'Button', 'Input', 'Link'])

  for (const line of layoutLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Find component names in line
    const componentMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)
    if (componentMatch) {
      usedComponents.add(componentMatch[1])
    }

    // Also find slot names
    const slotMatches = trimmed.matchAll(/\s([A-Z][a-zA-Z0-9]*)\s*"/g)
    for (const match of slotMatches) {
      // These are child slots, they might be scoped
      usedComponents.add(match[1])
    }
  }

  for (const component of usedComponents) {
    if (!definedComponents.has(component) && !builtIns.has(component)) {
      // Check if it might be a scoped name
      let isScoped = false
      for (const defined of definedComponents) {
        if (defined.endsWith('.' + component)) {
          isScoped = true
          break
        }
      }
      if (!isScoped) {
        missing.push(component)
      }
    }
  }

  return missing
}

/**
 * Extract defined components from components tab
 */
export function extractDefinedComponents(componentsLines: string[]): Set<string> {
  const defined = new Set<string>()

  for (const line of componentsLines) {
    const trimmed = line.trim()

    // Definition syntax: ComponentName:
    const defMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*):/)
    if (defMatch) {
      defined.add(defMatch[1])
    }

    // Scoped child (indented under definition)
    // We track these by their base name since they're used without scope in layout
  }

  return defined
}

/**
 * Check for and remove duplicate definitions
 */
export function removeDuplicateDefinitions(
  lines: string[],
  tab: TabType
): { correctedLines: string[]; corrections: Correction[] } {
  const defined = new Map<string, number>() // component -> first definition line
  const corrections: Correction[] = []
  const correctedLines: string[] = []
  const skipLines = new Set<number>()

  // First pass: find duplicates
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const defMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*):/)

    if (defMatch) {
      const name = defMatch[1]
      if (defined.has(name)) {
        // Duplicate - mark for removal
        skipLines.add(i)
        corrections.push({
          tab,
          line: i + 1,
          original: lines[i],
          corrected: '',
          reason: `Removed duplicate definition of "${name}" (first defined at line ${defined.get(name)! + 1})`,
          confidence: 0.85
        })
      } else {
        defined.set(name, i)
      }
    }
  }

  // Second pass: build corrected lines
  for (let i = 0; i < lines.length; i++) {
    if (!skipLines.has(i)) {
      correctedLines.push(lines[i])
    }
  }

  return { correctedLines, corrections }
}
