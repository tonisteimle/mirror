/**
 * Reference-Based Testing Utilities
 *
 * Uses docs/reference.json as single source of truth for Mirror DSL.
 * Ensures tests stay in sync with documentation.
 */

import referenceData from '../../docs/reference.json'

export interface ReferenceItem {
  name: string
  description: string
}

export interface ReferenceSubsection {
  id: string
  title: string
  description?: string
  syntax?: string[]
  examples?: string[]
  items?: ReferenceItem[]
}

export interface ReferenceSection {
  id: string
  title: string
  description?: string
  subsections?: ReferenceSubsection[]
}

export interface Reference {
  version: string
  sections: ReferenceSection[]
}

// Type the imported JSON
const reference = referenceData as Reference

// =============================================================================
// Section Access
// =============================================================================

/**
 * Get a section by ID.
 */
export function getSection(id: string): ReferenceSection | undefined {
  return reference.sections.find(s => s.id === id)
}

/**
 * Get a subsection by path "sectionId/subsectionId".
 */
export function getSubsection(path: string): ReferenceSubsection | undefined {
  const [sectionId, subsectionId] = path.split('/')
  const section = getSection(sectionId)
  return section?.subsections?.find(s => s.id === subsectionId)
}

/**
 * Get all items from a subsection.
 */
export function getItems(path: string): ReferenceItem[] {
  return getSubsection(path)?.items || []
}

/**
 * Get all examples from a subsection.
 */
export function getExamples(path: string): string[] {
  return getSubsection(path)?.examples || []
}

/**
 * Get all syntax patterns from a subsection.
 */
export function getSyntax(path: string): string[] {
  return getSubsection(path)?.syntax || []
}

// =============================================================================
// Property Extraction
// =============================================================================

/**
 * Extract all property names with their aliases.
 * Returns: { 'bg': ['background', 'bg'], 'pad': ['padding', 'p', 'pad'], ... }
 */
export function getAllProperties(): Map<string, string[]> {
  const props = new Map<string, string[]>()

  const propertySubsections = [
    'properties/layout',
    'properties/alignment',
    'properties/sizing',
    'properties/spacing',
    'properties/colors',
    'properties/border',
    'properties/typography',
    'properties/visuals',
    'properties/scroll',
    'properties/hover-properties',
  ]

  for (const path of propertySubsections) {
    const items = getItems(path)
    for (const item of items) {
      // Parse "name / alias" format
      const names = item.name.split('/').map(n => n.trim())
      const primary = names[names.length - 1] // Last one is usually the short form
      props.set(primary, names)
    }
  }

  return props
}

/**
 * Get all layout properties.
 */
export function getLayoutProperties(): string[] {
  return getItems('properties/layout').map(i => i.name.split('/')[0].trim())
}

/**
 * Get all color properties.
 */
export function getColorProperties(): string[] {
  return getItems('properties/colors').map(i => i.name.split('/')[0].trim())
}

/**
 * Get all system states.
 */
export function getSystemStates(): string[] {
  return getItems('states/system-states').map(i => i.name)
}

/**
 * Get all behavior states.
 */
export function getBehaviorStates(): string[] {
  return getItems('states/behavior-states').map(i => i.name)
}

/**
 * Get all events.
 */
export function getEvents(): string[] {
  return getItems('events/basis-events').map(i => i.name)
}

/**
 * Get all actions.
 */
export function getActions(): string[] {
  const actionSubsections = [
    'actions/navigation',
    'actions/selection',
    'actions/state-changes',
    'actions/assignments',
  ]

  const actions: string[] = []
  for (const path of actionSubsections) {
    actions.push(...getItems(path).map(i => i.name))
  }
  return actions
}

/**
 * Get all action targets.
 */
export function getActionTargets(): string[] {
  return getItems('actions/targets').map(i => i.name)
}

/**
 * Get all primitives.
 */
export function getPrimitives(): string[] {
  return getItems('primitives/primitives-list').map(i => {
    // Extract component name from "Image \"url\"" format
    const match = i.name.match(/^(\w+)/)
    return match ? match[1] : i.name
  })
}

/**
 * Get all animation types.
 */
export function getAnimations(): { showHide: string[], continuous: string[] } {
  return {
    showHide: getItems('animations/show-hide').map(i => i.name),
    continuous: getItems('animations/continuous').map(i => i.name),
  }
}

// =============================================================================
// Test Case Generation
// =============================================================================

/**
 * Generate test cases from examples in a subsection.
 * Each example becomes a test case that should parse without errors.
 */
export function generateExampleTestCases(path: string): string[] {
  return getExamples(path).map(example => {
    // Clean up example - remove comments, normalize
    return example
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, '').trim())
      .filter(line => line.length > 0)
      .join('\n')
  })
}

/**
 * Generate property test cases.
 * Returns [code, expectedProperty, expectedValue] tuples.
 */
export function generatePropertyTestCases(
  propertyName: string,
  values: Array<string | number>
): Array<[string, string, string | number]> {
  return values.map(value => [
    `Box ${propertyName} ${value}`,
    propertyName,
    value,
  ])
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a property name is valid according to reference.
 */
export function isValidProperty(name: string): boolean {
  const allProps = getAllProperties()
  for (const [, aliases] of allProps) {
    if (aliases.some(a => a.includes(name))) {
      return true
    }
  }
  return false
}

/**
 * Check if a state name is valid.
 */
export function isValidState(name: string): boolean {
  return [...getSystemStates(), ...getBehaviorStates()].includes(name)
}

/**
 * Check if an event name is valid.
 */
export function isValidEvent(name: string): boolean {
  return getEvents().includes(name)
}

/**
 * Check if an action name is valid.
 */
export function isValidAction(name: string): boolean {
  return getActions().includes(name)
}

// =============================================================================
// Export reference for direct access
// =============================================================================

export { reference }
