/**
 * ComponentLibraryView - Shows all defined components with all their states
 *
 * Layout: Name | [Default] [State1] [State2] ...
 * Components render directly with their full styling.
 * Section headers can be defined with "--- Title ---" in the code.
 */

import { memo, useMemo } from 'react'
import type { ComponentTemplate, TokenValue, ASTNode } from '../parser/types'
import { generateReactElement } from '../generator/react-generator'
import { PreviewProviders } from '../generator/preview-providers'
import { colors } from '../theme'

interface ComponentLibraryViewProps {
  /** Component registry from parsing */
  registry: Map<string, ComponentTemplate>
  /** Design tokens */
  tokens?: Map<string, TokenValue>
  /** Components source code for section extraction */
  componentsCode?: string
  /** Tokens source code (needed to calculate line offset) */
  tokensCode?: string
}

interface Section {
  name: string
  lineStart: number
  lineEnd: number
}

/**
 * Extract sections from components code.
 * Sections are defined with `--- Name ---` syntax.
 */
function extractSections(code: string): Section[] {
  const sections: Section[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = line.match(/^---\s*(.+?)\s*---$/)
    if (match) {
      // Close previous section
      if (sections.length > 0) {
        sections[sections.length - 1].lineEnd = i - 1
      }
      sections.push({
        name: match[1],
        lineStart: i + 1,
        lineEnd: lines.length - 1, // Will be updated when next section starts
      })
    }
  }

  return sections
}

// Known behavior states that can be toggled
const BEHAVIOR_STATES = ['hover', 'active', 'focus', 'disabled', 'selected', 'highlighted', 'expanded', 'collapsed', 'on', 'off', 'valid', 'invalid']

