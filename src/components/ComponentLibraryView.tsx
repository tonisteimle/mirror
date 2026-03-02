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
}

// Known behavior states that can be toggled
const BEHAVIOR_STATES = ['hover', 'active', 'focus', 'disabled', 'selected', 'highlighted', 'expanded', 'collapsed', 'on', 'off', 'valid', 'invalid']

export const ComponentLibraryView = memo(function ComponentLibraryView({
  registry,
  tokens = new Map(),
}: ComponentLibraryViewProps) {
  // Get all component definitions with their states
  const componentDefinitions = useMemo(() => {
    const definitions: Array<{
      name: string
      template: ComponentTemplate
      states: string[]
    }> = []

    registry.forEach((template, name) => {
      // Skip internal/primitive components
      if (name.startsWith('_') || name === 'Box' || name === 'Text') return

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
      })
    })

    // Keep order from registry (user-defined order via --- sections ---)
    return definitions
  }, [registry])

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
        {/* Component Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {componentDefinitions.map(({ name, template, states }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Component Name */}
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: colors.text,
              }}>
                {name}
              </div>

              {/* All States Row */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                gap: '16px',
              }}>
                {/* Default state */}
                <StatePreview
                  name={name}
                  template={template}
                  stateName="default"
                />

                {/* Other states */}
                {states.map(stateName => (
                  <StatePreview
                    key={stateName}
                    name={name}
                    template={template}
                    stateName={stateName}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      {/* State Label */}
      <div style={{
        fontSize: '10px',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {stateName}
      </div>

      {/* Rendered Component */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {element}
      </div>
    </div>
  )
})
