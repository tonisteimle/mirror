/**
 * PropertyPanel Component
 *
 * Minimalist property editor for selected elements.
 * Opens on Option+Click on preview elements.
 * Reuses InlineColorPanel for color picking.
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react'
import type { TokenValue } from '../parser/types'
import { InlineColorPanel } from './InlineColorPanel'

// ============================================
// Design Tokens
// ============================================

const t = {
  bg: '#1A1A1A',
  bgInput: '#252525',
  bgHover: '#2A2A2A',
  bgActive: '#3B82F6',
  text: '#E5E5E5',
  textMuted: '#666',
  textToken: '#F59E0B',
  border: '#2A2A2A',
  radius: 3,
  radiusLg: 4,
}

// ============================================
// Icons (12px)
// ============================================

const Icons = {
  Close: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Horizontal: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Vertical: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
  Grid: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  WMin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="9" y1="12" x2="15" y2="12" />
      <polyline points="12 9 9 12 12 15" />
      <polyline points="12 9 15 12 12 15" />
    </svg>
  ),
  WMax: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="7 9 4 12 7 15" />
      <polyline points="17 9 20 12 17 15" />
    </svg>
  ),
  HMin: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="9" x2="12" y2="15" />
      <polyline points="9 12 12 9 15 12" />
      <polyline points="9 12 12 15 15 12" />
    </svg>
  ),
  HMax: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="4" x2="12" y2="20" />
      <polyline points="9 7 12 4 15 7" />
      <polyline points="9 17 12 20 15 17" />
    </svg>
  ),
}

// ============================================
// Utility Functions
// ============================================

// Boolean properties that don't require a value
const BOOLEAN_PROPS = new Set([
  'horizontal', 'vertical', 'center', 'wrap', 'stacked', 'between',
  'hor', 'ver', 'cen',
  'w-min', 'w-max', 'h-min', 'h-max',
  'hidden', 'disabled', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
  'bold', 'scroll', 'clip',
])

// Property patterns for parsing (defined once for performance)
const PROPERTY_PATTERNS = [
  // Boolean properties
  { pattern: /\b(horizontal|hor)\b/, key: 'horizontal', isBoolean: true },
  { pattern: /\b(vertical|ver)\b/, key: 'vertical', isBoolean: true },
  { pattern: /\b(center|cen)\b/, key: 'center', isBoolean: true },
  { pattern: /\bw-min\b/, key: 'w-min', isBoolean: true },
  { pattern: /\bw-max\b/, key: 'w-max', isBoolean: true },
  { pattern: /\bh-min\b/, key: 'h-min', isBoolean: true },
  { pattern: /\bh-max\b/, key: 'h-max', isBoolean: true },
  { pattern: /\bbetween\b/, key: 'between', isBoolean: true },
  { pattern: /\bwrap\b/, key: 'wrap', isBoolean: true },
  { pattern: /\bhidden\b/, key: 'hidden', isBoolean: true },
  { pattern: /\bitalic\b/, key: 'italic', isBoolean: true },
  { pattern: /\bunderline\b/, key: 'underline', isBoolean: true },
  // Alignment properties
  { pattern: /\bhor-l\b/, key: 'hor-l', isBoolean: true },
  { pattern: /\bhor-cen\b/, key: 'hor-cen', isBoolean: true },
  { pattern: /\bhor-r\b/, key: 'hor-r', isBoolean: true },
  { pattern: /\bver-t\b/, key: 'ver-t', isBoolean: true },
  { pattern: /\bver-cen\b/, key: 'ver-cen', isBoolean: true },
  { pattern: /\bver-b\b/, key: 'ver-b', isBoolean: true },
  // Value properties
  { pattern: /\bgrid\s+(\S+)/, key: 'grid' },
  { pattern: /\bw\s+([^\s,]+)/, key: 'width' },
  { pattern: /\bh\s+([^\s,]+)/, key: 'height' },
  { pattern: /\bpad\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'padding' },
  { pattern: /\bmar\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'margin' },
  { pattern: /\bbg\s+([^\s,]+)/, key: 'background' },
  { pattern: /\bcol\s+([^\s,]+)/, key: 'color' },
  { pattern: /\bsize\s+([^\s,]+)/, key: 'size' },
  { pattern: /\bweight\s+([^\s,]+)/, key: 'weight' },
  { pattern: /\bfont\s+([^\s,]+)/, key: 'font' },
  { pattern: /\b(?:gap|g)\s+([^\s,]+)/, key: 'gap' },
  { pattern: /\brad\s+([^\s,]+)/, key: 'radius' },
  { pattern: /\bbor\s+([^\s,]+(?:\s+[^\s,]+)*)/, key: 'border' },
  { pattern: /\bboc\s+([^\s,]+)/, key: 'borderColor' },
  { pattern: /\bo\s+([^\s,]+)/, key: 'opacity' },
  { pattern: /\bz\s+([^\s,]+)/, key: 'zIndex' },
  { pattern: /\bshadow\s+([^\s,]+)/, key: 'shadow' },
  { pattern: /\bcursor\s+([^\s,]+)/, key: 'cursor' },
  { pattern: /\bline\s+([^\s,]+)/, key: 'lineHeight' },
  { pattern: /\balign\s+([^\s,]+)/, key: 'align' },
  // Hover properties
  { pattern: /\bhover-bg\s+([^\s,]+)/, key: 'hover-bg' },
  { pattern: /\bhover-col\s+([^\s,]+)/, key: 'hover-col' },
  { pattern: /\bhover-opacity\s+([^\s,]+)/, key: 'hover-opacity' },
  { pattern: /\bhover-scale\s+([^\s,]+)/, key: 'hover-scale' },
]

function parseProperties(line: string): Record<string, string> {
  const props: Record<string, string> = {}
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//')) return props

  // Parse v1 inline syntax: Component prop value, prop2 value2
  const componentMatch = trimmed.match(/^-?\s*([A-Z][\w]*)\s*(.*)$/)
  if (!componentMatch) return props

  const propsString = componentMatch[2]
  if (!propsString) return props

  // Use unified pattern matching
  for (const { pattern, key, isBoolean } of PROPERTY_PATTERNS) {
    const match = propsString.match(pattern)
    if (match) {
      props[key] = isBoolean ? 'true' : (match[1] || 'true')
    }
  }

  return props
}

function getComponentName(line: string): string {
  const trimmed = line.trim()
  const match = trimmed.match(/^-?\s*([A-Z][\w]*)/)
  return match ? match[1] : 'Element'
}

// ============================================
// Base Components
// ============================================

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 500,
        color: t.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function IconButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? t.bgActive : t.bgInput,
        color: active ? '#FFF' : t.textMuted,
        border: 'none',
        borderRadius: t.radius,
        cursor: 'pointer',
        transition: 'all 0.1s',
      }}
    >
      {icon}
    </button>
  )
}

function ValueInput({
  value,
  onChange,
  placeholder,
  width = 48,
  prefix,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  width?: number
  prefix?: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 24,
      backgroundColor: t.bgInput,
      borderRadius: t.radius,
      padding: '0 6px',
      gap: 4,
      width,
    }}>
      {prefix && (
        <span style={{ fontSize: 10, color: t.textMuted }}>{prefix}</span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: value.startsWith('$') ? t.textToken : t.text,
          fontSize: 11,
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// Color picker state type
interface ColorPickerState {
  isOpen: boolean
  position: { x: number; y: number }
  propertyName: string
  currentValue: string
}

function ColorInput({
  value,
  onChange,
  label,
  tokens,
  onOpenPicker,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  tokens?: Map<string, TokenValue>
  onOpenPicker: (e: React.MouseEvent, currentValue: string) => void
}) {
  // Resolve token color if available
  let displayColor = '#888888'
  if (value.startsWith('#')) {
    // Ensure valid 6-digit hex for color picker
    displayColor = value.length === 7 ? value : value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : '#888888'
  } else if (value.startsWith('$') && tokens) {
    const tokenName = value.slice(1)
    const tokenValue = tokens.get(tokenName)
    if (typeof tokenValue === 'string' && tokenValue.startsWith('#')) {
      displayColor = tokenValue
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <span style={{ fontSize: 10, color: t.textMuted, width: 20 }}>{label}</span>
      {/* Color swatch - opens picker on click */}
      <div
        onClick={(e) => onOpenPicker(e, displayColor)}
        style={{
          width: 20,
          height: 20,
          borderRadius: t.radius,
          backgroundColor: displayColor,
          border: `1px solid ${t.border}`,
          cursor: 'pointer',
          transition: 'transform 0.1s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
      <input
        type="text"
        value={value.startsWith('#') ? value.slice(1) : value}
        onChange={(e) => {
          const val = e.target.value
          if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
            onChange(val ? `#${val}` : '')
          } else if (val.startsWith('$')) {
            onChange(val)
          }
        }}
        placeholder="FFFFFF"
        style={{
          flex: 1,
          height: 24,
          backgroundColor: t.bgInput,
          borderRadius: t.radius,
          border: 'none',
          outline: 'none',
          padding: '0 6px',
          color: value.startsWith('$') ? t.textToken : t.text,
          fontSize: 11,
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// ============================================
// Panel Sections
// ============================================

function LayoutSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const isHor = props.horizontal === 'true' || props.hor === 'true'
  const isGrid = !!props.grid
  const gridCols = props.grid || '2'

  const currentLayout = isGrid ? 'grid' : (isHor ? 'hor' : 'ver')

  return (
    <Section label="Layout">
      <div style={{ display: 'flex', gap: 4 }}>
        <IconButton
          icon={<Icons.Horizontal />}
          active={currentLayout === 'hor'}
          onClick={() => {
            updateProperty('horizontal', 'true')
            updateProperty('vertical', null)
            updateProperty('grid', null)
          }}
          title="Horizontal"
        />
        <IconButton
          icon={<Icons.Vertical />}
          active={currentLayout === 'ver'}
          onClick={() => {
            updateProperty('horizontal', null)
            updateProperty('vertical', null)
            updateProperty('grid', null)
          }}
          title="Vertical"
        />
        <IconButton
          icon={<Icons.Grid />}
          active={currentLayout === 'grid'}
          onClick={() => {
            updateProperty('horizontal', null)
            updateProperty('vertical', null)
            updateProperty('grid', '2')
          }}
          title="Grid"
        />
        {isGrid && (
          <ValueInput
            value={gridCols}
            onChange={(v) => updateProperty('grid', v || null)}
            placeholder="2"
            width={36}
          />
        )}
      </div>
    </Section>
  )
}

function SizeSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const width = props.width || props.w || ''
  const height = props.height || props.h || ''
  const isWMin = props['w-min'] === 'true'
  const isWMax = props['w-max'] === 'true'
  const isHMin = props['h-min'] === 'true'
  const isHMax = props['h-max'] === 'true'

  return (
    <Section label="Size">
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Width */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 10, color: t.textMuted, width: 14 }}>W</span>
          <IconButton
            icon={<Icons.WMin />}
            active={isWMin}
            onClick={() => {
              updateProperty('w-min', isWMin ? null : 'true')
              updateProperty('w-max', null)
              updateProperty('width', null)
            }}
            title="Shrink to content"
          />
          <IconButton
            icon={<Icons.WMax />}
            active={isWMax}
            onClick={() => {
              updateProperty('w-max', isWMax ? null : 'true')
              updateProperty('w-min', null)
              updateProperty('width', null)
            }}
            title="Fill available"
          />
          <ValueInput
            value={width}
            onChange={(v) => {
              updateProperty('width', v || null)
              updateProperty('w-min', null)
              updateProperty('w-max', null)
            }}
            placeholder="auto"
            width={44}
          />
        </div>

        {/* Height */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 10, color: t.textMuted, width: 14 }}>H</span>
          <IconButton
            icon={<Icons.HMin />}
            active={isHMin}
            onClick={() => {
              updateProperty('h-min', isHMin ? null : 'true')
              updateProperty('h-max', null)
              updateProperty('height', null)
            }}
            title="Shrink to content"
          />
          <IconButton
            icon={<Icons.HMax />}
            active={isHMax}
            onClick={() => {
              updateProperty('h-max', isHMax ? null : 'true')
              updateProperty('h-min', null)
              updateProperty('height', null)
            }}
            title="Fill available"
          />
          <ValueInput
            value={height}
            onChange={(v) => {
              updateProperty('height', v || null)
              updateProperty('h-min', null)
              updateProperty('h-max', null)
            }}
            placeholder="auto"
            width={44}
          />
        </div>
      </div>
    </Section>
  )
}

function SpacingSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const padding = props.padding || props.p || ''
  const margin = props.margin || props.m || ''
  const gap = props.gap || props.g || ''

  return (
    <Section label="Spacing">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <ValueInput
            value={padding}
            onChange={(v) => updateProperty('padding', v || null)}
            placeholder="0"
            width={56}
            prefix="P"
          />
          <ValueInput
            value={margin}
            onChange={(v) => updateProperty('margin', v || null)}
            placeholder="0"
            width={56}
            prefix="M"
          />
          <ValueInput
            value={gap}
            onChange={(v) => updateProperty('gap', v || null)}
            placeholder="0"
            width={56}
            prefix="G"
          />
        </div>
      </div>
    </Section>
  )
}

function ColorSection({
  props,
  updateProperty,
  tokens,
  onOpenColorPicker,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
  tokens?: Map<string, TokenValue>
  onOpenColorPicker: (e: React.MouseEvent, propertyName: string, currentValue: string) => void
}) {
  const bgColor = props.background || props.bg || ''
  const textColor = props.color || props.col || props.c || ''

  return (
    <Section label="Color">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ColorInput
          value={textColor}
          onChange={(v) => updateProperty('col', v || null)}
          label="Txt"
          tokens={tokens}
          onOpenPicker={(e, color) => onOpenColorPicker(e, 'col', color)}
        />
        <ColorInput
          value={bgColor}
          onChange={(v) => updateProperty('bg', v || null)}
          label="Bg"
          tokens={tokens}
          onOpenPicker={(e, color) => onOpenColorPicker(e, 'bg', color)}
        />
      </div>
    </Section>
  )
}

function FontSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const fontSize = props.size || ''
  const fontWeight = props.weight || ''
  const fontFamily = props.font || ''

  return (
    <Section label="Font">
      <div style={{ display: 'flex', gap: 6 }}>
        <ValueInput
          value={fontFamily}
          onChange={(v) => updateProperty('font', v || null)}
          placeholder="Inter"
          width={70}
        />
        <ValueInput
          value={fontSize}
          onChange={(v) => updateProperty('size', v || null)}
          placeholder="14"
          width={36}
        />
        <ValueInput
          value={fontWeight}
          onChange={(v) => updateProperty('weight', v || null)}
          placeholder="400"
          width={40}
        />
      </div>
    </Section>
  )
}

function BorderSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const radius = props.radius || props.rad || ''
  const border = props.border || props.bor || ''
  const borderColor = props.borderColor || props.boc || ''

  return (
    <Section label="Border">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <ValueInput
            value={radius}
            onChange={(v) => updateProperty('rad', v || null)}
            placeholder="0"
            width={48}
            prefix="R"
          />
          <ValueInput
            value={border}
            onChange={(v) => updateProperty('bor', v || null)}
            placeholder="0"
            width={48}
            prefix="B"
          />
          <ValueInput
            value={borderColor}
            onChange={(v) => updateProperty('boc', v || null)}
            placeholder="#333"
            width={64}
          />
        </div>
      </div>
    </Section>
  )
}

function VisualSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const opacity = props.opacity || props.o || ''
  const shadow = props.shadow || ''
  const zIndex = props.zIndex || props.z || ''
  const isHidden = props.hidden === 'true'

  return (
    <Section label="Visual">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <ValueInput
            value={opacity}
            onChange={(v) => updateProperty('o', v || null)}
            placeholder="1"
            width={40}
            prefix="O"
          />
          <ValueInput
            value={shadow}
            onChange={(v) => updateProperty('shadow', v || null)}
            placeholder="none"
            width={50}
            prefix="S"
          />
          <ValueInput
            value={zIndex}
            onChange={(v) => updateProperty('z', v || null)}
            placeholder="0"
            width={40}
            prefix="Z"
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton
            icon={<span style={{ fontSize: 9 }}>H</span>}
            active={isHidden}
            onClick={() => updateProperty('hidden', isHidden ? null : 'true')}
            title="Hidden"
          />
        </div>
      </div>
    </Section>
  )
}

function AlignmentSection({
  props,
  updateProperty,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  // Horizontal alignment (cross-axis in column, main-axis in row)
  const isHorL = props['hor-l'] === 'true'
  const isHorCen = props['hor-cen'] === 'true'
  const isHorR = props['hor-r'] === 'true'
  // Vertical alignment
  const isVerT = props['ver-t'] === 'true'
  const isVerCen = props['ver-cen'] === 'true'
  const isVerB = props['ver-b'] === 'true'
  // Distribution
  const isBetween = props.between === 'true'
  const isWrap = props.wrap === 'true'

  const clearHorAlign = () => {
    updateProperty('hor-l', null)
    updateProperty('hor-cen', null)
    updateProperty('hor-r', null)
  }
  const clearVerAlign = () => {
    updateProperty('ver-t', null)
    updateProperty('ver-cen', null)
    updateProperty('ver-b', null)
  }

  return (
    <Section label="Align">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Horizontal alignment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: t.textMuted, width: 16 }}>H</span>
          <IconButton
            icon={<span style={{ fontSize: 9 }}>L</span>}
            active={isHorL}
            onClick={() => { clearHorAlign(); if (!isHorL) updateProperty('hor-l', 'true') }}
            title="Left"
          />
          <IconButton
            icon={<span style={{ fontSize: 9 }}>C</span>}
            active={isHorCen}
            onClick={() => { clearHorAlign(); if (!isHorCen) updateProperty('hor-cen', 'true') }}
            title="Center"
          />
          <IconButton
            icon={<span style={{ fontSize: 9 }}>R</span>}
            active={isHorR}
            onClick={() => { clearHorAlign(); if (!isHorR) updateProperty('hor-r', 'true') }}
            title="Right"
          />
        </div>
        {/* Vertical alignment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: t.textMuted, width: 16 }}>V</span>
          <IconButton
            icon={<span style={{ fontSize: 9 }}>T</span>}
            active={isVerT}
            onClick={() => { clearVerAlign(); if (!isVerT) updateProperty('ver-t', 'true') }}
            title="Top"
          />
          <IconButton
            icon={<span style={{ fontSize: 9 }}>C</span>}
            active={isVerCen}
            onClick={() => { clearVerAlign(); if (!isVerCen) updateProperty('ver-cen', 'true') }}
            title="Center"
          />
          <IconButton
            icon={<span style={{ fontSize: 9 }}>B</span>}
            active={isVerB}
            onClick={() => { clearVerAlign(); if (!isVerB) updateProperty('ver-b', 'true') }}
            title="Bottom"
          />
        </div>
        {/* Distribution */}
        <div style={{ display: 'flex', gap: 4 }}>
          <IconButton
            icon={<span style={{ fontSize: 8 }}>BTW</span>}
            active={isBetween}
            onClick={() => updateProperty('between', isBetween ? null : 'true')}
            title="Space between"
          />
          <IconButton
            icon={<span style={{ fontSize: 8 }}>WRP</span>}
            active={isWrap}
            onClick={() => updateProperty('wrap', isWrap ? null : 'true')}
            title="Wrap"
          />
        </div>
      </div>
    </Section>
  )
}

