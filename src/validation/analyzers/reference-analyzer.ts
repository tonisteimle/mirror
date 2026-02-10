/**
 * Analyze component references and dependencies
 */

import type { ComponentInfo, TabType, ValidationError, ValidationWarning } from '../types'
import { analyzeLine } from './line-analyzer'

export interface ReferenceAnalysis {
  components: Map<string, ComponentInfo>
  references: Map<string, { tab: TabType; line: number }[]>
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Build a component registry from components tab
 */
export function buildComponentRegistry(
  componentsCode: string
): Map<string, ComponentInfo> {
  const registry = new Map<string, ComponentInfo>()
  const lines = componentsCode.split('\n')

  let currentParent: string | null = null
  let parentIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isEmpty || parsed.isComment) continue

    if (parsed.isDefinition && parsed.componentName) {
      // New component definition
      const info: ComponentInfo = {
        name: parsed.componentName,
        definedAt: { tab: 'components', line: i + 1 },
        properties: new Set(parsed.properties.map(p => p.name)),
        children: [],
        extendsFrom: parsed.fromTarget
      }

      registry.set(parsed.componentName, info)
      currentParent = parsed.componentName
      parentIndent = parsed.indent

    } else if (parsed.indent > parentIndent && currentParent && parsed.componentName) {
      // Child component (scoped)
      const scopedName = `${currentParent}.${parsed.componentName}`
      const info: ComponentInfo = {
        name: scopedName,
        definedAt: { tab: 'components', line: i + 1 },
        properties: new Set(parsed.properties.map(p => p.name)),
        children: [],
        extendsFrom: parsed.fromTarget
      }

      registry.set(scopedName, info)

      // Also register by base name for lookup
      if (!registry.has(parsed.componentName)) {
        registry.set(parsed.componentName, info)
      }

      // Add to parent's children
      const parent = registry.get(currentParent)
      if (parent) {
        parent.children.push(parsed.componentName)
      }
    }
  }

  return registry
}

/**
 * Analyze all references in layout code
 */
export function analyzeReferences(
  layoutCode: string,
  registry: Map<string, ComponentInfo>
): ReferenceAnalysis {
  const references = new Map<string, { tab: TabType; line: number }[]>()
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const lines = layoutCode.split('\n')

  // Track ad-hoc definitions from layout (components defined with properties)
  const adHocDefinitions = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)

    if (parsed.isEmpty || parsed.isComment) continue

    // Check main component reference
    if (parsed.componentName) {
      addReference(references, parsed.componentName, 'layout', i + 1)

      // If component has properties, register as ad-hoc definition
      const hasProperties = parsed.properties.length > 0
      if (hasProperties) {
        adHocDefinitions.add(parsed.componentName)
      }

      // Only warn if: no properties AND not in registry AND not an ad-hoc definition
      if (!hasProperties && !registry.has(parsed.componentName) && !adHocDefinitions.has(parsed.componentName)) {
        warnings.push({
          type: 'MISSING_CHILD_DEFINITION',
          tab: 'layout',
          line: i + 1,
          message: `Component "${parsed.componentName}" is not defined`,
          suggestion: `Add properties for ad-hoc definition or define in Components tab`
        })
      }
    }

    // Also track inline slots as ad-hoc definitions
    for (const slot of parsed.inlineSlots) {
      adHocDefinitions.add(slot.name)
    }

    // Check 'from' reference
    if (parsed.hasFrom && parsed.fromTarget) {
      addReference(references, parsed.fromTarget, 'layout', i + 1)

      if (!registry.has(parsed.fromTarget)) {
        errors.push({
          type: 'INVALID_REFERENCE',
          tab: 'layout',
          line: i + 1,
          message: `Cannot extend from "${parsed.fromTarget}" - component not defined`,
          source: lines[i]
        })
      }
    }

    // Check inline slot references
    for (const slot of parsed.inlineSlots) {
      addReference(references, slot.name, 'layout', i + 1)
    }
  }

  return { components: registry, references, errors, warnings }
}

/**
 * Check for circular references in 'from' chains
 */
export function checkCircularReferences(
  registry: Map<string, ComponentInfo>
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [name, info] of registry) {
    if (info.extendsFrom) {
      const visited = new Set<string>([name])
      let current: string | null = info.extendsFrom

      while (current) {
        if (visited.has(current)) {
          errors.push({
            type: 'CIRCULAR_REFERENCE',
            tab: 'components',
            line: info.definedAt.line,
            message: `Circular reference detected: ${name} -> ... -> ${current}`,
            source: name
          })
          break
        }

        visited.add(current)
        const parent = registry.get(current)
        current = parent?.extendsFrom || null
      }
    }
  }

  return errors
}

/**
 * Find unused components (defined but never used)
 */
export function findUnusedComponents(
  registry: Map<string, ComponentInfo>,
  references: Map<string, { tab: TabType; line: number }[]>
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []

  for (const [name, info] of registry) {
    // Skip scoped children - they're used implicitly
    if (name.includes('.')) continue

    const refs = references.get(name) || []
    // Only count layout references (not the definition itself)
    const layoutRefs = refs.filter(r => r.tab === 'layout')

    if (layoutRefs.length === 0) {
      warnings.push({
        type: 'UNUSED_COMPONENT',
        tab: 'components',
        line: info.definedAt.line,
        message: `Component "${name}" is defined but never used in layout`
      })
    }
  }

  return warnings
}

/**
 * Helper to add a reference
 */
function addReference(
  refs: Map<string, { tab: TabType; line: number }[]>,
  name: string,
  tab: TabType,
  line: number
): void {
  if (!refs.has(name)) {
    refs.set(name, [])
  }
  refs.get(name)!.push({ tab, line })
}
