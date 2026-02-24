/**
 * InlineLayoutPanel - Visual layout picker for Mirror DSL
 *
 * Design: 2-column layout
 * - Left: Size, Direction, Gap
 * - Right: Padding, Align
 *
 * Triggered by: ver, hor, grid keywords or double-click on layout properties
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { colors } from '../theme'
import { ColorSystemPalette } from './ColorSystemPalette'
import { TokenSwatches } from './TokenSwatches'
import { TokenButtonRow } from './TokenButtonRow'
import {
  ArrowRight,
  ArrowDown,
  Grid3X3,
  MoveHorizontal,
  MoveVertical,
  Minimize2,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Layers,
  ChevronsLeftRight,
  DollarSign,
  Hash,
} from 'lucide-react'

// ============================================
// Types
// ============================================

type Direction = 'ver' | 'hor' | 'grid' | 'stacked' | null
type AlignH = 'left' | 'center' | 'right' | null
type AlignV = 'top' | 'center' | 'bottom' | null
type SizeMode = 'auto' | 'min' | 'max' | 'fixed'

interface LayoutState {
  direction: Direction
  between: boolean
  alignH: AlignH
  alignV: AlignV
  gap: string | number  // Can be number or token like "$sm.gap"
  widthMode: SizeMode
  widthValue: number
  heightMode: SizeMode
  heightValue: number
  // Padding - can be combined or separate, or tokens
  padH: string | number  // horizontal combined
  padV: string | number  // vertical combined
  padLeft: number
  padRight: number
  padTop: number
  padBottom: number
  // Whether padding is expanded to show individual sides
  padHExpanded: boolean
  padVExpanded: boolean
  // Grid settings
  gridCols: number
  gridRows: number
  // Background color
  bgColor: string
  // UI state
  showColorPicker: boolean
  useTokenMode: boolean  // Toggle between token/value mode
}

interface InlineLayoutPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string) => void
  /** Called when panel values change for live sync to editor */
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
// Tab Header Component
// ============================================

export type PanelTabId = 'layout' | 'font' | 'border' | 'input' | 'image' | 'icon'

const ALL_TABS: { id: PanelTabId; label: string }[] = [
  { id: 'input', label: 'Input' },
  { id: 'image', label: 'Image' },
  { id: 'icon', label: 'Icon' },
  { id: 'layout', label: 'Layout' },
  { id: 'font', label: 'Font' },
  { id: 'border', label: 'Border' },
]

export function PanelTabsHeader({
  activeTab,
  onSwitchPanel,
  availableTabs,
  useTokenMode,
  onTokenModeChange,
}: {
  activeTab: PanelTabId
  onSwitchPanel: (panel: PanelTabId) => void
  availableTabs?: PanelTabId[]
  useTokenMode?: boolean
  onTokenModeChange?: (mode: boolean) => void
}) {
  // Filter tabs based on availableTabs prop, or show default 3 tabs
  const defaultTabs: PanelTabId[] = ['layout', 'font', 'border']
  const tabsToShow = availableTabs || defaultTabs
  const tabs = ALL_TABS.filter(tab => tabsToShow.includes(tab.id))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid #222',
      marginBottom: '4px',
      paddingLeft: '4px',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSwitchPanel(tab.id) }}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === tab.id ? '#E5E5E5' : '#666',
            cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Token Mode Toggle */}
      {onTokenModeChange && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onTokenModeChange(!useTokenMode)
          }}
          style={{
            padding: '4px 8px',
            marginRight: '8px',
            fontSize: '10px',
            fontWeight: 500,
            backgroundColor: useTokenMode ? '#252525' : '#181818',
            color: useTokenMode ? '#ccc' : '#555',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
          title="Token Mode"
        >
          Tokens
        </button>
      )}
    </div>
  )
}

// ============================================
// Styles
// ============================================

const COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
}

// ============================================
// Code Generation
// ============================================

