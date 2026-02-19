/**
 * InlineLayoutPanel - Visual layout picker for Mirror DSL
 *
 * Design: 2-column layout
 * - Left: Size, Direction, Gap
 * - Right: Padding, Align
 *
 * Triggered by: ver, hor, grid keywords or double-click on layout properties
 */
import { useState, useEffect, useCallback } from 'react'
import { InlinePanel } from './InlinePanel'
import { colors } from '../theme'
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
} from 'lucide-react'

// ============================================
// Types
// ============================================

type Direction = 'ver' | 'hor' | 'grid' | 'stacked'
type AlignH = 'left' | 'center' | 'right'
type AlignV = 'top' | 'center' | 'bottom'
type SizeMode = 'auto' | 'min' | 'max' | 'fixed'

interface LayoutState {
  direction: Direction
  between: boolean
  alignH: AlignH
  alignV: AlignV
  gap: number
  widthMode: SizeMode
  widthValue: number
  heightMode: SizeMode
  heightValue: number
  // Padding - can be combined or separate
  padH: number // horizontal combined
  padV: number // vertical combined
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
}

interface InlineLayoutPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string) => void
  position: { x: number; y: number }
  initialCode?: string
}

// ============================================
// Styles
// ============================================

const COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#222',
  buttonBgSelected: '#333',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
}

// ============================================
// Code Generation
// ============================================

