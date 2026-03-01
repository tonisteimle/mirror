/**
 * TypedPropertyPanel Component
 *
 * Shows type-specific property panels in the sidebar based on the selected component.
 * Uses the same picker mapping as the editor inline panels (getPickerForType).
 * For custom components, resolves the base type via the registry.
 */

import { memo, useMemo, useCallback, useState } from 'react'
import type { TokenValue, ComponentTemplate } from '../parser/types'
import { getPickerForType, type PickerType } from '../hooks/useEditorTriggers'
import { InlineLayoutPanel, type PanelTabId } from './InlineLayoutPanel'
import { InlineTypographyPanel } from './InlineTypographyPanel'
import { InlineBorderPanel } from './InlineBorderPanel'
import { colors } from '../theme'

// ============================================
// Types
// ============================================

interface TypedPropertyPanelProps {
  selectedLine: number | null
  layoutCode: string
  tokens: Map<string, TokenValue>
  registry: Map<string, ComponentTemplate>
  onCodeChange: (newCode: string) => void
  onClose?: () => void
  width?: number
  editorCode?: string
}

type TabType = 'layout' | 'font' | 'border' | 'icon'

// ============================================
// Utility Functions
// ============================================

/**
 * Extract the component name from a line of Mirror DSL code.
 */
function getComponentName(line: string): string {
  const trimmed = line.trim()
  // Handle list items: "- Button"
  const match = trimmed.match(/^-?\s*([A-Z][\w]*)/)
  return match ? match[1] : 'Element'
}

/**
 * Extract the component prefix and properties from a line.
 * E.g., "Button pad 12, gap 8" -> { prefix: "Button ", props: "pad 12, gap 8" }
 */
function parseLineContent(lineContent: string): { prefix: string; props: string } {
  const match = lineContent.match(/^(\s*(?:-\s*)?(?:\w+:)?\s*\w+\s*)(.*)$/)
  if (match) {
    return { prefix: match[1], props: match[2] }
  }
  return { prefix: '', props: lineContent }
}

/**
 * Recursively find the base primitive type for a custom component.
 * E.g., MyButton: Button -> Button
 */
function getBaseType(name: string, registry: Map<string, ComponentTemplate>): string {
  const def = registry.get(name)
  if (!def?.extends) return name
  return getBaseType(def.extends, registry)
}

/**
 * Get available tabs for a picker type.
 */
function getTabsForPickerType(pickerType: PickerType): PanelTabId[] {
  switch (pickerType) {
    case 'button':
      return ['layout', 'font', 'border']
    case 'text':
      return ['font']
    case 'input':
      return ['layout', 'border', 'font']
    case 'image':
      return ['layout', 'border']
    case 'icon':
      return ['icon']
    case 'default':
    default:
      return ['layout', 'border']
  }
}

/**
 * Get the default tab for a picker type.
 */
function getDefaultTabForPickerType(pickerType: PickerType): TabType {
  switch (pickerType) {
    case 'text':
      return 'font'
    case 'icon':
      return 'icon'
    default:
      return 'layout'
  }
}

// ============================================
// Icons
// ============================================

const Icons = {
  Close: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
}

// ============================================
// Design Tokens
// ============================================

const t = {
  bg: '#1A1A1A',
  border: '#2A2A2A',
  text: '#E5E5E5',
  textMuted: '#666',
}

// ============================================
// Main Component
// ============================================