function generateLayoutCode(state: LayoutState): string {
  const parts: string[] = []

  // ============================================
  // Property Order: Size → Layout → Spacing → Visual
  // ============================================

  // 1. SIZE (width, height) - most important, comes first
  if (state.widthMode === 'min') parts.push('width hug')
  else if (state.widthMode === 'max') parts.push('width full')
  else if (state.widthMode === 'fixed' && state.widthValue > 0) parts.push(`width ${state.widthValue}`)

  if (state.heightMode === 'min') parts.push('height hug')
  else if (state.heightMode === 'max') parts.push('height full')
  else if (state.heightMode === 'fixed' && state.heightValue > 0) parts.push(`height ${state.heightValue}`)

  // 2. DIRECTION (hor, ver, grid, stacked) - only if set
  if (state.direction) {
    if (state.direction === 'grid' && state.gridCols > 0) {
      parts.push(`grid ${state.gridCols}`)
    } else if (state.direction === 'stacked') {
      parts.push('ver')
      parts.push('stacked')
    } else {
      parts.push(state.direction)
    }
  }

  // 3. ALIGNMENT (cen, spread, hor-center, right, ver-center, bottom) - only if set
  if (state.between) {
    parts.push('spread')
  }

  // Only output alignment if explicitly set (not null)
  if (state.alignH !== null || state.alignV !== null) {
    if (state.alignH === 'center' && state.alignV === 'center') {
      parts.push('cen')
    } else {
      if (state.alignH === 'center') parts.push('hor-center')
      else if (state.alignH === 'right') parts.push('right')
      else if (state.alignH === 'left') parts.push('left')

      if (state.alignV === 'center') parts.push('ver-center')
      else if (state.alignV === 'bottom') parts.push('bottom')
      else if (state.alignV === 'top') parts.push('top')
    }
  }

  // 4. GAP (can be number or token)
  if (typeof state.gap === 'string' && state.gap.startsWith('$')) {
    parts.push(`gap ${state.gap}`)
  } else if (typeof state.gap === 'number' && state.gap > 0) {
    parts.push(`gap ${state.gap}`)
  }

  // 5. PADDING (can be numbers or tokens)
  // Helper to check if value is set (number > 0 or token string)
  const hasValue = (v: string | number) => {
    if (typeof v === 'string') return v.startsWith('$')
    return v > 0
  }

  if (state.padHExpanded || state.padVExpanded) {
    // Expanded mode uses individual sides (numbers only for now)
    const top = state.padVExpanded ? state.padTop : (typeof state.padV === 'number' ? state.padV : 0)
    const bottom = state.padVExpanded ? state.padBottom : (typeof state.padV === 'number' ? state.padV : 0)
    const left = state.padHExpanded ? state.padLeft : (typeof state.padH === 'number' ? state.padH : 0)
    const right = state.padHExpanded ? state.padRight : (typeof state.padH === 'number' ? state.padH : 0)

    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      if (top === right && right === bottom && bottom === left) {
        parts.push(`pad ${top}`)
      } else if (top === bottom && left === right) {
        parts.push(`pad ${top} ${left}`)
      } else {
        parts.push(`pad ${top} ${right} ${bottom} ${left}`)
      }
    }
  } else if (hasValue(state.padH) || hasValue(state.padV)) {
    // Token or simple padding
    const padHStr = typeof state.padH === 'string' ? state.padH : (state.padH > 0 ? state.padH : '')
    const padVStr = typeof state.padV === 'string' ? state.padV : (state.padV > 0 ? state.padV : '')

    if (padHStr && padVStr && padHStr === padVStr) {
      parts.push(`pad ${padHStr}`)
    } else if (padHStr && padVStr) {
      parts.push(`pad ${padVStr} ${padHStr}`)
    } else if (padVStr) {
      parts.push(`pad ${padVStr} 0`)
    } else if (padHStr) {
      parts.push(`pad 0 ${padHStr}`)
    }
  }

  // 6. BACKGROUND (visual, comes last in layout)
  if (state.bgColor) {
    parts.push(`bg ${state.bgColor}`)
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseLayoutCode(code: string): Partial<LayoutState> {
  const state: Partial<LayoutState> = {}
  if (!code) return state

  // Direction - support both short and long forms
  // IMPORTANT: Check for hor/ver NOT followed by -center to avoid matching hor-center/ver-center
  if (code.includes('stacked')) state.direction = 'stacked'
  else if (/\b(hor|horizontal)(?!-center)\b/.test(code)) state.direction = 'hor'
  else if (/\bgrid\b/.test(code)) state.direction = 'grid'
  else if (/\b(ver|vertical)(?!-center)\b/.test(code)) state.direction = 'ver'

  // Spread (space-between) - also "between"
  if (/\b(spread|between)\b/.test(code)) state.between = true

  // Alignment - support all forms
  if (/\b(cen|center)\b/.test(code) && !code.includes('hor-center') && !code.includes('ver-center')) {
    state.alignH = 'center'
    state.alignV = 'center'
  } else {
    // Horizontal alignment
    if (code.includes('hor-center')) state.alignH = 'center'
    else if (/\bright\b/.test(code)) state.alignH = 'right'
    else if (/\bleft\b/.test(code)) state.alignH = 'left'

    // Vertical alignment
    if (code.includes('ver-center')) state.alignV = 'center'
    else if (/\bbottom\b/.test(code)) state.alignV = 'bottom'
    else if (/\btop\b/.test(code)) state.alignV = 'top'
  }

  // Gap - support both "gap" and "g", and token values
  const gapMatch = code.match(/\b(?:gap|g)\s+(\$[\w.-]+|\d+)/)
  if (gapMatch) {
    const val = gapMatch[1]
    state.gap = val.startsWith('$') ? val : parseInt(val, 10)
  }

  // Width - support "width", "w" and "size" with hug/full/N
  // "size hug" = width hug, "size full" = width full
  // "size 300" or "size 300 200" = width 300 (first value)
  if (/\b(?:width|w)\s+hug\b/.test(code) || /\bsize\s+hug\b/.test(code)) {
    state.widthMode = 'min'
  } else if (/\b(?:width|w)\s+full\b/.test(code) || /\bsize\s+full\b/.test(code)) {
    state.widthMode = 'max'
  } else {
    // Check for "w N" or "width N"
    const wMatch = code.match(/\b(?:width|w)\s+(\d+(?:\.\d+)?%?)/)
    if (wMatch) {
      state.widthMode = 'fixed'
      state.widthValue = wMatch[1].includes('%')
        ? parseFloat(wMatch[1])
        : parseInt(wMatch[1], 10)
    } else {
      // Check for "size N" or "size N M" (first value is width)
      const sizeMatch = code.match(/\bsize\s+(?:hug\s+)?(\d+(?:\.\d+)?%?)/)
      if (sizeMatch) {
        state.widthMode = 'fixed'
        state.widthValue = sizeMatch[1].includes('%')
          ? parseFloat(sizeMatch[1])
          : parseInt(sizeMatch[1], 10)
      }
    }
  }

  // Height - support "height", "h"
  // Also check "size N M" where M is height
  if (/\b(?:height|h)\s+hug\b/.test(code)) {
    state.heightMode = 'min'
  } else if (/\b(?:height|h)\s+full\b/.test(code)) {
    state.heightMode = 'max'
  } else {
    const hMatch = code.match(/\b(?:height|h)\s+(\d+(?:\.\d+)?%?)/)
    if (hMatch) {
      state.heightMode = 'fixed'
      state.heightValue = hMatch[1].includes('%')
        ? parseFloat(hMatch[1])
        : parseInt(hMatch[1], 10)
    } else {
      // Check for "size N M" (second value is height)
      const sizeMatch = code.match(/\bsize\s+(?:hug\s+)?(\d+(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?%?)/)
      if (sizeMatch) {
        state.heightMode = 'fixed'
        state.heightValue = sizeMatch[2].includes('%')
          ? parseFloat(sizeMatch[2])
          : parseInt(sizeMatch[2], 10)
      }
    }
  }

  // Padding - supports "pad", "padding", "p" with 1-4 values or tokens
  // Token pattern: $name.pad or $name-pad
  const padTokenMatch = code.match(/\b(?:pad(?:ding)?|p)\s+(\$[\w.-]+)(?:\s+(\$[\w.-]+|\d+))?/)
  const padNumMatch = code.match(/\b(?:pad(?:ding)?|p)\s+(\d+)(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+(\d+))?/)

  if (padTokenMatch) {
    // Token-based padding (1 or 2 tokens)
    const v1 = padTokenMatch[1]
    const v2 = padTokenMatch[2] || v1
    state.padV = v1.startsWith('$') ? v1 : parseInt(v1, 10)
    state.padH = v2.startsWith('$') ? v2 : parseInt(v2, 10)
  } else if (padNumMatch) {
    const v1 = parseInt(padNumMatch[1], 10)
    const v2 = padNumMatch[2] ? parseInt(padNumMatch[2], 10) : v1
    const v3 = padNumMatch[3] ? parseInt(padNumMatch[3], 10) : v1
    const v4 = padNumMatch[4] ? parseInt(padNumMatch[4], 10) : v2

    if (padNumMatch[3] || padNumMatch[4]) {
      // 4-value padding: top right bottom left
      state.padTop = v1
      state.padRight = v2
      state.padBottom = v3
      state.padLeft = v4
      state.padVExpanded = true
      state.padHExpanded = true
    } else {
      // 1 or 2 value padding: vertical horizontal
      state.padV = v1
      state.padH = v2
    }
  }

  // Grid columns
  const gridMatch = code.match(/\bgrid\s+(\d+)/)
  if (gridMatch) {
    state.gridCols = parseInt(gridMatch[1], 10)
  }

  // Background color - support "bg", "background"
  const bgMatch = code.match(/\b(?:bg|background)\s+(#[0-9a-fA-F]{3,8}|\$[\w-]+|\w+)/)
  if (bgMatch) {
    state.bgColor = bgMatch[1]
  }

  return state
}

// ============================================
// UI Components
// ============================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.label,
      marginBottom: '4px',
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

function PresetButton({
  value,
  selected,
  onClick,
}: {
  value: number
  selected: boolean
  onClick: () => void
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
      {value}
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

function SizeRow({
  label,
  mode,
  value,
  onModeChange,
  onValueChange,
}: {
  label: 'W' | 'H'
  mode: SizeMode
  value: number
  onModeChange: (m: SizeMode) => void
  onValueChange: (v: number) => void
}) {
  const isWidth = label === 'W'
  const iconRotation = isWidth ? 'rotate(45deg)' : 'rotate(135deg)'

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <IconButton
        selected={mode === 'min'}
        onClick={() => onModeChange(mode === 'min' ? 'auto' : 'min')}
        title="Shrink to content"
      >
        <Minimize2 size={14} style={{ transform: iconRotation }} />
      </IconButton>
      <IconButton
        selected={mode === 'max'}
        onClick={() => onModeChange(mode === 'max' ? 'auto' : 'max')}
        title="Fill available"
      >
        <Maximize2 size={14} style={{ transform: iconRotation }} />
      </IconButton>
      <NumberInput
        value={mode === 'fixed' ? value : 0}
        onChange={(v) => { onModeChange('fixed'); onValueChange(v) }}
        placeholder=""
        width={52}
      />
    </div>
  )
}

function PaddingIcon({ mode }: { mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom' }) {
  if (mode === 'horizontal') {
    // |□| - vertical lines on sides
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '2px', height: '10px', backgroundColor: COLORS.label }} />
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
        <div style={{ width: '2px', height: '10px', backgroundColor: COLORS.label }} />
      </div>
    )
  } else if (mode === 'vertical') {
    // ═ - horizontal lines top/bottom
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '10px', height: '2px', backgroundColor: COLORS.label }} />
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
        <div style={{ width: '10px', height: '2px', backgroundColor: COLORS.label }} />
      </div>
    )
  } else if (mode === 'left') {
    // |□ - only left line
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '2px', height: '10px', backgroundColor: COLORS.label }} />
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
      </div>
    )
  } else if (mode === 'right') {
    // □| - only right line
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
        <div style={{ width: '2px', height: '10px', backgroundColor: COLORS.label }} />
      </div>
    )
  } else if (mode === 'top') {
    // ═ above box
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '10px', height: '2px', backgroundColor: COLORS.label }} />
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
      </div>
    )
  } else {
    // ═ below box (bottom)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
        <div style={{ width: '6px', height: '6px', border: `1px solid ${COLORS.label}`, borderRadius: '1px' }} />
        <div style={{ width: '10px', height: '2px', backgroundColor: COLORS.label }} />
      </div>
    )
  }
}

