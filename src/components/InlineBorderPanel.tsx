/**
 * InlineBorderPanel - Visual border & radius picker for Mirror DSL
 *
 * Design: Consistent icon system - dark rectangle with highlighted active parts
 *
 * Sections:
 * - Border: Width, Style, Color, Sides
 * - Radius: All corners or individual corners
 *
 * Triggered by: bor, border, rad, radius keywords
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { ColorSystemPalette } from './ColorSystemPalette'
import { TokenSwatches } from './TokenSwatches'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'

// ============================================
// Token Mode Persistence
// ============================================

const STORAGE_KEY = 'mirror-panel-token-mode'

function getStoredTokenMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function setStoredTokenMode(mode: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, mode ? 'true' : 'false')
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// Types
// ============================================

type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'none'

interface BorderSides {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

interface BorderState {
  // Border
  width: number
  style: BorderStyle
  color: string
  sides: BorderSides  // Multi-select for sides
  // Per-side widths (when expanded)
  widthTop: number
  widthRight: number
  widthBottom: number
  widthLeft: number
  sidesExpanded: boolean
  // Radius
  radius: number
  // Per-corner radius (when expanded)
  radiusTL: number
  radiusTR: number
  radiusBR: number
  radiusBL: number
  cornersExpanded: boolean
  // UI state
  showColorPicker: boolean
  useTokenMode: boolean
}

interface InlineBorderPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string) => void
  onCodeChange?: (code: string) => void
  position: { x: number; y: number }
  initialCode?: string
  /** Full editor code for extracting defined tokens */
  editorCode?: string
  /** Show tabs to switch between panels */
  showTabs?: boolean
  /** Called when user wants to switch to a different panel */
  onSwitchPanel?: (panel: PanelTabId) => void
  /** Which tabs to show (defaults to layout, font, border) */
  availableTabs?: PanelTabId[]
  /** Token mode from project settings (if provided, overrides localStorage) */
  useTokenMode?: boolean
  /** Callback when token mode changes (if provided, updates project settings) */
  onTokenModeChange?: (mode: boolean) => void
}

// ============================================
// Styles
// ============================================

const COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  iconDark: '#333',
  iconLight: '#666',  // Darker, matching layout panel's label color
  iconActive: '#ccc',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
  border: '#333',
}

const defaultState: BorderState = {
  width: -1,  // -1 = not set, 0 = explicitly no border
  style: 'solid',
  color: '',
  sides: { top: true, right: true, bottom: true, left: true },  // All sides selected by default
  widthTop: 0,
  widthRight: 0,
  widthBottom: 0,
  widthLeft: 0,
  sidesExpanded: false,
  radius: -1,  // -1 = not set, 0 = explicitly square corners
  radiusTL: 0,
  radiusTR: 0,
  radiusBR: 0,
  radiusBL: 0,
  cornersExpanded: false,
  showColorPicker: false,
  useTokenMode: getStoredTokenMode(),
}

// Helper to check if all sides are selected
function allSidesSelected(sides: BorderSides): boolean {
  return sides.top && sides.right && sides.bottom && sides.left
}

// Helper to check if any side is selected
function anySideSelected(sides: BorderSides): boolean {
  return sides.top || sides.right || sides.bottom || sides.left
}

// ============================================
// Code Generation
// ============================================

