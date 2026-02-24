/**
 * InputPropertyPanel Component
 *
 * Container for Input/Textarea components with Input, Layout, Border, Font tabs.
 * Triggered by: Input, Textarea + space
 *
 * Works with full line content (e.g., "Input type email, pad 12")
 * and extracts/updates just the properties portion.
 */

import { memo, useState, useCallback, useMemo } from 'react'
import { InlineInputPanel } from './InlineInputPanel'
import { InlineLayoutPanel, type PanelTabId } from './InlineLayoutPanel'
import { InlineBorderPanel } from './InlineBorderPanel'
import { InlineTypographyPanel } from './InlineTypographyPanel'

type TabType = 'input' | 'layout' | 'border' | 'font'

interface InputPropertyPanelProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  /** The full line content (e.g., "Input type email, pad 12") */
  lineContent: string
  /** Callback when code changes - receives the full updated line */
  onCodeChange: (newCode: string) => void
  /** Full editor code for extracting defined tokens */
  editorCode?: string
}

/**
 * Extract the component prefix and properties from a line.
 * E.g., "Input type email" -> { prefix: "Input ", props: "type email" }
 */
function parseLineContent(lineContent: string): { prefix: string; props: string } {
  // Match component name followed by optional space
  const match = lineContent.match(/^(\s*(?:\w+:)?\s*\w+\s*)(.*)$/)
  if (match) {
    return { prefix: match[1], props: match[2] }
  }
  return { prefix: '', props: lineContent }
}

const AVAILABLE_TABS: PanelTabId[] = ['input', 'layout', 'border', 'font']

export const InputPropertyPanel = memo(function InputPropertyPanel({
  isOpen,
  position,
  onClose,
  lineContent,
  onCodeChange,
  editorCode,
}: InputPropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('input')

  // Parse the line content into prefix and properties
  const { prefix, props } = useMemo(() => parseLineContent(lineContent), [lineContent])

  const handleSwitchPanel = useCallback((panel: PanelTabId) => {
    if (panel === 'input' || panel === 'layout' || panel === 'border' || panel === 'font') {
      setActiveTab(panel)
    }
  }, [])

  // Handle property code changes - merge with prefix
  // Ensure there's exactly one space between prefix and properties
  const handleCodeChange = useCallback((propCode: string) => {
    if (!propCode) {
      onCodeChange(prefix.trimEnd())
      return
    }
    // Ensure prefix ends with exactly one space
    const normalizedPrefix = prefix.trimEnd() + ' '
    onCodeChange(normalizedPrefix + propCode)
  }, [prefix, onCodeChange])

  // Handle final selection - same as code change but closes panel
  const handleSelect = useCallback((propCode: string) => {
    handleCodeChange(propCode)
    onClose()
  }, [handleCodeChange, onClose])

  if (!isOpen) return null

  // Render only the active panel
  // Each panel renders its own tab header via showTabs prop
  return (
    <>
      {activeTab === 'input' && (
        <InlineInputPanel
          isOpen={true}
          onClose={onClose}
          onSelect={handleSelect}
          onCodeChange={handleCodeChange}
          position={position}
          initialCode={props}
          showTabs={true}
          onSwitchPanel={handleSwitchPanel}
          availableTabs={AVAILABLE_TABS}
        />
      )}
      {activeTab === 'layout' && (
        <InlineLayoutPanel
          isOpen={true}
          onClose={onClose}
          onSelect={handleSelect}
          onCodeChange={handleCodeChange}
          position={position}
          initialCode={props}
          editorCode={editorCode}
          showTabs={true}
          onSwitchPanel={handleSwitchPanel}
          availableTabs={AVAILABLE_TABS}
        />
      )}
      {activeTab === 'border' && (
        <InlineBorderPanel
          isOpen={true}
          onClose={onClose}
          onSelect={handleSelect}
          onCodeChange={handleCodeChange}
          position={position}
          initialCode={props}
          editorCode={editorCode}
          showTabs={true}
          onSwitchPanel={handleSwitchPanel}
          availableTabs={AVAILABLE_TABS}
        />
      )}
      {activeTab === 'font' && (
        <InlineTypographyPanel
          isOpen={true}
          onClose={onClose}
          onSelect={handleSelect}
          onCodeChange={handleCodeChange}
          position={position}
          initialCode={props}
          editorCode={editorCode}
          showTabs={true}
          onSwitchPanel={handleSwitchPanel}
          availableTabs={AVAILABLE_TABS}
        />
      )}
    </>
  )
})