function PaddingValueRow({
  mode,
  value,
  onChange,
  showExpand,
  isExpanded,
  onToggleExpand,
  useTokenMode,
  editorCode,
}: {
  mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom'
  value: string | number
  onChange: (v: string | number) => void
  showExpand?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  useTokenMode?: boolean
  editorCode?: string
}) {
  // Check if value is explicitly set (not empty string)
  const isSet = value !== ''
  // Get numeric value for preset comparison
  const numValue = typeof value === 'number' ? value : 0
  const isToken = typeof value === 'string' && value.startsWith('$')

  // Token mode with tokens from editor
  if (useTokenMode && editorCode) {
    return (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <DecorativeIcon>
          <PaddingIcon mode={mode} />
        </DecorativeIcon>
        <TokenButtonRow
          code={editorCode}
          property="pad"
          value={value}
          onSelect={(token) => onChange(token)}
          maxTokens={5}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <DecorativeIcon>
        <PaddingIcon mode={mode} />
      </DecorativeIcon>
      <PresetButton value={0} selected={isSet && !isToken && numValue === 0} onClick={() => onChange(0)} />
      <PresetButton value={8} selected={isSet && !isToken && numValue === 8} onClick={() => onChange(8)} />
      <PresetButton value={16} selected={isSet && !isToken && numValue === 16} onClick={() => onChange(16)} />
      <NumberInput value={numValue} onChange={(v) => onChange(v)} presets={[0, 8, 16]} />
      {showExpand && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation() // Prevent click-outside from closing panel during DOM update
            onToggleExpand?.()
          }}
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
          title={isExpanded ? 'Collapse' : 'Expand for left/right'}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      )}
    </div>
  )
}

