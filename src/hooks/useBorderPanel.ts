/**
 * useBorderPanel Hook
 *
 * Manages inline border panel state for the editor.
 * Triggered by: bor, border, rad, radius keywords or double-click on border properties.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

/** Standard offset below the cursor for panels */
const PANEL_OFFSET_Y = 4

export interface BorderPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  /** Range to replace when editing existing border */
  replaceRange: { from: number; to: number } | null
  /** Initial code for the picker (when editing existing border) */
  initialCode: string
  /** Properties to preserve (non-border) */
  preservedCode: string
  /** The component name (for reconstruction) */
  componentName: string
}

const initialState: BorderPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  replaceRange: null,
  initialCode: '',
  preservedCode: '',
  componentName: '',
}

// Border keywords that trigger the picker
export const BORDER_TRIGGERS = [
  // Border
  'border', 'bor',
  'border-color', 'boc',
  // Radius
  'radius', 'rad',
]

// All border-related properties (for double-click detection)
export const BORDER_PROPERTIES = [
  'bor', 'border',
  'boc', 'border-color',
  'rad', 'radius',
]

// ============================================================================
// Property Detection
// ============================================================================

/**
 * Check if a property key is border-related.
 */
export function isBorderProperty(key: string): boolean {
  const borderKeys = new Set([
    // Border
    'bor', 'border',
    'boc', 'border-color',
    // Radius
    'rad', 'radius',
    // Border styles
    'solid', 'dashed', 'dotted',
  ])
  return borderKeys.has(key.toLowerCase())
}

/**
 * Parse border properties from a line.
 */
export function parseBorderProperties(lineText: string): {
  componentName: string
  borderCode: string
  preservedCode: string
} {
  const result = {
    componentName: '',
    borderCode: '',
    preservedCode: '',
  }

  // Skip leading whitespace
  const trimmedStart = lineText.match(/^(\s*)/)
  const indent = trimmedStart ? trimmedStart[1].length : 0
  const content = lineText.slice(indent)

  if (!content) return result

  // Extract component name
  const componentMatch = content.match(/^([A-Za-z_][A-Za-z0-9_-]*):?/)
  if (!componentMatch) return result

  result.componentName = componentMatch[1]
  let rest = content.slice(componentMatch[0].length).trim()

  // Split into properties
  const borderParts: string[] = []
  const otherParts: string[] = []

  // Simple property splitting by comma
  const parts = rest.split(/,\s*/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Check if this is a border property
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase()
    if (isBorderProperty(firstWord)) {
      borderParts.push(trimmed)
    } else {
      otherParts.push(trimmed)
    }
  }

  result.borderCode = borderParts.join(', ')
  result.preservedCode = otherParts.join(', ')

  return result
}

// ============================================================================
// Hook
// ============================================================================

export function useBorderPanel() {
  const [state, setState] = useState<BorderPanelState>(initialState)
  const viewRef = useRef<EditorView | null>(null)

  const open = useCallback((
    view: EditorView,
    pos: number,
    options?: {
      replaceRange?: { from: number; to: number }
      initialCode?: string
      preservedCode?: string
      componentName?: string
    }
  ) => {
    viewRef.current = view

    // Calculate position from cursor
    const coords = view.coordsAtPos(pos)
    const position = coords
      ? { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y }
      : { x: 0, y: 0 }

    setState({
      isOpen: true,
      position,
      triggerPos: pos,
      replaceRange: options?.replaceRange ?? null,
      initialCode: options?.initialCode ?? '',
      preservedCode: options?.preservedCode ?? '',
      componentName: options?.componentName ?? '',
    })
  }, [])

  const close = useCallback(() => {
    setState(initialState)
  }, [])

  const handleSelect = useCallback((code: string) => {
    const view = viewRef.current
    if (!view) return

    const { replaceRange, preservedCode, componentName } = state

    // Build the full line
    let fullCode = code
    if (preservedCode) {
      fullCode = code ? `${code}, ${preservedCode}` : preservedCode
    }

    if (replaceRange) {
      // Replace existing properties
      const line = view.state.doc.lineAt(replaceRange.from)
      const indent = line.text.match(/^(\s*)/)?.[1] ?? ''

      // Reconstruct line: indent + componentName + properties
      const newLine = componentName
        ? `${indent}${componentName} ${fullCode}`
        : `${indent}${fullCode}`

      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newLine },
      })
    } else {
      // Insert at trigger position
      view.dispatch({
        changes: { from: state.triggerPos, insert: fullCode },
      })
    }

    close()
  }, [state, close])

  const handleCodeChange = useCallback((code: string) => {
    const view = viewRef.current
    if (!view) return

    const { replaceRange, preservedCode, componentName } = state

    let fullCode = code
    if (preservedCode) {
      fullCode = code ? `${code}, ${preservedCode}` : preservedCode
    }

    if (replaceRange) {
      const line = view.state.doc.lineAt(replaceRange.from)
      const indent = line.text.match(/^(\s*)/)?.[1] ?? ''

      const newLine = componentName
        ? `${indent}${componentName} ${fullCode}`
        : `${indent}${fullCode}`

      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newLine },
      })
    }
  }, [state])

  return {
    state,
    open,
    close,
    handleSelect,
    handleCodeChange,
    viewRef,
  }
}

export default useBorderPanel
