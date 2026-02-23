import { useState, useCallback, useEffect } from 'react'
import type { ASTNode } from '../parser/parser'
import type { TabType } from '../types/common'

export type { TabType }

// Default tokens with bound property format ($name.property)
export const defaultTokensCode = `// Palette

$grey-50: #FAFAFA
$grey-100: #F4F4F5
$grey-200: #E4E4E7
$grey-300: #D4D4D8
$grey-400: #A1A1AA
$grey-500: #71717A
$grey-600: #52525B
$grey-700: #3F3F46
$grey-800: #27272A
$grey-900: #18181B
$grey-950: #09090B

$blue-400: #60A5FA
$blue-500: #3B82F6
$blue-600: #2563EB

$green-500: #22C55E
$yellow-500: #F59E0B
$red-500: #EF4444
$red-600: #DC2626


// Semantic

$app.bg: $grey-950
$default.bg: $grey-900
$elevated.bg: $grey-800
$surface.bg: $grey-700
$muted.bg: $grey-600
$hover.bg: $grey-600

$default.col: $grey-300
$muted.col: $grey-500
$heading.col: $grey-50
$inverse.col: $grey-950

$primary.bg: $blue-500
$primary.col: $blue-500
$primary.hover.bg: $blue-600
$on-primary.col: #FFFFFF

$success.bg: $green-500
$success.col: $green-500
$warning.bg: $yellow-500
$warning.col: $yellow-500
$danger.bg: $red-500
$danger.col: $red-500
$danger.hover.bg: $red-600

$button.bg: $primary.bg
$button.hover.bg: $primary.hover.bg
$input.bg: $grey-800
$input.focus.bg: $grey-700


// Sizes

$s.pad: 4
$s.gap: 4
$s.rad: 4
$s.size: 12
$s.bor.width: 1

$m.pad: 8
$m.gap: 8
$m.rad: 8
$m.size: 14
$m.bor.width: 2

$l.pad: 12
$l.gap: 12
$l.rad: 12
$l.size: 16
$l.bor.width: 3

// Icon Sizes

$s.is: 16
$m.is: 24
$l.is: 32

// Fonts

$sans.font: "Inter"
$serif.font: "Merriweather"
$mono.font: "JetBrains Mono"
`