export const TypedPropertyPanel = memo(function TypedPropertyPanel({
  selectedLine,
  layoutCode,
  tokens: tokenMap,
  registry,
  onCodeChange,
  onClose,
  width = 360,
  editorCode,
}: TypedPropertyPanelProps) {
  const lines = useMemo(() => layoutCode.split('\n'), [layoutCode])

  // Get the selected line content
  const lineIndex = selectedLine
  const lineContent = lineIndex !== null && lineIndex >= 0 && lineIndex < lines.length
    ? lines[lineIndex]
    : null

  // Get component name and resolve to base type
  const { componentName, pickerType } = useMemo(() => {
    if (!lineContent) return { componentName: null, pickerType: null as PickerType }

    const name = getComponentName(lineContent)
    const baseType = getBaseType(name, registry)
    const picker = getPickerForType(baseType) || 'default'

    return { componentName: name, pickerType: picker }
  }, [lineContent, registry])

  // Parse line into prefix and props
  const { prefix, props } = useMemo(() => {
    if (!lineContent) return { prefix: '', props: '' }
    return parseLineContent(lineContent)
  }, [lineContent])

  // Get available tabs for this picker type
  const availableTabs = useMemo(() =>
    getTabsForPickerType(pickerType),
    [pickerType]
  )

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    getDefaultTabForPickerType(pickerType)
  )

  // Reset tab when picker type changes
  useMemo(() => {
    const defaultTab = getDefaultTabForPickerType(pickerType)
    if (!availableTabs.includes(activeTab as PanelTabId)) {
      setActiveTab(defaultTab)
    }
  }, [pickerType, availableTabs, activeTab])

  // Handle tab switch
  const handleSwitchPanel = useCallback((panel: PanelTabId) => {
    if (availableTabs.includes(panel)) {
      setActiveTab(panel as TabType)
    }
  }, [availableTabs])

  // Handle property code changes - merge with prefix
  const handleCodeChange = useCallback((propCode: string) => {
    if (lineIndex === null) return

    const newLine = propCode
      ? prefix.trimEnd() + ' ' + propCode
      : prefix.trimEnd()

    const newLines = [...lines]
    newLines[lineIndex] = newLine
    onCodeChange(newLines.join('\n'))
  }, [lineIndex, prefix, lines, onCodeChange])

  // Handle selection (for panels that need it)
  const handleSelect = useCallback((propCode: string) => {
    handleCodeChange(propCode)
  }, [handleCodeChange])

  // Empty state
  if (selectedLine === null || !lineContent) {
    return (
      <aside
        style={{
          width,
          height: '100%',
          backgroundColor: t.bg,
          borderLeft: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div style={{ color: t.textMuted, fontSize: 10, textAlign: 'center' }}>
          Element auswählen<br />im Preview
        </div>
      </aside>
    )
  }

  // Dummy position for embedded panels (not used in embedded mode)
  const dummyPosition = { x: 0, y: 0 }

  return (
    <aside
      role="complementary"
      aria-label="Property panel"
      data-testid="panel-properties"
      style={{
        width,
        height: '100%',
        backgroundColor: t.bg,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>
          {componentName}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close property panel"
            style={{
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            <Icons.Close />
          </button>
        )}
      </div>

      {/* Content - Embedded Panel */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Icon Panel - simplified for sidebar (Icon picker has complex state) */}
        {pickerType === 'icon' && (
          <div style={{ padding: 16, color: t.textMuted, fontSize: 10, textAlign: 'center' }}>
            Icons können im Editor<br />bearbeitet werden
          </div>
        )}

        {/* Layout Tab */}
        {pickerType !== 'icon' && activeTab === 'layout' && (
          <InlineLayoutPanel
            isOpen={true}
            onClose={() => {}}
            onSelect={handleSelect}
            onCodeChange={handleCodeChange}
            position={dummyPosition}
            initialCode={props}
            editorCode={editorCode || layoutCode}
            showTabs={true}
            onSwitchPanel={handleSwitchPanel}
            availableTabs={availableTabs}
            embedded={true}
          />
        )}

        {/* Font Tab */}
        {pickerType !== 'icon' && activeTab === 'font' && (
          <InlineTypographyPanel
            isOpen={true}
            onClose={() => {}}
            onSelect={handleSelect}
            onCodeChange={handleCodeChange}
            position={dummyPosition}
            initialCode={props}
            editorCode={editorCode || layoutCode}
            showTabs={true}
            onSwitchPanel={handleSwitchPanel}
            availableTabs={availableTabs}
            embedded={true}
          />
        )}

        {/* Border Tab */}
        {pickerType !== 'icon' && activeTab === 'border' && (
          <InlineBorderPanel
            isOpen={true}
            onClose={() => {}}
            onSelect={handleSelect}
            onCodeChange={handleCodeChange}
            position={dummyPosition}
            initialCode={props}
            editorCode={editorCode || layoutCode}
            showTabs={true}
            onSwitchPanel={handleSwitchPanel}
            availableTabs={availableTabs}
            embedded={true}
          />
        )}
      </div>
    </aside>
  )
})