function PaddingSection({
  isHorizontal,
  combined,
  first,
  second,
  isExpanded,
  onCombinedChange,
  onFirstChange,
  onSecondChange,
  onToggleExpand,
  useTokenMode,
  editorCode,
}: {
  isHorizontal: boolean
  combined: string | number
  first: number // left or top
  second: number // right or bottom
  isExpanded: boolean
  onCombinedChange: (v: string | number) => void
  onFirstChange: (v: number) => void
  onSecondChange: (v: number) => void
  onToggleExpand: () => void
  useTokenMode?: boolean
  editorCode?: string
}) {
  if (!isExpanded) {
    return (
      <PaddingValueRow
        mode={isHorizontal ? 'horizontal' : 'vertical'}
        value={combined}
        onChange={onCombinedChange}
        showExpand
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        useTokenMode={useTokenMode}
        editorCode={editorCode}
      />
    )
  }

  // Expanded: show two rows (always numeric, no token mode)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <PaddingValueRow
        mode={isHorizontal ? 'left' : 'top'}
        value={first}
        onChange={(v) => onFirstChange(typeof v === 'number' ? v : 0)}
        showExpand
        isExpanded={true}
        onToggleExpand={onToggleExpand}
      />
      <PaddingValueRow
        mode={isHorizontal ? 'right' : 'bottom'}
        value={second}
        onChange={(v) => onSecondChange(typeof v === 'number' ? v : 0)}
      />
    </div>
  )
}

