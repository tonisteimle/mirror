import { useState, useCallback, useEffect } from 'react'
import type { ASTNode } from '../parser/parser'
import type { TabType } from '../types/common'

export type { TabType }

// Empty defaults
export const defaultTokensCode = ''
export const defaultComponentsCode = ''

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
  const [panelWidth, setPanelWidth] = useState(340)
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
