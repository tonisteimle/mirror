/**
 * TabbedPropertyPanel Component
 *
 * Container that shows Layout, Typography, or Border panels with tabs.
 * Uses the panels' built-in tab support via showTabs/onSwitchPanel.
 * Triggered by: Button, Input keywords + space
 *
 * Works with full line content (e.g., "Button pad 12, gap 8")
 * and extracts/updates just the properties portion.
 */

import { memo, useState, useCallback, useMemo } from 'react'
import { InlineLayoutPanel, type PanelTabId } from './InlineLayoutPanel'
import { InlineTypographyPanel } from './InlineTypographyPanel'
import { InlineBorderPanel } from './InlineBorderPanel'

type TabType = 'layout' | 'font' | 'border'

const AVAILABLE_TABS: PanelTabId[] = ['layout', 'font', 'border']

interface TabbedPropertyPanelProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  /** The full line content (e.g., "Button pad 12, gap 8") */
  lineContent: string
  /** Callback when code changes - receives the full updated line */
  onCodeChange: (newCode: string) => void
  /** Full editor code for extracting defined tokens */
  editorCode?: string
  /** Token mode from project settings */
  useTokenMode?: boolean
  /** Callback when token mode changes */
  onTokenModeChange?: (mode: boolean) => void
}

/**
 * Extract the component prefix and properties from a line.
 * E.g., "Button pad 12, gap 8" -> { prefix: "Button ", props: "pad 12, gap 8" }
 */
function parseLineContent(lineContent: string): { prefix: string; props: string } {
  // Match component name followed by optional space
  const match = lineContent.match(/^(\s*(?:\w+:)?\s*\w+\s*)(.*)$/)
  if (match) {
    return { prefix: match[1], props: match[2] }
  }
  return { prefix: '', props: lineContent }
}

export const TabbedPropertyPanel = memo(function TabbedPropertyPanel({
  isOpen,
  position,
  onClose,
  lineContent,
  onCodeChange,
  editorCode,
  useTokenMode,
  onTokenModeChange,
}: TabbedPropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('layout')

  // Parse the line content into prefix and properties
  const { prefix, props } = useMemo(() => parseLineContent(lineContent), [lineContent])

  const handleSwitchPanel = useCallback((panel: PanelTabId) => {
    if (panel === 'layout' || panel === 'font' || panel === 'border') {
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

  // Render only the active panel with tabs enabled
  // The panel itself will display the tab header
  return (
    <>
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
          useTokenMode={useTokenMode}
          onTokenModeChange={onTokenModeChange}
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
          useTokenMode={useTokenMode}
          onTokenModeChange={onTokenModeChange}
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
          useTokenMode={useTokenMode}
          onTokenModeChange={onTokenModeChange}
        />
      )}
    </>
  )
})