function DirectionPicker({
  value,
  onChange,
}: {
  value: Direction
  onChange: (v: Direction) => void
}) {
  // Toggle behavior: clicking selected item deselects it
  const handleClick = (dir: 'hor' | 'ver' | 'grid' | 'stacked') => {
    onChange(value === dir ? null : dir)
  }

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <IconButton
        selected={value === 'hor'}
        onClick={() => handleClick('hor')}
        title="Horizontal"
      >
        <ArrowRight size={16} />
      </IconButton>
      <IconButton
        selected={value === 'ver'}
        onClick={() => handleClick('ver')}
        title="Vertical"
      >
        <ArrowDown size={16} />
      </IconButton>
      <IconButton
        selected={value === 'grid'}
        onClick={() => handleClick('grid')}
        title="Grid"
      >
        <Grid3X3 size={16} />
      </IconButton>
      <IconButton
        selected={value === 'stacked'}
        onClick={() => handleClick('stacked')}
        title="Stacked"
      >
        <Layers size={16} />
      </IconButton>
    </div>
  )
}

function GridSettings({
  cols,
  rows,
  onColsChange,
  onRowsChange,
}: {
  cols: number
  rows: number
  onColsChange: (v: number) => void
  onRowsChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: COLORS.label }}>X</span>
        <NumberInput value={cols} onChange={onColsChange} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: COLORS.label }}>Y</span>
        <NumberInput value={rows} onChange={onRowsChange} />
      </div>
    </div>
  )
}

