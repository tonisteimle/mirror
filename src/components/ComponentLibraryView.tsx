/**
 * ComponentLibraryView - Simple table showing all defined components
 *
 * Clean layout: Kategorie | Komponente | Status
 * Components render directly in the chosen theme without wrapper boxes.
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

// Categorize components by their purpose
function categorizeComponent(name: string): string {
  const lower = name.toLowerCase()
  if (['button', 'link', 'toggle', 'checkbox', 'radio', 'switch'].some(k => lower.includes(k))) return 'Actions'
  if (['input', 'textarea', 'select', 'field', 'form'].some(k => lower.includes(k))) return 'Inputs'
  if (['card', 'panel', 'modal', 'dialog', 'drawer', 'sheet'].some(k => lower.includes(k))) return 'Containers'
  if (['nav', 'menu', 'tab', 'sidebar', 'header', 'footer', 'toolbar'].some(k => lower.includes(k))) return 'Navigation'
  if (['list', 'table', 'grid', 'row', 'cell', 'item'].some(k => lower.includes(k))) return 'Data'
  if (['alert', 'toast', 'badge', 'tag', 'chip'].some(k => lower.includes(k))) return 'Feedback'
  if (['avatar', 'icon', 'image', 'logo'].some(k => lower.includes(k))) return 'Media'
  if (['title', 'text', 'label', 'heading'].some(k => lower.includes(k))) return 'Typography'
  return 'Other'
}

export const ComponentLibraryView = memo(function ComponentLibraryView({
  registry,
  tokens = new Map(),
}: ComponentLibraryViewProps) {
  // Get all component definitions
  const componentDefinitions = useMemo(() => {
    const definitions: Array<{
      name: string
      template: ComponentTemplate
      category: string
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
        category: categorizeComponent(name),
        states: Array.from(states).filter(s => BEHAVIOR_STATES.includes(s)),
      })
    })

    // Sort by category, then name
    return definitions.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category)
      return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name)
    })
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
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 100px',
          gap: '16px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Kategorie
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Komponente
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status
          </div>
        </div>

        {/* Component Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {componentDefinitions.map(({ name, category, states }) => (
            <div
              key={name}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 100px',
                gap: '16px',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${colors.border}20`,
              }}
            >
              {/* Category */}
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                {category}
              </div>

              {/* Component Preview - rendered directly */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: colors.text, minWidth: '100px' }}>{name}</span>
                <ComponentPreview name={name} />
              </div>

              {/* States */}
              <div style={{ fontSize: '11px', color: colors.textMuted }}>
                {states.length > 0 ? states.join(', ') : 'default'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewProviders>
  )
})

interface ComponentPreviewProps {
  name: string
  state?: string
}

const ComponentPreview = memo(function ComponentPreview({
  name,
  state,
}: ComponentPreviewProps) {
  const element = useMemo(() => {
    const node: ASTNode = {
      id: `lib-preview-${name}-${state || 'default'}`,
      name,
      type: 'component',
      properties: {},
      children: [],
      line: 0,
    }

    try {
      return generateReactElement([node], {})
    } catch {
      return <span style={{ color: colors.textMuted, fontSize: '12px' }}>Error</span>
    }
  }, [name, state])

  if (state) {
    return (
      <div data-force-state={state} style={{ display: 'contents' }}>
        {element}
      </div>
    )
  }

  return <>{element}</>
})