export const ComponentLibraryView = memo(function ComponentLibraryView({
  registry,
  tokens = new Map(),
  componentsCode = '',
  tokensCode = '',
}: ComponentLibraryViewProps) {
  // Calculate the line offset: tokensCode lines + 2 (for \n\n separator)
  const componentsLineOffset = useMemo(() => {
    if (!tokensCode.trim()) return 0
    return tokensCode.split('\n').length + 2 // +2 for the \n\n separator
  }, [tokensCode])

  // Extract sections from source code (with offset applied)
  const sections = useMemo(() => {
    const rawSections = extractSections(componentsCode)
    // Apply offset to section line numbers
    return rawSections.map(s => ({
      ...s,
      lineStart: s.lineStart + componentsLineOffset,
      lineEnd: s.lineEnd + componentsLineOffset,
    }))
  }, [componentsCode, componentsLineOffset])

  // Get all component definitions with their states, grouped by section
  const { componentDefinitions, groupedBySection } = useMemo(() => {
    const definitions: Array<{
      name: string
      template: ComponentTemplate
      states: string[]
      line?: number
    }> = []

    // Get section names to filter them out from components
    const sectionNames = new Set(sections.map(s => s.name))

    registry.forEach((template, name) => {
      // Skip internal/primitive components and scoped child templates
      // Scoped names like "TestButton.Text" are child templates, not top-level components
      if (name.startsWith('_') || name === 'Box' || name === 'Text') return
      if (name.includes('.')) return // Skip scoped child templates (e.g., Parent.Child)
      // Skip Input/Textarea special children
      if (name === 'Value' || name === 'Placeholder') return
      // Skip components that match section header names (--- Name --- creates false components)
      if (sectionNames.has(name)) return

      // Collect states from the template
      const states = new Set<string>()

      if (template.states) {
        for (const state of template.states) {
          states.add(state.name)
        }
      }

      // Also collect states from children
      const collectStatesFromChildren = (children: ASTNode[]) => {
        for (const child of children || []) {
          if (child.states) {
            for (const state of child.states) {
              states.add(state.name)
            }
          }
          if (child.children) {
            collectStatesFromChildren(child.children)
          }
        }
      }
      collectStatesFromChildren(template.children || [])

      definitions.push({
        name,
        template,
        states: Array.from(states).filter(s => BEHAVIOR_STATES.includes(s)),
        line: template.line,
      })
    })

    // Group components by section
    const grouped = new Map<string, typeof definitions>()
    const unsorted: typeof definitions = []

    // Initialize sections
    for (const section of sections) {
      grouped.set(section.name, [])
    }

    // Sort components into sections based on line numbers
    for (const def of definitions) {
      if (def.line === undefined) {
        unsorted.push(def)
        continue
      }

      let foundSection = false
      for (const section of sections) {
        if (def.line >= section.lineStart && def.line <= section.lineEnd) {
          grouped.get(section.name)!.push(def)
          foundSection = true
          break
        }
      }

      if (!foundSection) {
        unsorted.push(def)
      }
    }

    // Add unsorted to beginning or create default section
    if (unsorted.length > 0) {
      if (sections.length > 0) {
        // Prepend to first section
        const firstSection = sections[0]
        const existing = grouped.get(firstSection.name) || []
        grouped.set(firstSection.name, [...unsorted, ...existing])
      } else {
        grouped.set('Components', unsorted)
      }
    }

    return { componentDefinitions: definitions, groupedBySection: grouped }
  }, [registry, sections])

  if (componentDefinitions.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        backgroundColor: colors.preview,
        padding: '32px',
        textAlign: 'center',
      }}>
        <div>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Keine Komponenten definiert</p>
          <p style={{ fontSize: '13px', opacity: 0.7 }}>
            Komponenten im Components Tab definieren:<br />
            <code style={{ backgroundColor: colors.panel, padding: '2px 6px', borderRadius: '4px' }}>
              Button: pad 12, bg #3B82F6
            </code>
          </p>
        </div>
      </div>
    )
  }

  // Get section names in order (or just "Components" if no sections)
  const sectionNames = sections.length > 0
    ? sections.map(s => s.name)
    : Array.from(groupedBySection.keys())

  return (
    <PreviewProviders
      registry={registry}
      tokens={tokens}
      dataRecords={new Map()}
      dataSchemas={[]}
    >
      <div style={{
        height: '100%',
        backgroundColor: colors.preview,
        overflow: 'auto',
        padding: '24px',
      }}>
        {/* Sections */}
        {sectionNames.map((sectionName, sectionIdx) => {
          const sectionComponents = groupedBySection.get(sectionName) || []
          if (sectionComponents.length === 0) return null

          return (
            <div key={sectionName} style={{ marginBottom: sectionIdx < sectionNames.length - 1 ? '32px' : 0 }}>
              {/* Section Title */}
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#FAFAFA',
              }}>
                {sectionName}
              </h2>

              {/* Component Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {sectionComponents.map(({ name, template, states }) => {
                  // Combine default + other states
                  const allStates = ['default', ...states]

                  return (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* All States - Component name only on first row */}
                      {allStates.map((stateName, stateIndex) => (
                        <div
                          key={stateName}
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          {/* Component Name - only on first state */}
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: colors.text,
                            minWidth: '120px',
                          }}>
                            {stateIndex === 0 ? name : ''}
                          </div>

                          {/* State Label */}
                          <div style={{
                            fontSize: '10px',
                            color: colors.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '70px',
                          }}>
                            {stateName}
                          </div>

                          {/* Rendered Component */}
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <StatePreview
                              name={name}
                              template={template}
                              stateName={stateName}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </PreviewProviders>
  )
})

interface StatePreviewProps {
  name: string
  template: ComponentTemplate
  stateName: string
}

const StatePreview = memo(function StatePreview({
  name,
  template,
  stateName,
}: StatePreviewProps) {
  const element = useMemo(() => {
    // Create a full node from the template
    const node: ASTNode = {
      id: `lib-preview-${name}-${stateName}`,
      name,
      type: 'component',
      properties: { ...template.properties },
      children: template.children ? [...template.children] : [],
      content: template.content,
      states: template.states,
      eventHandlers: template.eventHandlers,
      activeState: stateName === 'default' ? undefined : stateName,
      line: 0,
    }

    try {
      return generateReactElement([node], {})
    } catch {
      return <span style={{ color: colors.textMuted, fontSize: '12px' }}>Error</span>
    }
  }, [name, template, stateName])

  return <>{element}</>
})
