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
  'box',
  'frame',
  'text',
  'button',
  'input',
  'icon',
  'image',
  'img',
  'slot',
  'vbox',
  'hbox',
  'vstack',
  'hstack',
  'zstack',
  'grid',
  'list',
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

  // Build component items from AST, filtering out primitives + `@hidden`
  // (internal helper components like RoutineRow that only make sense
  // inside their parent — author can hide them from the palette).
  const componentItems: ComponentItem[] = ast.components
    .filter(component => !PRIMITIVES.has(component.name.toLowerCase()))
    .filter(component => component.metadata?.hidden !== true)
    .map(component => ({
      id: `user-${component.name}`,
      name: component.name,
      // `@group <name>` directive overrides comment-section grouping.
      category: component.metadata?.group ?? 'Components',
      template: component.name,
      icon: 'custom' as const,
      isUserDefined: true,
      description: `User-defined component`,
      line: component.line,
      customIconName: component.metadata?.icon,
    }))

  // Group precedence:
  //   1. `@group <name>` directive (per-component override)
  //   2. `--- Section Name ---` comment boundary in source
  //   3. default "Components" section
  if (componentItems.length > 0) {
    // Pre-pass: find comment-based section boundaries (only when source given)
    const sectionBoundaries: Array<{ name: string; startLine: number }> = []
    if (source) {
      const lines = source.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const sectionMatch = lines[i].trim().match(SECTION_PATTERN)
        if (sectionMatch) {
          sectionBoundaries.push({ name: sectionMatch[1], startLine: i + 1 })
        }
      }
    }

    const addToSection = (groupName: string, item: ComponentItem): void => {
      let section = sections.find(s => s.name === groupName)
      if (!section) {
        section = { name: groupName, items: [], isExpanded: true }
        sections.push(section)
      }
      section.items.push(item)
    }

    for (const item of componentItems) {
      // 1. `@group` wins.
      if (item.category && item.category !== 'Components') {
        addToSection(item.category, item)
        continue
      }
      // 2. Comment-based section by line range.
      if (sectionBoundaries.length > 0) {
        let belongsTo: string | null = null
        const itemLine = item.line ?? 0
        for (let i = sectionBoundaries.length - 1; i >= 0; i--) {
          if (itemLine >= sectionBoundaries[i].startLine) {
            belongsTo = sectionBoundaries[i].name
            break
          }
        }
        if (belongsTo) {
          addToSection(belongsTo, item)
          continue
        }
      }
      // 3. Default catchall.
      addToSection('Components', item)
    }

    return sections
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
    const values = prop.values
      .map(v => {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          return String(v)
        }
        return ''
      })
      .filter(Boolean)

    if (values.length > 0) {
      props.push(`${prop.name} ${values.join(' ')}`)
    }
  }

  return {
    template: component.primitive || component.name,
    properties: props.length > 0 ? props.join(', ') : undefined,
  }
}
