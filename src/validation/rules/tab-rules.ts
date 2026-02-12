/**
 * Tab-specific validation rules
 */

import type { ValidationError, ValidationWarning } from '../types'
import { analyzeLine } from '../analyzers/line-analyzer'

export interface TabValidationResult {
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validate components tab specific rules
 */
export function validateComponentsTab(code: string): TabValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const lines = code.split('\n')

  let currentDefinition: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isEmpty || parsed.isComment) continue

    // Root-level lines in components tab should be definitions
    if (parsed.indent === 0 && parsed.componentName && !parsed.isDefinition) {
      warnings.push({
        type: 'POSSIBLE_TYPO',
        tab: 'components',
        line: i + 1,
        message: `"${parsed.componentName}" looks like an instance, not a definition`,
        suggestion: `Add a colon for definition: ${parsed.componentName}:`
      })
    }

    // Track current definition for scoped children
    if (parsed.isDefinition && parsed.componentName) {
      currentDefinition = parsed.componentName
    }

    // Check indented children are properly nested
    if (parsed.indent > 0 && !currentDefinition) {
      errors.push({
        type: 'INVALID_SYNTAX',
        tab: 'components',
        line: i + 1,
        message: 'Indented content without parent definition',
        source: lines[i]
      })
    }
  }

  return { errors, warnings }
}

/**
 * Validate layout tab specific rules
 * Note: Properties ARE allowed in layout for inline component definitions
 */
export function validateLayoutTab(code: string): TabValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isEmpty || parsed.isComment) continue

    // Layout tab should NOT have definitions (with ":")
    // Definitions belong in Components tab for reusability
    if (parsed.isDefinition) {
      errors.push({
        type: 'DEFINITION_IN_LAYOUT',
        tab: 'layout',
        line: i + 1,
        message: `Definitions (with ":") belong in the Components tab, not Layout`,
        source: lines[i]
      })
    }

    // Properties ARE allowed in layout for inline component definitions
    // e.g., Button pad 12 col #1A1A1A Label col #FFF "Label"
  }

  return { errors, warnings }
}

/**
 * Cross-validate components and layout tabs
 */
export function crossValidateTabs(
  componentsCode: string,
  layoutCode: string
): TabValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Extract all defined components from components tab
  const definedComponents = new Set<string>()
  const definedChildren = new Map<string, Set<string>>() // parent -> children

  const compLines = componentsCode.split('\n')
  let currentParent: string | null = null

  for (const line of compLines) {
    const parsed = analyzeLine(line, 0)

    if (parsed.isDefinition && parsed.componentName) {
      definedComponents.add(parsed.componentName)
      currentParent = parsed.componentName
      definedChildren.set(parsed.componentName, new Set())
    } else if (parsed.indent > 0 && currentParent && parsed.componentName) {
      // Scoped child
      definedChildren.get(currentParent)?.add(parsed.componentName)
    }
  }

  // Check layout references
  const layoutLines = layoutCode.split('\n')
  const usedComponents = new Set<string>()
  const adHocDefinitions = new Set<string>() // Track ad-hoc definitions in layout

  for (let i = 0; i < layoutLines.length; i++) {
    const parsed = analyzeLine(layoutLines[i], i + 1)

    if (parsed.componentName) {
      usedComponents.add(parsed.componentName)

      // If component has properties, register as ad-hoc definition
      if (parsed.properties.length > 0) {
        adHocDefinitions.add(parsed.componentName)
      }

      // Also track inline slots as used components and ad-hoc definitions
      for (const slot of parsed.inlineSlots) {
        usedComponents.add(slot.name)
        adHocDefinitions.add(slot.name)
      }

      // Only warn if: no properties AND not in Components tab AND not an ad-hoc definition
      if (parsed.properties.length === 0 && !definedComponents.has(parsed.componentName) && !adHocDefinitions.has(parsed.componentName)) {
        // Might be a child reference - check inline slots context
        let isValidChild = false

        // Check if any parent has this as a child
        for (const [, children] of definedChildren) {
          if (children.has(parsed.componentName)) {
            isValidChild = true
            break
          }
        }

        if (!isValidChild) {
          warnings.push({
            type: 'MISSING_CHILD_DEFINITION',
            tab: 'layout',
            line: i + 1,
            message: `Component "${parsed.componentName}" is used but not defined`,
            suggestion: `Add properties for ad-hoc definition or define in Components tab`
          })
        }
      }
    }

    // Check from target - must be defined in Components tab
    if (parsed.fromTarget) {
      if (!definedComponents.has(parsed.fromTarget)) {
        errors.push({
          type: 'INVALID_REFERENCE',
          tab: 'layout',
          line: i + 1,
          message: `Cannot extend from "${parsed.fromTarget}" - not defined in Components tab`,
          source: layoutLines[i]
        })
      }
    }
  }

  // Check for unused definitions
  for (const component of definedComponents) {
    if (!usedComponents.has(component)) {
      // Find the line number
      let lineNum = 0
      for (let i = 0; i < compLines.length; i++) {
        if (compLines[i].trim().startsWith(component + ':')) {
          lineNum = i + 1
          break
        }
      }

      warnings.push({
        type: 'UNUSED_COMPONENT',
        tab: 'components',
        line: lineNum,
        message: `Component "${component}" is defined but never used in Layout tab`
      })
    }
  }

  return { errors, warnings }
}