function AlignmentGrid({
  alignH,
  alignV,
  onChange,
}: {
  alignH: AlignH
  alignV: AlignV
  onChange: (h: AlignH, v: AlignV) => void
}) {
  type NonNullAlignH = 'left' | 'center' | 'right'
  type NonNullAlignV = 'top' | 'center' | 'bottom'
  const positions: { h: NonNullAlignH; v: NonNullAlignV }[][] = [
    [{ h: 'left', v: 'top' }, { h: 'center', v: 'top' }, { h: 'right', v: 'top' }],
    [{ h: 'left', v: 'center' }, { h: 'center', v: 'center' }, { h: 'right', v: 'center' }],
    [{ h: 'left', v: 'bottom' }, { h: 'center', v: 'bottom' }, { h: 'right', v: 'bottom' }],
  ]

  // Toggle behavior: clicking selected item deselects it
  const handleClick = (h: NonNullAlignH, v: NonNullAlignV) => {
    const isSelected = h === alignH && v === alignV
    if (isSelected) {
      // Deselect both
      onChange(null, null)
    } else {
      onChange(h, v)
    }
  }

  // 3 columns × 24px + 2 gaps × 4px = 80px
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 24px)',
      gap: '4px',
    }}>
      {positions.flat().map((pos, i) => {
        const isSelected = pos.h === alignH && pos.v === alignV
        return (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); handleClick(pos.h, pos.v) }}
            style={{
              height: '24px',
              backgroundColor: isSelected ? COLORS.buttonBgSelected : COLORS.buttonBg,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
        )
      })}
    </div>
  )
}

function ModeToggle({
  useTokenMode,
  onChange,
}: {
  useTokenMode: boolean
  onChange: (mode: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      <button
        onMouseDown={(e) => { e.preventDefault(); onChange(true) }}
        title="Token Mode"
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: useTokenMode ? COLORS.buttonBgSelected : 'transparent',
          color: useTokenMode ? COLORS.textLight : COLORS.text,
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        <DollarSign size={12} />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onChange(false) }}
        title="Value Mode"
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: !useTokenMode ? COLORS.buttonBgSelected : 'transparent',
          color: !useTokenMode ? COLORS.textLight : COLORS.text,
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      >
        <Hash size={12} />
      </button>
    </div>
  )
}

