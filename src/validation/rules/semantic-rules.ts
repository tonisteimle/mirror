/**
 * Semantic validation rules
 */

import type { ValidationError, ValidationWarning, ComponentInfo, TabType } from '../types'
import { analyzeLine } from '../analyzers/line-analyzer'
import {
  buildComponentRegistry,
  analyzeReferences,
  checkCircularReferences,
  findUnusedComponents
} from '../analyzers/reference-analyzer'

export interface SemanticValidationResult {
  errors: ValidationError[]
  warnings: ValidationWarning[]
  registry: Map<string, ComponentInfo>
}

/**
 * Validate semantic correctness of components and layout
 */
export function validateSemantics(
  componentsCode: string,
  layoutCode: string
): SemanticValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Build component registry
  const registry = buildComponentRegistry(componentsCode)

  // Check for duplicate definitions
  const duplicateErrors = checkDuplicateDefinitions(componentsCode)
  errors.push(...duplicateErrors)

  // Analyze references
  const refAnalysis = analyzeReferences(layoutCode, registry)
  errors.push(...refAnalysis.errors)
  warnings.push(...refAnalysis.warnings)

  // Check circular references
  const circularErrors = checkCircularReferences(registry)
  errors.push(...circularErrors)

  // Find unused components
  const unusedWarnings = findUnusedComponents(registry, refAnalysis.references)
  warnings.push(...unusedWarnings)

  // Validate 'from' targets
  const fromErrors = validateFromTargets(componentsCode, registry)
  errors.push(...fromErrors)

  // Validate scoped children usage
  const scopeWarnings = validateScopedChildren(layoutCode, registry)
  warnings.push(...scopeWarnings)

  return { errors, warnings, registry }
}

/**
 * Check for duplicate component definitions
 */
function checkDuplicateDefinitions(componentsCode: string): ValidationError[] {
  const errors: ValidationError[] = []
  const defined = new Map<string, number>()
  const lines = componentsCode.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isDefinition && parsed.componentName) {
      if (defined.has(parsed.componentName)) {
        errors.push({
          type: 'DUPLICATE_DEFINITION',
          tab: 'components',
          line: i + 1,
          message: `Component "${parsed.componentName}" is already defined at line ${defined.get(parsed.componentName)}`,
          source: lines[i]
        })
      } else {
        defined.set(parsed.componentName, i + 1)
      }
    }
  }

  return errors
}

/**
 * Validate 'from' targets in component definitions
 */
function validateFromTargets(
  componentsCode: string,
  _registry: Map<string, ComponentInfo>
): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = componentsCode.split('\n')

  // First pass: collect all definitions
  const definitions = new Set<string>()
  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)
    if (parsed.isDefinition && parsed.componentName) {
      definitions.add(parsed.componentName)
    }
  }

  // Second pass: validate from targets
  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.hasFrom && parsed.fromTarget) {
      // Check if target exists (must be defined in Components tab)
      if (!definitions.has(parsed.fromTarget)) {
        errors.push({
          type: 'INVALID_REFERENCE',
          tab: 'components',
          line: i + 1,
          message: `Cannot extend from "${parsed.fromTarget}" - component not defined`,
          source: lines[i]
        })
      }

      // Check if trying to extend from self
      if (parsed.componentName === parsed.fromTarget) {
        errors.push({
          type: 'CIRCULAR_REFERENCE',
          tab: 'components',
          line: i + 1,
          message: `Component "${parsed.componentName}" cannot extend from itself`,
          source: lines[i]
        })
      }
    }
  }

  return errors
}

/**
 * Validate scoped children usage in layout
 */
function validateScopedChildren(
  layoutCode: string,
  registry: Map<string, ComponentInfo>
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const lines = layoutCode.split('\n')

  // Track ad-hoc definitions from layout
  const adHocDefinitions = new Set<string>()

  let currentParent: string | null = null
  let parentIndent = -1

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isEmpty || parsed.isComment) continue

    // Track ad-hoc definitions
    if (parsed.componentName && parsed.properties.length > 0) {
      adHocDefinitions.add(parsed.componentName)
    }
    for (const slot of parsed.inlineSlots) {
      adHocDefinitions.add(slot.name)
    }

    // Update parent tracking
    if (parsed.indent === 0 && parsed.componentName) {
      currentParent = parsed.componentName
      parentIndent = 0
    } else if (parsed.indent > parentIndent && currentParent) {
      // Check if this child exists as scoped
      if (parsed.componentName) {
        const scopedName = `${currentParent}.${parsed.componentName}`
        const hasScoped = registry.has(scopedName)
        const hasGlobal = registry.has(parsed.componentName)
        const hasAdHoc = adHocDefinitions.has(parsed.componentName)

        // If neither scoped nor global nor ad-hoc exists, might be an issue
        // BUT if the line has properties, it's an ad-hoc definition (valid)
        const hasProperties = parsed.properties.length > 0
        if (!hasScoped && !hasGlobal && !hasAdHoc && !hasProperties) {
          warnings.push({
            type: 'MISSING_CHILD_DEFINITION',
            tab: 'layout',
            line: i + 1,
            message: `Child "${parsed.componentName}" of "${currentParent}" is not defined`,
            suggestion: `Add properties for ad-hoc definition or define in Components tab`
          })
        }
      }
    }

    // Check inline slots - they can be scoped children, global components, or ad-hoc
    for (const slot of parsed.inlineSlots) {
      const scopedName = currentParent ? `${currentParent}.${slot.name}` : slot.name
      const hasScoped = registry.has(scopedName)
      const hasGlobal = registry.has(slot.name)
      const hasAdHoc = adHocDefinitions.has(slot.name)

      // Slot is valid if: defined as scoped child, global component, or ad-hoc
      if (!hasScoped && !hasGlobal && !hasAdHoc) {
        warnings.push({
          type: 'MISSING_CHILD_DEFINITION',
          tab: 'layout',
          line: i + 1,
          message: `Component "${slot.name}" is not defined`,
          suggestion: `Add properties for ad-hoc definition or define in Components tab`
        })
      }
    }
  }

  return warnings
}

/**
 * Validate property value ranges
 */
export function validateValueRanges(code: string, tab: TabType): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    for (const prop of parsed.properties) {
      const value = prop.value

      // Check for suspiciously large values
      if (typeof value === 'number') {
        if (['pad', 'mar', 'gap', 'rad', 'border'].includes(prop.name) && value > 100) {
          warnings.push({
            type: 'POSSIBLE_TYPO',
            tab,
            line: i + 1,
            message: `Value ${value} for "${prop.name}" seems unusually large`,
            suggestion: 'Double-check this value'
          })
        }

        if (['w', 'h'].includes(prop.name) && value > 2000) {
          warnings.push({
            type: 'POSSIBLE_TYPO',
            tab,
            line: i + 1,
            message: `Value ${value} for "${prop.name}" seems unusually large`,
            suggestion: 'Double-check this value'
          })
        }

        if (prop.name === 'weight' && ![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(value)) {
          warnings.push({
            type: 'POSSIBLE_TYPO',
            tab,
            line: i + 1,
            message: `Font weight ${value} is non-standard`,
            suggestion: 'Standard weights are 100-900 in increments of 100'
          })
        }
      }
    }
  }

  return warnings
}