function generateLayoutCode(state: LayoutState): string {
  const parts: string[] = []

  // Direction (with grid columns if grid)
  if (state.direction === 'grid' && state.gridCols > 0) {
    parts.push(`grid ${state.gridCols}`)
  } else if (state.direction === 'stacked') {
    // Stacked needs a base direction, default to ver
    parts.push('ver')
    parts.push('stacked')
  } else {
    parts.push(state.direction)
  }

  // Between
  if (state.between) {
    parts.push('between')
  }

  // Alignment
  if (state.alignH === 'center' && state.alignV === 'center') {
    parts.push('cen')
  } else {
    if (state.direction === 'hor') {
      if (state.alignH === 'center') parts.push('hor-cen')
      else if (state.alignH === 'right') parts.push('hor-r')
      if (state.alignV === 'center') parts.push('ver-cen')
      else if (state.alignV === 'bottom') parts.push('ver-b')
    } else if (state.direction === 'ver') {
      if (state.alignV === 'center') parts.push('ver-cen')
      else if (state.alignV === 'bottom') parts.push('ver-b')
      if (state.alignH === 'center') parts.push('hor-cen')
      else if (state.alignH === 'right') parts.push('hor-r')
    }
  }

  // Gap
  if (state.gap > 0) {
    parts.push(`g ${state.gap}`)
  }

  // Size
  if (state.widthMode === 'min') parts.push('w-min')
  else if (state.widthMode === 'max') parts.push('w-max')
  else if (state.widthMode === 'fixed' && state.widthValue > 0) parts.push(`w ${state.widthValue}`)

  if (state.heightMode === 'min') parts.push('h-min')
  else if (state.heightMode === 'max') parts.push('h-max')
  else if (state.heightMode === 'fixed' && state.heightValue > 0) parts.push(`h ${state.heightValue}`)

  // Padding
  if (state.padHExpanded || state.padVExpanded) {
    // Use separate values - pad top right bottom left
    const top = state.padVExpanded ? state.padTop : state.padV
    const bottom = state.padVExpanded ? state.padBottom : state.padV
    const left = state.padHExpanded ? state.padLeft : state.padH
    const right = state.padHExpanded ? state.padRight : state.padH

    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      if (top === right && right === bottom && bottom === left) {
        parts.push(`pad ${top}`)
      } else if (top === bottom && left === right) {
        parts.push(`pad ${top} ${left}`)
      } else {
        parts.push(`pad ${top} ${right} ${bottom} ${left}`)
      }
    }
  } else if (state.padH > 0 || state.padV > 0) {
    if (state.padH === state.padV) {
      parts.push(`pad ${state.padH}`)
    } else {
      parts.push(`pad ${state.padV} ${state.padH}`)
    }
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseLayoutCode(code: string): Partial<LayoutState> {
  const state: Partial<LayoutState> = {}
  if (!code) return state

  if (code.includes('stacked')) state.direction = 'stacked'
  else if (code.includes('hor')) state.direction = 'hor'
  else if (code.includes('grid')) state.direction = 'grid'
  else if (code.includes('ver')) state.direction = 'ver'

  if (code.includes('cen') && !code.includes('hor-cen') && !code.includes('ver-cen')) {
    state.alignH = 'center'
    state.alignV = 'center'
  } else {
    if (code.includes('hor-l')) state.alignH = 'left'
    else if (code.includes('hor-cen')) state.alignH = 'center'
    else if (code.includes('hor-r')) state.alignH = 'right'
    if (code.includes('ver-t')) state.alignV = 'top'
    else if (code.includes('ver-cen')) state.alignV = 'center'
    else if (code.includes('ver-b')) state.alignV = 'bottom'
  }

  const gapMatch = code.match(/g(?:ap)?\s+(\d+)/)
  if (gapMatch) state.gap = parseInt(gapMatch[1], 10)

  if (code.includes('w-min')) state.widthMode = 'min'
  else if (code.includes('w-max')) state.widthMode = 'max'
  const wMatch = code.match(/\bw\s+(\d+)/)
  if (wMatch) { state.widthMode = 'fixed'; state.widthValue = parseInt(wMatch[1], 10) }

  if (code.includes('h-min')) state.heightMode = 'min'
  else if (code.includes('h-max')) state.heightMode = 'max'
  const hMatch = code.match(/\bh\s+(\d+)/)
  if (hMatch) { state.heightMode = 'fixed'; state.heightValue = parseInt(hMatch[1], 10) }

  const padMatch = code.match(/pad\s+(\d+)(?:\s+(\d+))?/)
  if (padMatch) {
    const v1 = parseInt(padMatch[1], 10)
    const v2 = padMatch[2] ? parseInt(padMatch[2], 10) : v1
    state.padV = v1
    state.padH = v2
  }

  return state
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
      marginBottom: '8px',
      marginLeft: indent ? '24px' : 0, // 20px icon + 4px gap
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
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  width?: number
}) {
  return (
    <input
      type="text"
      value={value || ''}
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
        backgroundColor: COLORS.buttonBg,
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
  const Icon = isWidth ? MoveHorizontal : MoveVertical

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <DecorativeIcon>
        <Icon size={14} />
      </DecorativeIcon>
      <IconButton
        selected={mode === 'min'}
        onClick={() => onModeChange(mode === 'min' ? 'auto' : 'min')}
        title="Shrink to content"
      >
        <Minimize2 size={14} style={{ transform: 'rotate(45deg)' }} />
      </IconButton>
      <IconButton
        selected={mode === 'max'}
        onClick={() => onModeChange(mode === 'max' ? 'auto' : 'max')}
        title="Fill available"
      >
        <Maximize2 size={14} style={{ transform: 'rotate(45deg)' }} />
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
}: {
  mode: 'horizontal' | 'vertical' | 'left' | 'right' | 'top' | 'bottom'
  value: number
  onChange: (v: number) => void
  showExpand?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <DecorativeIcon>
        <PaddingIcon mode={mode} />
      </DecorativeIcon>
      <PresetButton value={0} selected={value === 0} onClick={() => onChange(0)} />
      <PresetButton value={8} selected={value === 8} onClick={() => onChange(8)} />
      <PresetButton value={16} selected={value === 16} onClick={() => onChange(16)} />
      <NumberInput value={value} onChange={onChange} />
      {showExpand && (
        <button
          onMouseDown={(e) => { e.preventDefault(); onToggleExpand?.() }}
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
}: {
  isHorizontal: boolean
  combined: number
  first: number // left or top
  second: number // right or bottom
  isExpanded: boolean
  onCombinedChange: (v: number) => void
  onFirstChange: (v: number) => void
  onSecondChange: (v: number) => void
  onToggleExpand: () => void
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
      />
    )
  }

  // Expanded: show two rows
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <PaddingValueRow
        mode={isHorizontal ? 'left' : 'top'}
        value={first}
        onChange={onFirstChange}
        showExpand
        isExpanded={true}
        onToggleExpand={onToggleExpand}
      />
      <PaddingValueRow
        mode={isHorizontal ? 'right' : 'bottom'}
        value={second}
        onChange={onSecondChange}
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
  return (
    <div style={{ display: 'flex', gap: '4px', marginLeft: '24px' }}>
      <IconButton
        selected={value === 'hor'}
        onClick={() => onChange('hor')}
        title="Horizontal"
      >
        <ArrowRight size={16} />
      </IconButton>
      <IconButton
        selected={value === 'ver'}
        onClick={() => onChange('ver')}
        title="Vertical"
      >
        <ArrowDown size={16} />
      </IconButton>
      <IconButton
        selected={value === 'grid'}
        onClick={() => onChange('grid')}
        title="Grid"
      >
        <Grid3X3 size={16} />
      </IconButton>
      <IconButton
        selected={value === 'stacked'}
        onClick={() => onChange('stacked')}
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
    <div style={{ display: 'flex', gap: '8px', marginLeft: '24px', marginTop: '8px' }}>
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
  const positions: { h: AlignH; v: AlignV }[][] = [
    [{ h: 'left', v: 'top' }, { h: 'center', v: 'top' }, { h: 'right', v: 'top' }],
    [{ h: 'left', v: 'center' }, { h: 'center', v: 'center' }, { h: 'right', v: 'center' }],
    [{ h: 'left', v: 'bottom' }, { h: 'center', v: 'bottom' }, { h: 'right', v: 'bottom' }],
  ]

  // Width to match padding row: 28 + 28 + 44 + 2*4px gaps = 108px
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '4px',
      marginLeft: '24px',
      width: '108px',
    }}>
      {positions.flat().map((pos, i) => {
        const isSelected = pos.h === alignH && pos.v === alignV
        return (
          <button
            key={i}
            onMouseDown={(e) => { e.preventDefault(); onChange(pos.h, pos.v) }}
            style={{
              height: '25px',
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

function GapRow({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <DecorativeIcon>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <div style={{ width: '4px', height: '8px', backgroundColor: COLORS.label, borderRadius: '1px' }} />
          <div style={{ width: '2px' }} />
          <div style={{ width: '4px', height: '8px', backgroundColor: COLORS.label, borderRadius: '1px' }} />
        </div>
      </DecorativeIcon>
      <PresetButton value={0} selected={value === 0} onClick={() => onChange(0)} />
      <PresetButton value={8} selected={value === 8} onClick={() => onChange(8)} />
      <PresetButton value={16} selected={value === 16} onClick={() => onChange(16)} />
      <NumberInput value={value} onChange={onChange} />
    </div>
  )
}

// ============================================
// Main Component
// ============================================

const defaultState: LayoutState = {
  direction: 'hor',
  between: false,
  alignH: 'left',
  alignV: 'top',
  gap: 0,
  widthMode: 'auto',
  widthValue: 0,
  heightMode: 'auto',
  heightValue: 0,
  padH: 0,
  padV: 0,
  padLeft: 0,
  padRight: 0,
  padTop: 0,
  padBottom: 0,
  padHExpanded: false,
  padVExpanded: false,
  gridCols: 3,
  gridRows: 0,
}

export function InlineLayoutPanel({
  isOpen,
  onClose,
  onSelect,
  position,
  initialCode,
}: InlineLayoutPanelProps) {
  // DEBUG: Force always open for design iteration
  const debugAlwaysOpen = true
  const effectiveIsOpen = debugAlwaysOpen || isOpen

  const [state, setState] = useState<LayoutState>(defaultState)

  useEffect(() => {
    if (isOpen) {
      const parsed = parseLayoutCode(initialCode || '')
      setState({ ...defaultState, ...parsed })
    }
  }, [isOpen, initialCode])

  const handleSubmit = useCallback(() => {
    const code = generateLayoutCode(state)
    onSelect(code)
    onClose()
  }, [state, onSelect, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [handleSubmit, onClose])

  const debugPosition = debugAlwaysOpen ? { x: 100, y: 100 } : position

  return (
    <InlinePanel
      isOpen={effectiveIsOpen}
      onClose={onClose}
      position={debugPosition}
      width={360}
      maxHeight={400}
    >
      <div
        style={{ padding: '16px' }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column */}
          <div>
            {/* Size */}
            <SectionLabel indent>Size</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <SizeRow
                label="W"
                mode={state.widthMode}
                value={state.widthValue}
                onModeChange={(m) => setState(s => ({ ...s, widthMode: m }))}
                onValueChange={(v) => setState(s => ({ ...s, widthValue: v }))}
              />
              <SizeRow
                label="H"
                mode={state.heightMode}
                value={state.heightValue}
                onModeChange={(m) => setState(s => ({ ...s, heightMode: m }))}
                onValueChange={(v) => setState(s => ({ ...s, heightValue: v }))}
              />
            </div>

            {/* Direction */}
            <div style={{ marginTop: '20px' }}>
              <SectionLabel indent>Direction</SectionLabel>
              <DirectionPicker
                value={state.direction}
                onChange={(d) => setState(s => ({ ...s, direction: d }))}
              />
              {state.direction === 'grid' && (
                <GridSettings
                  cols={state.gridCols}
                  rows={state.gridRows}
                  onColsChange={(v) => setState(s => ({ ...s, gridCols: v }))}
                  onRowsChange={(v) => setState(s => ({ ...s, gridRows: v }))}
                />
              )}
            </div>

            {/* Align */}
            <div style={{ marginTop: '20px' }}>
              <SectionLabel indent>Align</SectionLabel>
              <AlignmentGrid
                alignH={state.alignH}
                alignV={state.alignV}
                onChange={(h, v) => setState(s => ({ ...s, alignH: h, alignV: v }))}
              />
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Padding */}
            <SectionLabel indent>Padding</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <PaddingSection
                isHorizontal={true}
                combined={state.padH}
                first={state.padLeft}
                second={state.padRight}
                isExpanded={state.padHExpanded}
                onCombinedChange={(v) => setState(s => ({ ...s, padH: v }))}
                onFirstChange={(v) => setState(s => ({ ...s, padLeft: v }))}
                onSecondChange={(v) => setState(s => ({ ...s, padRight: v }))}
                onToggleExpand={() => setState(s => ({
                  ...s,
                  padHExpanded: !s.padHExpanded,
                  // When expanding, copy combined value to both sides
                  ...((!s.padHExpanded) ? { padLeft: s.padH, padRight: s.padH } : {}),
                }))}
              />
              <PaddingSection
                isHorizontal={false}
                combined={state.padV}
                first={state.padTop}
                second={state.padBottom}
                isExpanded={state.padVExpanded}
                onCombinedChange={(v) => setState(s => ({ ...s, padV: v }))}
                onFirstChange={(v) => setState(s => ({ ...s, padTop: v }))}
                onSecondChange={(v) => setState(s => ({ ...s, padBottom: v }))}
                onToggleExpand={() => setState(s => ({
                  ...s,
                  padVExpanded: !s.padVExpanded,
                  // When expanding, copy combined value to both sides
                  ...((!s.padVExpanded) ? { padTop: s.padV, padBottom: s.padV } : {}),
                }))}
              />
            </div>

            {/* Gap */}
            <div style={{ marginTop: '20px' }}>
              <SectionLabel indent>Gap</SectionLabel>
              <GapRow
                value={state.gap}
                onChange={(v) => setState(s => ({ ...s, gap: v }))}
              />
            </div>

            {/* Between - same level as Align */}
            <div style={{ marginTop: '20px' }}>
              <SectionLabel indent>Between</SectionLabel>
              <div style={{ marginLeft: '24px' }}>
                <IconButton
                  selected={state.between}
                  onClick={() => setState(s => ({ ...s, between: !s.between }))}
                  title="Between (space-between)"
                >
                  <ChevronsLeftRight size={14} />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InlinePanel>
  )
}