function GapRow({
  value,
  onChange,
  useTokenMode,
  editorCode,
}: {
  value: string | number
  onChange: (v: string | number) => void
  useTokenMode?: boolean
  editorCode?: string
}) {
  // Check if value is explicitly set (not empty string)
  const isSet = value !== ''
  // Get numeric value for preset comparison
  const numValue = typeof value === 'number' ? value : 0
  const isToken = typeof value === 'string' && value.startsWith('$')

  if (useTokenMode && editorCode) {
    return (
      <TokenButtonRow
        code={editorCode}
        property="gap"
        value={value}
        onSelect={(token) => onChange(token)}
        maxTokens={5}
      />
    )
  }

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <PresetButton value={0} selected={isSet && !isToken && numValue === 0} onClick={() => onChange(0)} />
      <PresetButton value={4} selected={isSet && !isToken && numValue === 4} onClick={() => onChange(4)} />
      <PresetButton value={8} selected={isSet && !isToken && numValue === 8} onClick={() => onChange(8)} />
      <NumberInput value={numValue} onChange={(v) => onChange(v)} presets={[0, 4, 8]} width={24} />
    </div>
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

function MiniColorPicker({
  color,
  onChange,
  onClose,
  triggerRef,
}: {
  color: string
  onChange: (color: string) => void
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
        border: `1px solid ${COLORS.label}`,
        borderRadius: '8px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '12px' }}>
        <ColorSystemPalette
          color={color || '#FFFFFF'}
          onChange={(c) => onChange(c.toUpperCase())}
        />
      </div>
      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${COLORS.label}`,
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
            border: `1px solid ${COLORS.label}`,
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
            border: `1px solid ${COLORS.label}`,
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

const defaultState: LayoutState = {
  direction: null,
  between: false,
  alignH: null,
  alignV: null,
  gap: '',
  widthMode: 'auto',
  widthValue: 0,
  heightMode: 'auto',
  heightValue: 0,
  padH: '',
  padV: '',
  padLeft: 0,
  padRight: 0,
  padTop: 0,
  padBottom: 0,
  padHExpanded: false,
  padVExpanded: false,
  gridCols: 3,
  gridRows: 0,
  bgColor: '',
  showColorPicker: false,
  useTokenMode: false,
}

export function InlineLayoutPanel({
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
}: InlineLayoutPanelProps) {
  // Set to true for design iteration
  const debugAlwaysOpen = false
  const effectiveIsOpen = debugAlwaysOpen || isOpen

  const [state, setState] = useState<LayoutState>(defaultState)
  // Track if user has interacted with the panel (to enable live sync)
  const hasUserInteractedRef = useRef(false)
  // Track pending sync to avoid calling onCodeChange during render
  const pendingSyncRef = useRef(false)
  // Ref for color picker positioning
  const colorButtonRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isOpen) {
      hasUserInteractedRef.current = false
      pendingSyncRef.current = false
      const parsed = parseLayoutCode(initialCode || '')
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

  // Sync to editor after user interaction (runs after render)
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange) {
      pendingSyncRef.current = false
      const code = generateLayoutCode(state)
      onCodeChange(code)
    }
  }, [state, onCodeChange])

  // Wrapper for setState that marks user interaction and schedules sync
  const updateState = useCallback((updater: (prev: LayoutState) => LayoutState) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setState(updater)
  }, [])

  const handleSubmit = useCallback(() => {
    const code = generateLayoutCode(state)
    onSelect(code)
    onClose()
  }, [state, onSelect, onClose])

  // Use refs to track state for the global handler
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen
  const showColorPickerRef = useRef(state.showColorPicker)
  showColorPickerRef.current = state.showColorPicker
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Global keyboard handler (Enter to submit, Escape to close)
  // Uses refs to always check current state, avoiding stale closures
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always check current isOpen state via ref
      if (!isOpenRef.current) {
        return
      }

      // CRITICAL: Don't intercept Enter from CodeMirror editor
      // This prevents the panel from capturing Enter presses in the text editor
      const target = e.target as HTMLElement
      if (target.closest('.cm-editor') || target.closest('.cm-content')) {
        return
      }

      if (e.key === 'Enter' && !showColorPickerRef.current) {
        e.preventDefault()
        handleSubmitRef.current()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (showColorPickerRef.current) {
          setState(prev => ({ ...prev, showColorPicker: false }))
        } else {
          onCloseRef.current()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, []) // Empty deps - handler checks refs for current state

  const debugPosition = debugAlwaysOpen ? { x: 100, y: 100 } : position

  return (
    <InlinePanel
      isOpen={effectiveIsOpen}
      onClose={onClose}
      position={debugPosition}
      width={360}
      maxHeight={400}
      testId="panel-layout-picker"
      disableClickOutsideClose
    >
      {/* Tabs header when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader
          activeTab="layout"
          onSwitchPanel={onSwitchPanel}
          availableTabs={availableTabs}
          useTokenMode={state.useTokenMode}
          onTokenModeChange={(mode) => {
            updateState(s => ({ ...s, useTokenMode: mode }))
            // Notify parent if callback provided (saves to project)
            onTokenModeChange?.(mode)
          }}
        />
      )}
      <div
        style={{ padding: showTabs ? '8px 16px 16px 16px' : '16px', flex: 1 }}
      >
        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column */}
          <div>
            {/* Size */}
            <div>
              <SectionLabel>Size</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <SizeRow
                  label="W"
                  mode={state.widthMode}
                  value={state.widthValue}
                  onModeChange={(m) => updateState(s => ({ ...s, widthMode: m }))}
                  onValueChange={(v) => updateState(s => ({ ...s, widthValue: v }))}
                />
                <SizeRow
                  label="H"
                  mode={state.heightMode}
                  value={state.heightValue}
                  onModeChange={(m) => updateState(s => ({ ...s, heightMode: m }))}
                  onValueChange={(v) => updateState(s => ({ ...s, heightValue: v }))}
                />
              </div>
            </div>

            {/* Direction */}
            <div style={{ marginTop: '16px' }}>
              <SectionLabel>Direction</SectionLabel>
              <DirectionPicker
                value={state.direction}
                onChange={(d) => updateState(s => ({ ...s, direction: d }))}
              />
              {state.direction === 'grid' && (
                <GridSettings
                  cols={state.gridCols}
                  rows={state.gridRows}
                  onColsChange={(v) => updateState(s => ({ ...s, gridCols: v }))}
                  onRowsChange={(v) => updateState(s => ({ ...s, gridRows: v }))}
                />
              )}
            </div>

            {/* Gap */}
            <div style={{ marginTop: '16px' }}>
              <SectionLabel>Gap</SectionLabel>
              <GapRow
                value={state.gap}
                onChange={(v) => updateState(s => ({ ...s, gap: v }))}
                useTokenMode={state.useTokenMode}
                editorCode={editorCode}
              />
            </div>

          </div>

          {/* Right Column */}
          <div>
            {/* Padding */}
            <SectionLabel>Padding</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <PaddingSection
                isHorizontal={true}
                combined={state.padH}
                first={state.padLeft}
                second={state.padRight}
                isExpanded={state.padHExpanded}
                onCombinedChange={(v) => updateState(s => ({ ...s, padH: v }))}
                onFirstChange={(v) => updateState(s => ({ ...s, padLeft: v }))}
                onSecondChange={(v) => updateState(s => ({ ...s, padRight: v }))}
                onToggleExpand={() => updateState(s => {
                  // Get numeric value for copying to sides
                  const numVal = typeof s.padH === 'number' ? s.padH : 0
                  return {
                    ...s,
                    padHExpanded: !s.padHExpanded,
                    // When expanding, copy combined value to both sides
                    ...((!s.padHExpanded) ? { padLeft: numVal, padRight: numVal } : {}),
                  }
                })}
                useTokenMode={state.useTokenMode}
                editorCode={editorCode}
              />
              <PaddingSection
                isHorizontal={false}
                combined={state.padV}
                first={state.padTop}
                second={state.padBottom}
                isExpanded={state.padVExpanded}
                onCombinedChange={(v) => updateState(s => ({ ...s, padV: v }))}
                onFirstChange={(v) => updateState(s => ({ ...s, padTop: v }))}
                onSecondChange={(v) => updateState(s => ({ ...s, padBottom: v }))}
                onToggleExpand={() => updateState(s => {
                  // Get numeric value for copying to sides
                  const numVal = typeof s.padV === 'number' ? s.padV : 0
                  return {
                    ...s,
                    padVExpanded: !s.padVExpanded,
                    // When expanding, copy combined value to both sides
                    ...((!s.padVExpanded) ? { padTop: numVal, padBottom: numVal } : {}),
                  }
                })}
                useTokenMode={state.useTokenMode}
                editorCode={editorCode}
              />
            </div>

            {/* Align & Spread - same row */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
              <div>
                <SectionLabel>Align</SectionLabel>
                <AlignmentGrid
                  alignH={state.alignH}
                  alignV={state.alignV}
                  onChange={(h, v) => updateState(s => ({
                    ...s,
                    alignH: h,
                    alignV: v,
                    // Disable spread when horizontal alignment is center or right (not null/left)
                    between: (h === 'center' || h === 'right') ? false : s.between,
                  }))}
                />
              </div>
              <div>
                <SectionLabel>Spread</SectionLabel>
                <IconButton
                  selected={state.between}
                  onClick={() => updateState(s => ({
                    ...s,
                    between: !s.between,
                    // Reset horizontal alignment to null when enabling spread
                    alignH: !s.between ? null : s.alignH,
                  }))}
                  title="Spread (space-between)"
                >
                  <ChevronsLeftRight size={14} />
                </IconButton>
              </div>
            </div>

          </div>
        </div>

        {/* Background - full width row */}
        <div style={{ marginTop: '16px' }}>
          <SectionLabel>Background</SectionLabel>
          {state.useTokenMode ? (
            /* Token Mode: Only token swatches */
            <TokenSwatches
              code={editorCode || ''}
              onSelect={(token) => updateState(s => ({ ...s, bgColor: token }))}
            />
          ) : (
            /* Value Mode: Color button + picker */
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div ref={colorButtonRef as React.RefObject<HTMLDivElement>}>
                  <ColorButton
                    color={state.bgColor}
                    onClick={() => updateState(s => ({ ...s, showColorPicker: !s.showColorPicker }))}
                  />
                </div>
              </div>
              {/* Mini Color Picker */}
              {state.showColorPicker && (
                <MiniColorPicker
                  color={state.bgColor}
                  onChange={(c) => updateState(s => ({ ...s, bgColor: c }))}
                  onClose={() => updateState(s => ({ ...s, showColorPicker: false }))}
                  triggerRef={colorButtonRef}
                />
              )}
            </>
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
