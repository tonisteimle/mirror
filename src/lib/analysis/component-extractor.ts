/**
 * Component Extractor
 *
 * Extracts component definitions and instances from Mirror DSL code.
 * Part of the Analysis Foundation (Increment 2).
 */

import { BUILT_IN_COMPONENTS } from '../../parser/component-parser/constants'

/**
 * Represents an extracted component
 */
export interface ExtractedComponent {
  name: string
  isDefinition: boolean   // true for `Name:` definitions, false for `Name` instances
  properties: string[]    // Property names used
  slots: string[]         // Slot definitions (for definitions only)
  children: string[]      // Child component names
  line: number            // 0-indexed line number
  usageCount: number      // How many times this component is used
  inheritsFrom?: string   // Parent component if using inheritance
}

// Patterns for component detection
const COMPONENT_DEFINITION_REGEX = /^\s*([A-Z][A-Za-z0-9]*)\s*:\s*(?:([A-Z][A-Za-z0-9]*)\s*)?\{/
const COMPONENT_INSTANCE_REGEX = /^\s*(-\s+)?([A-Z][A-Za-z0-9]*)(\s+named\s+\w+)?\s*\{/
const SLOT_DEFINITION_REGEX = /^\s+([A-Z][A-Za-z0-9]*)\s*:\s*\{/
const PROPERTY_REGEX = /\b(width|height|padding|margin|gap|background|color|border|radius|opacity|size|weight|font|align|vertical|horizontal|center|wrap|between|stacked|grid|shadow|cursor|z|hidden|visible|disabled|scroll|clip|rotate|translate|hover-\w+|w|h|w-min|w-max|h-min|h-max|minw|maxw|minh|maxh|p|m|g|bg|c|bor|rad|o|ver|hor|cen)\b/g

// Use BUILT_IN_COMPONENTS from source of truth (imported above)

/**
 * Extracts all components from Mirror DSL code
 */
export function extractComponents(code: string): ExtractedComponent[] {
  const lines = code.split('\n')
  const components: ExtractedComponent[] = []
  const definitionNames = new Set<string>()
  const usageCounts = new Map<string, number>()

  // First pass: find all definitions and instances
  let currentDepth = 0
  let currentDefinition: ExtractedComponent | null = null
  let definitionStartDepth = -1
  let braceStack: Array<{ name: string; depth: number; isDefinition: boolean }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Count braces for depth tracking
    const openBraces = (line.match(/\{/g) || []).length
    const closeBraces = (line.match(/\}/g) || []).length

    // Check for component definition (Name: { or Name: Parent {)
    const defMatch = line.match(COMPONENT_DEFINITION_REGEX)
    if (defMatch) {
      const name = defMatch[1]
      const inheritsFrom = defMatch[2]

      // Check if this is a slot (inside a definition) or a top-level definition
      if (currentDefinition && currentDepth > 0) {
        // This is a slot definition inside another component
        if (!currentDefinition.slots.includes(name)) {
          currentDefinition.slots.push(name)
        }
        braceStack.push({ name, depth: currentDepth, isDefinition: false })
      } else {
        // This is a top-level component definition
        definitionNames.add(name)

        const component: ExtractedComponent = {
          name,
          isDefinition: true,
          properties: extractPropertiesFromLine(line),
          slots: [],
          children: [],
          line: i,
          usageCount: 0,
          inheritsFrom
        }

        components.push(component)
        currentDefinition = component
        definitionStartDepth = currentDepth
        braceStack.push({ name, depth: currentDepth, isDefinition: true })
      }
    } else {
      // Check for component instance (Name { or - Name {)
      const instMatch = line.match(COMPONENT_INSTANCE_REGEX)
      if (instMatch) {
        const name = instMatch[2]

        // Track usage
        usageCounts.set(name, (usageCounts.get(name) || 0) + 1)

        // Add to parent's children if we're inside a definition
        if (currentDefinition && currentDepth > definitionStartDepth) {
          if (!currentDefinition.children.includes(name)) {
            currentDefinition.children.push(name)
          }
        }

        // Only add non-builtin instances as components
        if (!BUILT_IN_COMPONENTS.has(name) && !definitionNames.has(name)) {
          // This is an instance of an undefined component
          const existing = components.find(c => c.name === name && !c.isDefinition)
          if (!existing) {
            components.push({
              name,
              isDefinition: false,
              properties: extractPropertiesFromLine(line),
              slots: [],
              children: [],
              line: i,
              usageCount: 1
            })
          }
        }

        braceStack.push({ name, depth: currentDepth, isDefinition: false })
      }
    }

    // Update depth
    currentDepth += openBraces - closeBraces

    // Pop from stack when we close braces
    while (braceStack.length > 0 && braceStack[braceStack.length - 1].depth >= currentDepth) {
      const popped = braceStack.pop()
      if (popped?.isDefinition) {
        currentDefinition = null
        definitionStartDepth = -1
      }
    }
  }

  // Update usage counts for definitions
  for (const component of components) {
    if (component.isDefinition) {
      component.usageCount = usageCounts.get(component.name) || 0
    }
  }

  return components
}

/**
 * Extracts property names from a line of code
 */
function extractPropertiesFromLine(line: string): string[] {
  const props: string[] = []
  let match
  while ((match = PROPERTY_REGEX.exec(line)) !== null) {
    if (!props.includes(match[1])) {
      props.push(match[1])
    }
  }
  // Reset regex state
  PROPERTY_REGEX.lastIndex = 0
  return props
}

/**
 * Counts how many times a component is used in the code
 */
export function findComponentUsages(code: string, componentName: string): number {
  const lines = code.split('\n')
  let count = 0

  for (const line of lines) {
    // Skip definitions and inheritance (Name: { or Child: Parent {)
    if (COMPONENT_DEFINITION_REGEX.test(line)) {
      continue
    }

    // Match both regular instances and list instances (- Component { or Component {)
    const instancePattern = new RegExp(
      `(?:^|[^A-Za-z0-9])${componentName}(?:\\s+named\\s+\\w+)?\\s*\\{`
    )
    if (instancePattern.test(line)) {
      count++
    }
  }

  return count
}

/**
 * Gets only component definitions (not instances)
 */
export function getDefinitions(components: ExtractedComponent[]): ExtractedComponent[] {
  return components.filter(c => c.isDefinition)
}

/**
 * Gets only component instances (not definitions)
 */
export function getInstances(components: ExtractedComponent[]): ExtractedComponent[] {
  return components.filter(c => !c.isDefinition)
}

/**
 * Finds components that are defined but never used
 */
export function findUnusedDefinitions(components: ExtractedComponent[]): ExtractedComponent[] {
  return components.filter(c => c.isDefinition && c.usageCount === 0)
}

/**
 * Finds components that are used but not defined
 */
export function findUndefinedComponents(
  components: ExtractedComponent[],
  code: string
): string[] {
  const defined = new Set(components.filter(c => c.isDefinition).map(c => c.name))
  const used = new Set<string>()

  // Find all component usages
  const lines = code.split('\n')
  for (const line of lines) {
    const match = line.match(COMPONENT_INSTANCE_REGEX)
    if (match) {
      const name = match[2]
      if (!BUILT_IN_COMPONENTS.has(name) && !defined.has(name)) {
        used.add(name)
      }
    }
  }

  return [...used]
}

/**
 * Gets the inheritance chain for a component
 */
export function getInheritanceChain(
  components: ExtractedComponent[],
  componentName: string
): string[] {
  const chain: string[] = []
  let current = components.find(c => c.name === componentName && c.isDefinition)

  while (current) {
    chain.push(current.name)
    if (current.inheritsFrom) {
      current = components.find(c => c.name === current!.inheritsFrom && c.isDefinition)
    } else {
      break
    }
  }

  return chain
}
