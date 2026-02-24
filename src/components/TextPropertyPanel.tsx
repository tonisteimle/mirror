/**
 * TextPropertyPanel Component
 *
 * Container for Text components with only a Font tab.
 * Shows the tab header for design consistency, even with just one tab.
 * Triggered by: Text + space
 *
 * Works with full line content (e.g., "Text font Inter, fs 16")
 * and extracts/updates just the properties portion.
 */

import { memo, useCallback, useMemo } from 'react'
import { InlineTypographyPanel, } from './InlineTypographyPanel'
import type { PanelTabId } from './InlineLayoutPanel'

interface TextPropertyPanelProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  /** The full line content (e.g., "Text font Inter, fs 16") */
  lineContent: string
  /** Callback when code changes - receives the full updated line */
  onCodeChange: (newCode: string) => void
  /** Full editor code for extracting defined tokens */
  editorCode?: string
}

/**
 * Extract the component prefix and properties from a line.
 * E.g., "Text font Inter" -> { prefix: "Text ", props: "font Inter" }
 */
function parseLineContent(lineContent: string): { prefix: string; props: string } {
  // Match component name followed by optional space
  const match = lineContent.match(/^(\s*(?:\w+:)?\s*\w+\s*)(.*)$/)
  if (match) {
    return { prefix: match[1], props: match[2] }
  }
  return { prefix: '', props: lineContent }
}

const AVAILABLE_TABS: PanelTabId[] = ['font']

export const TextPropertyPanel = memo(function TextPropertyPanel({
  isOpen,
  position,
  onClose,
  lineContent,
  onCodeChange,
  editorCode,
}: TextPropertyPanelProps) {
  // Parse the line content into prefix and properties
  const { prefix, props } = useMemo(() => parseLineContent(lineContent), [lineContent])

  // No-op since we only have one tab
  const handleSwitchPanel = useCallback((_panel: PanelTabId) => {
    // Only font tab available, no switching needed
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

  return (
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
  )
})
