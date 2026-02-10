import { useState, useCallback, useEffect } from 'react'
import type { ASTNode } from '../parser/parser'
import type { TabType } from '../types/common'

export type { TabType }

export const defaultTokensCode = `// Farben
$primary: #3B82F6
$primary-hover: #2563EB
$secondary: #6366F1
$accent: #10B981

$bg: #0A0A0A
$surface: #1A1A1A
$surface-hover: #252525
$border: #333333

$text: #FFFFFF
$text-muted: #888888
$text-subtle: #555555

$success: #22C55E
$warning: #F59E0B
$error: #EF4444

// Fonts
$font-sans: "Inter", system-ui, sans-serif
$font-mono: "JetBrains Mono", monospace

// Sizes
$text-xs: 10
$text-sm: 12
$text-base: 14
$text-lg: 16
$text-xl: 20
$text-2xl: 24

$radius-sm: 4
$radius-md: 8
$radius-lg: 12
$radius-full: 9999

$space-xs: 4
$space-sm: 8
$space-md: 12
$space-lg: 16
$space-xl: 24
`

export const defaultComponentsCode = `// Layout
Page: ver full bg $bg
Header: hor between ver-cen pad 16 24 bg $surface
Logo: size 18 weight 600 col $text
Nav: hor gap 24
NavItem: size 14 col $text-muted hover-col $text

// Hero Section
Hero: ver cen cen gap 16 grow pad 48
Title: size 32 weight 700 col $text
Subtitle: size 16 col $text-muted

// Buttons
Button: pad 10 20 bg $primary col #FFF rad 8 size 14 weight 500 hover-bg $primary-hover
ButtonSecondary: pad 10 20 bg transparent col $text bor 1 boc $border rad 8 size 14 hover-bg $surface-hover`

export interface UseEditorReturn {
  componentsCode: string
  setComponentsCode: (code: string) => void
  tokensCode: string
  setTokensCode: (code: string) => void
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  inspectMode: boolean
  highlightLine: number | undefined
  setHighlightLine: (line: number | undefined) => void
  panelWidth: number
  setPanelWidth: (width: number) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  handleSelect: (id: string, nodes: ASTNode[]) => void
  findNodeById: (nodes: ASTNode[], id: string) => ASTNode | null
}

export function useEditor(): UseEditorReturn {
  const [componentsCode, setComponentsCode] = useState(defaultComponentsCode)
  const [tokensCode, setTokensCode] = useState(defaultTokensCode)
  const [activeTab, setActiveTab] = useState<TabType>('layout')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [inspectMode, setInspectMode] = useState(false)
  const [highlightLine, setHighlightLine] = useState<number | undefined>(undefined)
  const [panelWidth, setPanelWidth] = useState(420)
  const [isDragging, setIsDragging] = useState(false)

  // Helper to find a node by ID in the AST
  const findNodeById = useCallback((nodes: ASTNode[], id: string): ASTNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      const found = findNodeById(node.children, id)
      if (found) return found
    }
    return null
  }, [])

  // Handle node selection
  const handleSelect = useCallback((id: string, nodes: ASTNode[]) => {
    setSelectedId(id)
    const node = findNodeById(nodes, id)
    if (node?.line !== undefined) {
      setHighlightLine(node.line)
    }
  }, [findNodeById])

  // Listen for Shift key to enable inspect mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setInspectMode(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setInspectMode(false)
        setHoveredId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Handle panel resize
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(300, Math.min(800, e.clientX))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return {
    componentsCode,
    setComponentsCode,
    tokensCode,
    setTokensCode,
    activeTab,
    setActiveTab,
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    inspectMode,
    highlightLine,
    setHighlightLine,
    panelWidth,
    setPanelWidth,
    isDragging,
    setIsDragging,
    handleSelect,
    findNodeById,
  }
}