// Default component definitions with bound token format
export const defaultComponentsCode = `// Primitives

Button:
    horizontal
    center
    gap $s
    padding $s $l
    background $button.bg
    color $on-primary.col
    radius $m
    cursor pointer
    size $m
    weight 500
    hover
        background $button.hover.bg

    ButtonIcon as Icon:
        hidden

    ButtonLabel as Text:
        "Button"

SecondaryButton: Button
    background $surface.bg
    color $default.col
    hover
        background $muted.bg

GhostButton: Button
    background transparent
    color $muted.col
    hover
        background $elevated.bg
        color $default.col

Input:
    padding $s $m
    background $input.bg
    color $default.col
    radius $m
    size $m
    width full
    placeholder "Eingabe..."
    focus
        background $input.focus.bg

Textarea: Input
    min-height 100
    placeholder "Text eingeben..."

Link:
    color $primary.col
    size $m
    "Link"
    hover
        underline

Icon:
    color $muted.col
    icon-size 16
    "circle"

Image:
    radius $m
    object-fit cover
    width 100
    height 100
    background $surface.bg

Text:
    color $default.col
    size $m

Title:
    color $heading.col
    size $l
    weight 600
    "Titel"

// Page Structure

App:
    vertical
    width full
    height full
    background $app.bg

Page:
    vertical
    width full
    height full
    gap $m

Header:
    horizontal
    width full
    padding $s $l
    background $elevated.bg
    spread
    ver-center

    Logo as Text:
        weight 600
        color $heading.col
        "App"

Main:
    vertical
    width full
    height full
    padding $l
    gap $l
    scroll

Footer:
    horizontal
    width full
    padding $s $l
    background $elevated.bg
    center

    FooterText as Text:
        size $s
        color $muted.col
        "© 2024"

Sidebar:
    vertical
    width 200
    height full
    padding $m
    background $elevated.bg
    gap $s

// Layout

Box:
    vertical
    gap $s

Card:
    vertical
    gap $m
    padding $l
    background $elevated.bg
    radius $l

    CardTitle as Text:
        weight 500
        color $heading.col
        "Card Title"

    CardContent as Text:
        color $muted.col
        "Card content goes here."

Section:
    vertical
    gap $m

Panel:
    vertical
    padding $m
    background $elevated.bg
    radius $m
    gap $s

// Navigation

Nav:
    horizontal
    gap $s
    ver-center

Menu:
    vertical
    gap $s

NavItem:
    horizontal
    ver-center
    gap $s
    padding $s $m
    radius $s
    cursor pointer
    color $muted.col
    hover
        background $elevated.bg
        color $default.col
    state active
        background $surface.bg
        color $default.col

    NavIcon as Icon:
        "circle"

    NavLabel as Text:
        "Menu Item"

Tab:
    padding $s $l
    color $muted.col
    size $m
    cursor pointer
    "Tab"
    hover
        color $default.col
    state active
        color $primary.col

// Data Display

Table:
    vertical
    width full
    radius $m
    background $default.bg
    clip

TableRow:
    horizontal
    ver-center
    gap $m
    padding $s $m
    hover
        background $elevated.bg

TableHeader: TableRow
    background $surface.bg
    color $muted.col
    size $s
    weight 500

List:
    vertical
    gap $s

ListItem:
    horizontal
    ver-center
    gap $s
    padding $s $m
    cursor pointer
    hover
        background $elevated.bg
    state selected
        background $surface.bg

    ItemIcon as Icon:
        "circle"

    ItemLabel as Text:
        "List Item"

Badge:
    horizontal
    center
    padding $s $s
    background $surface.bg
    color $muted.col
    radius $s
    size $s
    "Badge"

PrimaryBadge: Badge
    background $primary.bg
    color $on-primary.col

SuccessBadge: Badge
    background $success.bg
    color $on-primary.col

DangerBadge: Badge
    background $danger.bg
    color $on-primary.col

Avatar:
    width 24
    height 24
    radius 12
    background $surface.bg
    center
    color $muted.col
    size $s
    weight 500
    "AB"

// Forms

FormField:
    vertical
    gap $s

    FieldLabel as Text:
        size $s
        color $muted.col
        weight 500
        "Label"

    FieldInput as Input:

Label:
    color $muted.col
    size $s
    weight 500
    "Label"

// Feedback

Alert:
    horizontal
    ver-center
    gap $m
    padding $m
    radius $m
    background $elevated.bg

    AlertIcon as Icon:
        "info"
        color $primary.col

    AlertContent:
        vertical
        gap $s
        width full

        AlertTitle as Text:
            weight 500
            "Alert Title"

        AlertMessage as Text:
            size $s
            color $muted.col
            "This is an alert message."

Modal:
    vertical
    padding $l
    background $elevated.bg
    radius $l
    gap $l
    shadow lg
    width 400

    ModalTitle as Text:
        size $lg.font.size
        weight 600
        color $heading.col
        "Modal Title"

    ModalContent as Text:
        color $muted.col
        "Modal content goes here."

    ModalActions:
        horizontal
        gap $s
        right

Toast:
    horizontal
    padding $m
    background $elevated.bg
    radius $m
    gap $s
    shadow md
    ver-center

    ToastIcon as Icon:
        "check"
        color $success.col

    ToastMessage as Text:
        "Action completed successfully."

// Other

Divider:
    height 1
    width full
    background $surface.bg

Spacer:
    width full
    height full

// Status

StatusDot:
    width 6
    height 6
    radius 3
    background $muted.col

StatusDotActive: StatusDot
    background $success.bg

StatusDotWarning: StatusDot
    background $warning.bg

StatusDotError: StatusDot
    background $danger.bg

Tag:
    horizontal
    center
    padding $s $s
    background $surface.bg
    color $default.col
    radius $s
    size $s
    "Tag"
`

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
