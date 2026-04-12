/**
 * Section Parser - Parse component sections from AST
 *
 * Parses `--- Section Name ---` comments in Mirror code to create
 * user-defined component sections in the panel.
 */

import type { AST, ComponentDefinition } from '../../../compiler'
import type { ComponentItem, ComponentSection } from './types'

/**
 * Pattern for section header comments: --- Section Name ---
 */
const SECTION_PATTERN = /^---\s*(.+?)\s*---$/

/**
 * Primitives that should not appear as user components
 */
const PRIMITIVES = new Set([
  'box', 'frame', 'text', 'button', 'input', 'icon', 'image', 'img', 'slot',
  'vbox', 'hbox', 'vstack', 'hstack', 'zstack', 'grid', 'list',
])

/**
 * Parse component sections from AST
 *
 * Looks for:
 * 1. Section headers: `--- Section Name ---` (as comment nodes or from source)
 * 2. Component definitions: `ComponentName: = ...`
 */
export function parseComponentSections(ast: AST, source?: string): ComponentSection[] {
  const sections: ComponentSection[] = []

  // Build component items from AST, filtering out primitives
  const componentItems: ComponentItem[] = ast.components
    .filter(component => !PRIMITIVES.has(component.name.toLowerCase()))
    .map(component => ({
    id: `user-${component.name}`,
    name: component.name,
    category: 'Components',
    template: component.name,
    icon: 'custom' as const,
    isUserDefined: true,
    description: `User-defined component`,
    line: component.line,
  }))

  // If source is provided, try to group components by sections
  if (source && componentItems.length > 0) {
    const lines = source.split('\n')
    let currentSection: ComponentSection | null = null
    const sectionBoundaries: Array<{ name: string; startLine: number }> = []

    // First pass: find all section headers and their line numbers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const sectionMatch = line.match(SECTION_PATTERN)

      if (sectionMatch) {
        sectionBoundaries.push({
          name: sectionMatch[1],
          startLine: i + 1, // 1-indexed
        })
      }
    }

    // If we found sections, group components into them
    if (sectionBoundaries.length > 0) {
      for (const item of componentItems) {
        const itemLine = (item as any).line ?? 0

        // Find which section this component belongs to
        let belongsToSection: string | null = null
        for (let i = sectionBoundaries.length - 1; i >= 0; i--) {
          if (itemLine >= sectionBoundaries[i].startLine) {
            belongsToSection = sectionBoundaries[i].name
            break
          }
        }

        if (belongsToSection) {
          // Find or create the section
          let section = sections.find(s => s.name === belongsToSection)
          if (!section) {
            section = { name: belongsToSection, items: [], isExpanded: true }
            sections.push(section)
          }
          section.items.push(item)
        }
      }

      // Add remaining components (before any section) to default "Components" section
      const assignedIds = new Set(sections.flatMap(s => s.items.map(i => i.id)))
      const unassigned = componentItems.filter(c => !assignedIds.has(c.id))

      if (unassigned.length > 0) {
        sections.push({
          name: 'Components',
          items: unassigned,
          isExpanded: true,
        })
      }

      return sections
    }
  }

  // No sections found or no source - create default section if we have components
  if (componentItems.length > 0) {
    sections.push({
      name: 'Components',
      items: componentItems,
      isExpanded: true,
    })
  }

  return sections
}

/**
 * Extract component template and properties from a definition
 */
export function extractComponentInfo(component: ComponentDefinition): Partial<ComponentItem> {
  const props: string[] = []

  // Extract properties from the component
  for (const prop of component.properties) {
    const values = prop.values.map(v => {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return String(v)
      }
      return ''
    }).filter(Boolean)

    if (values.length > 0) {
      props.push(`${prop.name} ${values.join(' ')}`)
    }
  }

  return {
    template: component.primitive || component.name,
    properties: props.length > 0 ? props.join(', ') : undefined,
  }
}