function generateBorderCode(state: BorderState): string {
  const parts: string[] = []

  // Border - only generate if width is explicitly set (>= 0)
  if (state.sidesExpanded) {
    // Per-side borders with individual widths
    if (state.widthTop > 0) {
      parts.push(`bor top ${state.widthTop}${state.style !== 'solid' ? ` ${state.style}` : ''}${state.color ? ` ${state.color}` : ''}`)
    }
    if (state.widthRight > 0) {
      parts.push(`bor right ${state.widthRight}${state.style !== 'solid' ? ` ${state.style}` : ''}${state.color ? ` ${state.color}` : ''}`)
    }
    if (state.widthBottom > 0) {
      parts.push(`bor bottom ${state.widthBottom}${state.style !== 'solid' ? ` ${state.style}` : ''}${state.color ? ` ${state.color}` : ''}`)
    }
    if (state.widthLeft > 0) {
      parts.push(`bor left ${state.widthLeft}${state.style !== 'solid' ? ` ${state.style}` : ''}${state.color ? ` ${state.color}` : ''}`)
    }
  } else if (state.width >= 0 && state.width > 0 && anySideSelected(state.sides)) {
    const styleStr = state.style !== 'solid' ? ` ${state.style}` : ''
    const colorStr = state.color ? ` ${state.color}` : ''

    if (allSidesSelected(state.sides)) {
      // All sides - use simple "bor N"
      parts.push(`bor ${state.width}${styleStr}${colorStr}`)
    } else {
      // Individual sides selected - generate one bor per side
      if (state.sides.top) {
        parts.push(`bor top ${state.width}${styleStr}${colorStr}`)
      }
      if (state.sides.right) {
        parts.push(`bor right ${state.width}${styleStr}${colorStr}`)
      }
      if (state.sides.bottom) {
        parts.push(`bor bottom ${state.width}${styleStr}${colorStr}`)
      }
      if (state.sides.left) {
        parts.push(`bor left ${state.width}${styleStr}${colorStr}`)
      }
    }
  }

  // Radius - only generate if radius is explicitly set (>= 0)
  if (state.cornersExpanded) {
    // Per-corner radius
    const corners: string[] = []
    if (state.radiusTL > 0) corners.push(`tl ${state.radiusTL}`)
    if (state.radiusTR > 0) corners.push(`tr ${state.radiusTR}`)
    if (state.radiusBR > 0) corners.push(`br ${state.radiusBR}`)
    if (state.radiusBL > 0) corners.push(`bl ${state.radiusBL}`)
    if (corners.length > 0) {
      parts.push(`rad ${corners.join(' ')}`)
    }
  } else if (state.radius >= 0 && state.radius > 0) {
    parts.push(`rad ${state.radius}`)
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseBorderCode(code: string): Partial<BorderState> {
  const state: Partial<BorderState> = {}
  if (!code) return state

  // Find all border declarations
  const borMatches = code.matchAll(/\bbor(?:der)?\s+(?:(top|right|bottom|left)\s+)?(\d+)/g)
  const sides: BorderSides = { top: false, right: false, bottom: false, left: false }
  let hasAnySide = false
  let width = 0

  for (const match of borMatches) {
    width = parseInt(match[2], 10)
    if (match[1]) {
      // Specific side
      sides[match[1] as keyof BorderSides] = true
      hasAnySide = true
    } else {
      // All sides (no side specified)
      sides.top = true
      sides.right = true
      sides.bottom = true
      sides.left = true
      hasAnySide = true
    }
  }

  if (hasAnySide) {
    state.sides = sides
    state.width = width
  }

  // Border style
  if (code.includes('dashed')) state.style = 'dashed'
  else if (code.includes('dotted')) state.style = 'dotted'
  else if (code.includes('solid')) state.style = 'solid'

  // Border color - hex after bor
  const borColorMatch = code.match(/\bbor(?:der)?[^,]*?(#[0-9a-fA-F]{3,8})/)
  if (borColorMatch) {
    state.color = borColorMatch[1]
  }

  // Radius - "rad 8" or "rad tl 8 tr 8"
  const radMatch = code.match(/\brad(?:ius)?\s+(\d+)/)
  if (radMatch) {
    state.radius = parseInt(radMatch[1], 10)
  }

  // Per-corner radius
  const tlMatch = code.match(/\btl\s+(\d+)/)
  const trMatch = code.match(/\btr\s+(\d+)/)
  const brMatch = code.match(/\bbr\s+(\d+)/)
  const blMatch = code.match(/\bbl\s+(\d+)/)

  if (tlMatch || trMatch || brMatch || blMatch) {
    state.cornersExpanded = true
    if (tlMatch) state.radiusTL = parseInt(tlMatch[1], 10)
    if (trMatch) state.radiusTR = parseInt(trMatch[1], 10)
    if (brMatch) state.radiusBR = parseInt(brMatch[1], 10)
    if (blMatch) state.radiusBL = parseInt(blMatch[1], 10)
  }

  return state
}

// ============================================
// Custom Icons - Dark rectangle with highlighted parts
// ============================================

interface RectIconProps {
  size?: number
  highlighted?: {
    top?: boolean
    right?: boolean
    bottom?: boolean
    left?: boolean
    tl?: boolean
    tr?: boolean
    br?: boolean
    bl?: boolean
  }
  borderWidth?: number
  selected?: boolean
}

function RectIcon({ size = 16, highlighted = {}, borderWidth = 2, selected }: RectIconProps) {
  const dark = COLORS.iconDark
  const light = selected ? COLORS.iconActive : COLORS.iconLight
  const inset = 1
  const s = size - inset * 2
  const radius = 2

  // Determine corner radii based on highlighted corners
  const tlRadius = highlighted.tl ? 4 : radius
  const trRadius = highlighted.tr ? 4 : radius
  const brRadius = highlighted.br ? 4 : radius
  const blRadius = highlighted.bl ? 4 : radius

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Dark base rectangle */}
      <rect
        x={inset}
        y={inset}
        width={s}
        height={s}
        fill="none"
        stroke={dark}
        strokeWidth={borderWidth}
        rx={radius}
        ry={radius}
      />
      {/* Highlighted sides */}
      {highlighted.top && (
        <line x1={inset + tlRadius} y1={inset} x2={size - inset - trRadius} y2={inset} stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.right && (
        <line x1={size - inset} y1={inset + trRadius} x2={size - inset} y2={size - inset - brRadius} stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.bottom && (
        <line x1={inset + blRadius} y1={size - inset} x2={size - inset - brRadius} y2={size - inset} stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.left && (
        <line x1={inset} y1={inset + tlRadius} x2={inset} y2={size - inset - blRadius} stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {/* Highlighted corners (for radius) */}
      {highlighted.tl && (
        <path d={`M ${inset} ${inset + 5} Q ${inset} ${inset} ${inset + 5} ${inset}`} fill="none" stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.tr && (
        <path d={`M ${size - inset - 5} ${inset} Q ${size - inset} ${inset} ${size - inset} ${inset + 5}`} fill="none" stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.br && (
        <path d={`M ${size - inset} ${size - inset - 5} Q ${size - inset} ${size - inset} ${size - inset - 5} ${size - inset}`} fill="none" stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
      {highlighted.bl && (
        <path d={`M ${inset + 5} ${size - inset} Q ${inset} ${size - inset} ${inset} ${size - inset - 5}`} fill="none" stroke={light} strokeWidth={borderWidth} strokeLinecap="round" />
      )}
    </svg>
  )
}

// Special icon for "all corners" radius - shows 4 separated corner curves
function AllCornersIcon({ size = 16 }: { size?: number }) {
  const bg = COLORS.bg  // Background color for separator
  const light = COLORS.iconLight
  const inset = 2  // 2px inset for smaller frame
  const center = size / 2
  const cornerSize = 4

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 4 corner curves - drawn first */}
      <path d={`M ${inset} ${inset + cornerSize} Q ${inset} ${inset} ${inset + cornerSize} ${inset}`} fill="none" stroke={light} strokeWidth={1} strokeLinecap="round" />
      <path d={`M ${size - inset - cornerSize} ${inset} Q ${size - inset} ${inset} ${size - inset} ${inset + cornerSize}`} fill="none" stroke={light} strokeWidth={1} strokeLinecap="round" />
      <path d={`M ${size - inset} ${size - inset - cornerSize} Q ${size - inset} ${size - inset} ${size - inset - cornerSize} ${size - inset}`} fill="none" stroke={light} strokeWidth={1} strokeLinecap="round" />
      <path d={`M ${inset + cornerSize} ${size - inset} Q ${inset} ${size - inset} ${inset} ${size - inset - cornerSize}`} fill="none" stroke={light} strokeWidth={1} strokeLinecap="round" />

      {/* Separator lines on top - background color to "cut" through */}
      <line x1={center} y1={0} x2={center} y2={size} stroke={bg} strokeWidth={4} />
      <line x1={0} y1={center} x2={size} y2={center} stroke={bg} strokeWidth={4} />
    </svg>
  )
}

function BorderStyleIcon({ style, selected }: { style: BorderStyle; selected?: boolean }) {
  const color = selected ? COLORS.iconActive : COLORS.iconLight
  const dark = COLORS.iconDark

  if (style === 'none') {
    return (
      <svg width={20} height={16} viewBox="0 0 20 16">
        <line x1={2} y1={8} x2={18} y2={8} stroke={dark} strokeWidth={2} />
        <line x1={4} y1={4} x2={16} y2={12} stroke={color} strokeWidth={1.5} />
      </svg>
    )
  }

  const dashArray = style === 'dashed' ? '4,3' : style === 'dotted' ? '2,2' : 'none'

  return (
    <svg width={20} height={16} viewBox="0 0 20 16">
      <line
        x1={2}
        y1={8}
        x2={18}
        y2={8}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashArray}
        strokeLinecap={style === 'dotted' ? 'round' : 'butt'}
      />
    </svg>
  )
}

function BorderWidthIcon({ width, selected }: { width: number; selected?: boolean }) {
  const color = selected ? COLORS.iconActive : COLORS.iconLight
  const strokeWidth = Math.max(1, Math.min(width, 4))

  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect
        x={2}
        y={2}
        width={12}
        height={12}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        rx={2}
      />
    </svg>
  )
}

// ============================================
// UI Components
// ============================================

function SectionLabel({ children, indent }: { children: React.ReactNode; indent?: boolean }) {
  return (
    <div style={{
      fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.label,
      marginBottom: '4px',
      marginLeft: indent ? '24px' : 0,
    }}>
      {children}
    </div>
  )
}

function IconButton({
  selected,
  onClick,
  children,
  title,
}: {
  selected?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: selected ? COLORS.textLight : COLORS.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function DecorativeIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '20px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: COLORS.label,
    }}>
      {children}
    </div>
  )
}

function PresetButton({
  value,
  selected,
  onClick,
  label,
}: {
  value: number
  selected: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        minWidth: '24px',
        height: '24px',
        padding: '0 5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: selected ? COLORS.textLight : COLORS.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label ?? value}
    </button>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  width = 40,
  presets = [],
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  width?: number
  presets?: number[]  // When value matches a preset, show empty and not highlighted
}) {
  // Only show value and highlight if it's a custom value (not matching any preset)
  const isPresetValue = presets.includes(value)
  const showValue = !isPresetValue && value > 0
  return (
    <input
      type="text"
      value={showValue ? value : ''}
      placeholder={placeholder}
      onChange={(e) => {
        const num = parseInt(e.target.value, 10)
        onChange(isNaN(num) ? 0 : num)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: `${width}px`,
        height: '24px',
        padding: '0 5px',
        backgroundColor: showValue ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: COLORS.textLight,
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      }}
    />
  )
}

function ColorButton({
  color,
  onClick,
}: {
  color: string
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      style={{
        width: '80px',
        height: '24px',
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: COLORS.buttonBg,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          backgroundColor: color || 'transparent',
          border: color ? 'none' : `1px dashed ${COLORS.label}`,
        }}
      />
      <span style={{
        color: color ? COLORS.textLight : COLORS.text,
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {color || 'Keine'}
      </span>
    </button>
  )
}

function ExpandButton({
  expanded,
  onClick,
}: {
  expanded: boolean
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      style={{
        width: '20px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        color: COLORS.label,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      title={expanded ? 'Collapse' : 'Expand'}
    >
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  )
}

// ============================================
// Border Color Picker (Portal-based)
// ============================================

function BorderColorPicker({
  color,
  onChange,
  onRemove,
  onClose,
  triggerRef,
}: {
  color: string
  onChange: (color: string) => void
  onRemove: () => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Calculate position based on trigger element
  useEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Position below the trigger
    setPosition({
      top: rect.bottom + 8, // 8px gap below
      left: rect.left,
    })
  }, [triggerRef])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const content = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      className="border-color-picker"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '12px' }}>
        <ColorSystemPalette
          color={color || '#333333'}
          onChange={onChange}
        />
      </div>
      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
        color: COLORS.text,
      }}>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: COLORS.text,
          }}
        >
          <span style={{ fontWeight: 500, color: '#ccc' }}>↵</span> Einfügen
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: COLORS.text,
          }}
        >
          <span style={{ fontWeight: 500, color: '#ccc' }}>Esc</span> Schließen
        </button>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ============================================
// Main Component
// ============================================

export function InlineBorderPanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  initialCode,
  editorCode,
  showTabs,
  onSwitchPanel,
  availableTabs,
  useTokenMode: useTokenModeProp,
  onTokenModeChange,
}: InlineBorderPanelProps) {
  const [state, setState] = useState<BorderState>(defaultState)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)
  // Ref for color picker positioning
  const colorButtonRef = useRef<HTMLElement>(null)

  // Parse initial code when opening
  useEffect(() => {
    if (isOpen) {
      hasUserInteractedRef.current = false
      pendingSyncRef.current = false
      const parsed = parseBorderCode(initialCode || '')
      // Use prop if provided, otherwise fall back to localStorage
      const tokenMode = useTokenModeProp !== undefined ? useTokenModeProp : getStoredTokenMode()
      setState({ ...defaultState, ...parsed, useTokenMode: tokenMode })
    }
  }, [isOpen, initialCode, useTokenModeProp])

  // Sync token mode with prop when it changes externally
  useEffect(() => {
    if (useTokenModeProp !== undefined && state.useTokenMode !== useTokenModeProp) {
      setState(prev => ({ ...prev, useTokenMode: useTokenModeProp }))
    }
  }, [useTokenModeProp])

  // Sync to editor when state changes
  useEffect(() => {
    if (!isOpen || !hasUserInteractedRef.current) return
    if (!pendingSyncRef.current) return

    const code = generateBorderCode(state)
    onCodeChange?.(code)
    pendingSyncRef.current = false
  }, [state, isOpen, onCodeChange])

  const updateState = useCallback((updates: Partial<BorderState>) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSubmit = useCallback(() => {
    const code = generateBorderCode(state)
    onSelect(code)
    onClose()
  }, [state, onSelect, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !state.showColorPicker) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (state.showColorPicker) {
        setState(prev => ({ ...prev, showColorPicker: false }))
      } else {
        onClose()
      }
    }
  }, [handleSubmit, onClose, state.showColorPicker])

  if (!isOpen) return null

  return (
    <InlinePanel
      isOpen={isOpen}
      position={position}
      onClose={onClose}
      width={360}
      maxHeight={400}
      testId="panel-border-picker"
      disableClickOutsideClose
    >
      {/* Tab Header - only shown when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader
          activeTab="border"
          onSwitchPanel={onSwitchPanel}
          availableTabs={availableTabs}
          useTokenMode={state.useTokenMode}
          onTokenModeChange={(mode) => {
            updateState({ useTokenMode: mode })
            // Notify parent if callback provided (saves to project)
            onTokenModeChange?.(mode)
          }}
        />
      )}
      <div
        style={{ padding: showTabs ? '8px 16px 16px 16px' : '16px', flex: 1 }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* BORDER SECTION */}
        <div>
          <SectionLabel>Border</SectionLabel>

          {/* Width + Style */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
            <PresetButton value={0} selected={state.width === 0} onClick={() => updateState({ width: 0 })} />
            <PresetButton value={1} selected={state.width === 1} onClick={() => updateState({ width: 1 })} />
            <PresetButton value={2} selected={state.width === 2} onClick={() => updateState({ width: 2 })} />
            <PresetButton value={3} selected={state.width === 3} onClick={() => updateState({ width: 3 })} />
            <NumberInput value={state.width >= 0 ? state.width : 0} onChange={(v) => updateState({ width: v })} presets={[0, 1, 2, 3]} width={24} />
            <div style={{ width: '8px' }} />
            <IconButton
              selected={state.style === 'solid'}
              onClick={() => updateState({ style: 'solid' })}
              title="Solid"
            >
              <BorderStyleIcon style="solid" selected={state.style === 'solid'} />
            </IconButton>
            <IconButton
              selected={state.style === 'dashed'}
              onClick={() => updateState({ style: 'dashed' })}
              title="Dashed"
            >
              <BorderStyleIcon style="dashed" selected={state.style === 'dashed'} />
            </IconButton>
            <IconButton
              selected={state.style === 'dotted'}
              onClick={() => updateState({ style: 'dotted' })}
              title="Dotted"
            >
              <BorderStyleIcon style="dotted" selected={state.style === 'dotted'} />
            </IconButton>
          </div>

          {/* Sides - Multi-select */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
            <IconButton
              selected={allSidesSelected(state.sides) && !state.sidesExpanded}
              onClick={() => updateState({
                sides: { top: true, right: true, bottom: true, left: true },
                sidesExpanded: false
              })}
              title="All sides"
            >
              <RectIcon highlighted={{ top: true, right: true, bottom: true, left: true }} selected={allSidesSelected(state.sides)} />
            </IconButton>
            <IconButton
              selected={state.sides.top && !allSidesSelected(state.sides)}
              onClick={() => {
                if (allSidesSelected(state.sides)) {
                  // From "all" -> select only this one
                  updateState({ sides: { top: true, right: false, bottom: false, left: false } })
                } else {
                  // Toggle this side
                  updateState({ sides: { ...state.sides, top: !state.sides.top } })
                }
              }}
              title="Top"
            >
              <RectIcon highlighted={{ top: true }} selected={state.sides.top} />
            </IconButton>
            <IconButton
              selected={state.sides.right && !allSidesSelected(state.sides)}
              onClick={() => {
                if (allSidesSelected(state.sides)) {
                  updateState({ sides: { top: false, right: true, bottom: false, left: false } })
                } else {
                  updateState({ sides: { ...state.sides, right: !state.sides.right } })
                }
              }}
              title="Right"
            >
              <RectIcon highlighted={{ right: true }} selected={state.sides.right} />
            </IconButton>
            <IconButton
              selected={state.sides.bottom && !allSidesSelected(state.sides)}
              onClick={() => {
                if (allSidesSelected(state.sides)) {
                  updateState({ sides: { top: false, right: false, bottom: true, left: false } })
                } else {
                  updateState({ sides: { ...state.sides, bottom: !state.sides.bottom } })
                }
              }}
              title="Bottom"
            >
              <RectIcon highlighted={{ bottom: true }} selected={state.sides.bottom} />
            </IconButton>
            <IconButton
              selected={state.sides.left && !allSidesSelected(state.sides)}
              onClick={() => {
                if (allSidesSelected(state.sides)) {
                  updateState({ sides: { top: false, right: false, bottom: false, left: true } })
                } else {
                  updateState({ sides: { ...state.sides, left: !state.sides.left } })
                }
              }}
              title="Left"
            >
              <RectIcon highlighted={{ left: true }} selected={state.sides.left} />
            </IconButton>
          </div>

        </div>

        {/* COLOR SECTION - full width with inline swatches */}
        <div style={{ marginTop: '16px' }}>
          <SectionLabel>Color</SectionLabel>
          {state.useTokenMode && editorCode ? (
            /* Token mode: only show token swatches */
            <TokenSwatches
              code={editorCode}
              onSelect={(tokenName) => updateState({ color: tokenName })}
              selectedValue={state.color}
            />
          ) : (
            /* Normal mode: only color button */
            <div ref={colorButtonRef as React.RefObject<HTMLDivElement>}>
              <ColorButton
                color={state.color}
                onClick={() => updateState({ showColorPicker: !state.showColorPicker })}
              />
            </div>
          )}
          {/* Color Picker Overlay - Rendered via Portal */}
          {state.showColorPicker && !state.useTokenMode && (
            <BorderColorPicker
              color={state.color}
              onChange={(color) => updateState({ color })}
              onRemove={() => updateState({ color: '' })}
              onClose={() => setState(prev => ({ ...prev, showColorPicker: false }))}
              triggerRef={colorButtonRef}
            />
          )}
        </div>

        {/* RADIUS SECTION */}
        <div style={{ marginTop: '20px' }}>
          <SectionLabel>Radius</SectionLabel>

          {/* All corners */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
            <PresetButton value={0} selected={state.radius === 0} onClick={() => updateState({ radius: 0, cornersExpanded: false })} />
            <PresetButton value={4} selected={state.radius === 4} onClick={() => updateState({ radius: 4, cornersExpanded: false })} />
            <PresetButton value={8} selected={state.radius === 8} onClick={() => updateState({ radius: 8, cornersExpanded: false })} />
            <PresetButton value={12} selected={state.radius === 12} onClick={() => updateState({ radius: 12, cornersExpanded: false })} />
            <ExpandButton expanded={state.cornersExpanded} onClick={() => updateState({ cornersExpanded: !state.cornersExpanded })} />
          </div>

          {/* Per-corner (expanded) */}
          {state.cornersExpanded && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {/* Top-Left */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <DecorativeIcon>
                  <RectIcon size={14} highlighted={{ tl: true }} />
                </DecorativeIcon>
                <NumberInput value={state.radiusTL} onChange={(v) => updateState({ radiusTL: v })} />
              </div>
              {/* Top-Right */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <DecorativeIcon>
                  <RectIcon size={14} highlighted={{ tr: true }} />
                </DecorativeIcon>
                <NumberInput value={state.radiusTR} onChange={(v) => updateState({ radiusTR: v })} />
              </div>
              {/* Bottom-Left */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <DecorativeIcon>
                  <RectIcon size={14} highlighted={{ bl: true }} />
                </DecorativeIcon>
                <NumberInput value={state.radiusBL} onChange={(v) => updateState({ radiusBL: v })} />
              </div>
              {/* Bottom-Right */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <DecorativeIcon>
                  <RectIcon size={14} highlighted={{ br: true }} />
                </DecorativeIcon>
                <NumberInput value={state.radiusBR} onChange={(v) => updateState({ radiusBR: v })} />
              </div>
            </div>
          )}
        </div>
      </div>

      <PanelFooter
        hints={[
          { label: 'Abbrechen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />
    </InlinePanel>
  )
}

export default InlineBorderPanel