function HoverSection({
  props,
  updateProperty,
  tokens,
  onOpenColorPicker,
}: {
  props: Record<string, string>
  updateProperty: (name: string, value: string | null) => void
  tokens?: Map<string, TokenValue>
  onOpenColorPicker: (e: React.MouseEvent, propertyName: string, currentValue: string) => void
}) {
  const hoverBg = props['hover-bg'] || ''
  const hoverCol = props['hover-col'] || ''
  const hoverOpacity = props['hover-opacity'] || ''
  const hoverScale = props['hover-scale'] || ''

  return (
    <Section label="Hover">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ColorInput
          value={hoverBg}
          onChange={(v) => updateProperty('hover-bg', v || null)}
          label="Bg"
          tokens={tokens}
          onOpenPicker={(e, color) => onOpenColorPicker(e, 'hover-bg', color)}
        />
        <ColorInput
          value={hoverCol}
          onChange={(v) => updateProperty('hover-col', v || null)}
          label="Txt"
          tokens={tokens}
          onOpenPicker={(e, color) => onOpenColorPicker(e, 'hover-col', color)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <ValueInput
            value={hoverOpacity}
            onChange={(v) => updateProperty('hover-opacity', v || null)}
            placeholder="1"
            width={50}
            prefix="O"
          />
          <ValueInput
            value={hoverScale}
            onChange={(v) => updateProperty('hover-scale', v || null)}
            placeholder="1"
            width={50}
            prefix="S"
          />
        </div>
      </div>
    </Section>
  )
}

// ============================================
// Main Component
// ============================================

interface PropertyPanelProps {
  selectedLine: number | null
  layoutCode: string
  tokens: Map<string, TokenValue>
  onCodeChange: (newCode: string) => void
  onClose?: () => void
  width?: number
}

export const PropertyPanel = memo(function PropertyPanel({
  selectedLine,
  layoutCode,
  tokens: tokenMap,
  onCodeChange,
  onClose,
  width = 220,
}: PropertyPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Color picker state
  const [colorPicker, setColorPicker] = useState<ColorPickerState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    propertyName: '',
    currentValue: '#3B82F6',
  })

  // Close panel when clicking outside
  useEffect(() => {
    if (!onClose) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Use capture phase to catch clicks before they're handled by other elements
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [onClose])

  const lines = useMemo(() => layoutCode.split('\n'), [layoutCode])

  // selectedLine is 0-indexed (from data-source-line attribute)
  const lineIndex = selectedLine
  const lineContent = lineIndex !== null && lineIndex >= 0 && lineIndex < lines.length
    ? lines[lineIndex]
    : null

  const currentProps = useMemo(() => {
    if (!lineContent) return {}
    return parseProperties(lineContent)
  }, [lineContent])

  const componentName = useMemo(() => {
    if (!lineContent) return null
    return getComponentName(lineContent)
  }, [lineContent])

  const updateProperty = useCallback((propName: string, newValue: string | null) => {
    if (lineIndex === null || !lineContent) return

    // Format font values: wrap in quotes if contains space and not already quoted
    let formattedValue = newValue
    if (propName === 'font' && newValue && newValue.includes(' ') && !newValue.startsWith('"')) {
      formattedValue = `"${newValue}"`
    }

    // Preserve leading indentation
    const indentMatch = lineContent.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1] : ''

    let content = lineContent.trimStart()

    // Escape regex special characters in property name
    const escapedPropName = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // V1 inline syntax: Component prop value, prop2 value2
    // Match property with value (space-separated, including quoted strings) or boolean property
    // Pattern: prop "quoted value" OR prop value
    const valuePattern = `"[^"]*"|[^\\s,]+`
    const propWithValueRegex = new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})|\\b${escapedPropName}\\b(?!\\s+\\w)`)

    if (formattedValue === null || formattedValue === '') {
      // Remove property (handles both quoted and unquoted values)
      content = content
        .replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern}),?\\s*`), '')
        .replace(new RegExp(`\\b${escapedPropName}\\b,?\\s*`), '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    } else if (propWithValueRegex.test(content)) {
      // Update existing property
      if (formattedValue === 'true') {
        // Convert to boolean prop (no value)
        content = content.replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})`), propName)
      } else {
        // Update value (v1 uses space, not colon) - handles both quoted and unquoted
        content = content.replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})`), `${propName} ${formattedValue}`)
        content = content.replace(new RegExp(`\\b${escapedPropName}\\b(?!\\s)`), `${propName} ${formattedValue}`)
      }
    } else {
      // Add new prop (v1 uses space-separated: prop value)
      const textMatch = content.match(/"[^"]*"$/)
      if (textMatch && textMatch.index !== undefined) {
        // Insert before trailing text content
        const insertPos = textMatch.index
        const propStr = formattedValue === 'true' ? propName : `${propName} ${formattedValue}`
        content = content.slice(0, insertPos).trimEnd() + `, ${propStr}, ` + textMatch[0]
      } else {
        // Append to end
        const propStr = formattedValue === 'true' ? propName : `${propName} ${formattedValue}`
        content = content.trimEnd() + `, ${propStr}`
      }
    }

    // Clean up any double commas or trailing commas
    content = content.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim()

    const newLine = indent + content
    const newLines = [...lines]
    newLines[lineIndex] = newLine
    onCodeChange(newLines.join('\n'))
  }, [lineIndex, lineContent, lines, onCodeChange])

  // Open color picker
  const handleOpenColorPicker = useCallback((
    e: React.MouseEvent,
    propertyName: string,
    currentValue: string
  ) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setColorPicker({
      isOpen: true,
      position: { x: rect.left - 290, y: rect.top }, // Position to the left of the swatch
      propertyName,
      currentValue,
    })
  }, [])

  // Handle color selection from picker
  const handleColorSelect = useCallback((color: string) => {
    updateProperty(colorPicker.propertyName, color)
    setColorPicker(prev => ({ ...prev, isOpen: false }))
  }, [colorPicker.propertyName, updateProperty])

  // Close color picker
  const handleCloseColorPicker = useCallback(() => {
    setColorPicker(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Empty state
  if (selectedLine === null || !lineContent) {
    return (
      <div style={{
        width,
        height: '100%',
        backgroundColor: t.bg,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{ color: t.textMuted, fontSize: 10, textAlign: 'center' }}>
          Option+Click<br />auf ein Element
        </div>
      </div>
    )
  }

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label="Property panel"
      data-testid="panel-properties"
      style={{
        width,
        height: '100%',
        backgroundColor: t.bg,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: `1px solid ${t.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }} data-testid="panel-properties-title">
          {componentName}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close property panel"
            data-testid="panel-properties-close"
            style={{
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              borderRadius: t.radius,
            }}
          >
            <Icons.Close />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        <LayoutSection props={currentProps} updateProperty={updateProperty} />
        <AlignmentSection props={currentProps} updateProperty={updateProperty} />
        <SizeSection props={currentProps} updateProperty={updateProperty} />
        <SpacingSection props={currentProps} updateProperty={updateProperty} />
        <ColorSection
          props={currentProps}
          updateProperty={updateProperty}
          tokens={tokenMap}
          onOpenColorPicker={handleOpenColorPicker}
        />
        <HoverSection
          props={currentProps}
          updateProperty={updateProperty}
          tokens={tokenMap}
          onOpenColorPicker={handleOpenColorPicker}
        />
        <BorderSection props={currentProps} updateProperty={updateProperty} />
        <FontSection props={currentProps} updateProperty={updateProperty} />
        <VisualSection props={currentProps} updateProperty={updateProperty} />
      </div>

      {/* Color Picker (reusing InlineColorPanel) */}
      <InlineColorPanel
        isOpen={colorPicker.isOpen}
        onClose={handleCloseColorPicker}
        onSelect={handleColorSelect}
        position={colorPicker.position}
        filter=""
        selectedIndex={0}
        onSelectedIndexChange={() => {}}
        initialColor={colorPicker.currentValue}
      />
    </aside>
  )
})
