/**
 * PropertyPanel Component
 *
 * Figma-style property editor for selected elements.
 * Built according to PROPERTY-PANEL-SPEC.md
 */

import { useState, useMemo, useCallback } from 'react'
import type { TokenValue } from '../parser/types'

// ============================================
// Design Tokens (from Figma spec)
// ============================================

const tokens = {
  // Colors
  bgPanel: '#1E1E1E',
  bgInput: '#2C2C2C',
  bgSegment: '#2C2C2C',
  bgActive: '#3B82F6',
  bgButtonActive: '#4A4A4A',
  bgHover: '#383838',

  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textValue: '#CCCCCC',
  textToken: '#F59E0B',

  border: '#3A3A3A',
  accent: '#3B82F6',

  // Spacing
  panelPad: 16,
  sectionGap: 16,
  rowGap: 12,
  inputGap: 8,
  innerGap: 4,

  // Sizing
  inputHeight: 32,
  buttonSize: 32,
  iconSize: 16,
  swatchSize: 24,
  gridSize: 54,
  dotSize: 6,

  radiusSm: 4,
  radiusMd: 6,
  radiusLg: 8,
}

interface PropertyPanelProps {
  selectedLine: number | null
  layoutCode: string
  tokens: Map<string, TokenValue>
  onCodeChange: (newCode: string) => void
  width?: number
}

// ============================================
// Utility Functions
// ============================================

function parseLineProperties(line: string): Map<string, string> {
  const props = new Map<string, string>()
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//')) return props

  // Match value properties
  const valuePattern = /\b(bg|col|boc|pad|mar|gap|w|h|minw|maxw|minh|maxh|rad|bor|size|weight|line|font|align|opacity|shadow|cursor|z|grid|shrink)\s+([^\s"]+)/g
  let match
  while ((match = valuePattern.exec(trimmed)) !== null) {
    props.set(match[1], match[2])
  }

  // Match boolean properties
  const boolPattern = /\b(hor|ver|cen|hor-l|hor-cen|hor-r|ver-t|ver-cen|ver-b|between|wrap|stacked|full|grow|fill|italic|underline|uppercase|lowercase|truncate|hidden|disabled|scroll|scroll-hor|scroll-both|clip)\b/g
  while ((match = boolPattern.exec(trimmed)) !== null) {
    props.set(match[1], 'true')
  }

  return props
}

function getComponentName(line: string): string {
  const trimmed = line.trim()
  const match = trimmed.match(/^-?\s*([A-Z][\w]*)/)
  return match ? match[1] : 'Element'
}

function getColorTokens(tokenMap: Map<string, TokenValue>): Array<{ name: string; value: string }> {
  const result: Array<{ name: string; value: string }> = []
  tokenMap.forEach((value, name) => {
    const strValue = String(value)
    if (strValue.startsWith('#') || name.includes('col') || name.includes('bg') || name.includes('color')) {
      result.push({ name, value: strValue })
    }
  })
  return result
}

// ============================================
// Base Components
// ============================================

/**
 * IconInput - Input with optional icon/label prefix
 * Spec: Height 32px, bg #2C2C2C, radius 6px
 */
function IconInput({
  icon,
  label,
  value,
  onChange,
  suffix,
  placeholder = '',
  width,
}: {
  icon?: React.ReactNode
  label?: string
  value: string
  onChange: (value: string) => void
  suffix?: string
  placeholder?: string
  width?: number | string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: tokens.inputHeight,
        backgroundColor: tokens.bgInput,
        borderRadius: tokens.radiusMd,
        padding: '0 10px',
        gap: 6,
        width: width ?? 'auto',
        flex: width ? 'none' : 1,
      }}
    >
      {icon && (
        <span style={{ color: tokens.textSecondary, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      {label && (
        <span style={{ color: tokens.textSecondary, fontSize: 11, flexShrink: 0 }}>
          {label}
        </span>
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
          color: tokens.textPrimary,
          fontSize: 12,
          fontFamily: 'inherit',
        }}
      />
      {suffix && (
        <span style={{ color: tokens.textSecondary, fontSize: 11, flexShrink: 0 }}>
          {suffix}
        </span>
      )}
    </div>
  )
}

/**
 * SegmentedControl - Button group in container
 * Spec: Container bg #2C2C2C, radius 8px, padding 3px
 */
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ icon: React.ReactNode; value: string; title: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: tokens.bgSegment,
        borderRadius: tokens.radiusLg,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          style={{
            width: 32,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: value === opt.value ? tokens.bgButtonActive : 'transparent',
            color: value === opt.value ? tokens.textPrimary : tokens.textSecondary,
            border: 'none',
            borderRadius: tokens.radiusSm,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

/**
 * AlignmentGrid - 3x3 dot grid for alignment
 * Spec: 54x54px, bg #2C2C2C, radius 6px, 6px dots
 */
function AlignmentGrid({
  value,
  onChange,
}: {
  value: { h: number; v: number } | null  // h: 0-2 (l/cen/r), v: 0-2 (t/cen/b)
  onChange: (h: number, v: number) => void
}) {
  const isActive = (h: number, v: number) => value?.h === h && value?.v === v

  return (
    <div
      style={{
        width: tokens.gridSize,
        height: tokens.gridSize,
        backgroundColor: tokens.bgInput,
        borderRadius: tokens.radiusMd,
        padding: 9,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}
    >
      {[0, 1, 2].map((v) =>
        [0, 1, 2].map((h) => {
          const active = isActive(h, v)
          return (
            <button
              key={`${h}-${v}`}
              onClick={() => onChange(h, v)}
              style={{
                width: active ? 8 : tokens.dotSize,
                height: active ? 8 : tokens.dotSize,
                margin: active ? -1 : 0,
                backgroundColor: active ? tokens.textPrimary : '#555',
                borderRadius: 1,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          )
        })
      )}
    </div>
  )
}

/**
 * ColorSwatch - Color input row
 * Spec: Swatch 24x24, Hex input WITHOUT #, Opacity separate
 */
function ColorSwatch({
  color,
  opacity = 100,
  onChange,
  onOpacityChange,
  colorTokens,
}: {
  color: string
  opacity?: number
  onChange: (color: string) => void
  onOpacityChange?: (opacity: number) => void
  colorTokens: Array<{ name: string; value: string }>
}) {
  const [showPicker, setShowPicker] = useState(false)
  const isToken = color.startsWith('$')

  // Get display color for swatch
  let displayColor = color || 'transparent'
  if (isToken) {
    const tokenName = color.slice(1)
    const token = colorTokens.find((t) => t.name === tokenName)
    if (token) displayColor = token.value
  }

  // Parse hex without # for display
  const hexValue = color.startsWith('#') ? color.slice(1).toUpperCase() : (isToken ? color : color.toUpperCase())

  return (
    <div style={{ display: 'flex', gap: tokens.inputGap, alignItems: 'center', position: 'relative' }}>
      {/* Color Swatch */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          width: tokens.swatchSize,
          height: tokens.swatchSize,
          borderRadius: tokens.radiusSm,
          backgroundColor: displayColor.startsWith('#') ? displayColor : tokens.bgInput,
          border: `1px solid ${tokens.border}`,
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
        }}
      />

      {/* Hex Input (without #) */}
      <div
        style={{
          flex: 1,
          height: tokens.inputHeight,
          backgroundColor: tokens.bgInput,
          borderRadius: tokens.radiusMd,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={hexValue}
          onChange={(e) => {
            const val = e.target.value
            // Add # back if it's a hex value
            if (/^[0-9A-Fa-f]{0,8}$/.test(val)) {
              onChange(val ? `#${val}` : '')
            } else if (val.startsWith('$')) {
              onChange(val)
            }
          }}
          placeholder="FFFFFF"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: isToken ? tokens.textToken : tokens.textPrimary,
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Opacity (separate input + %) */}
      {onOpacityChange && (
        <>
          <div
            style={{
              width: 48,
              height: tokens.inputHeight,
              backgroundColor: tokens.bgInput,
              borderRadius: tokens.radiusMd,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              value={String(opacity)}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0
                onOpacityChange(Math.min(100, Math.max(0, val)))
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: tokens.textPrimary,
                fontSize: 12,
                fontFamily: 'inherit',
                textAlign: 'right',
              }}
            />
          </div>
          <span style={{ color: tokens.textSecondary, fontSize: 11 }}>%</span>
        </>
      )}

      {/* Token Picker Dropdown */}
      {showPicker && colorTokens.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: tokens.swatchSize + tokens.inputGap,
            marginTop: 4,
            backgroundColor: tokens.bgPanel,
            border: `1px solid ${tokens.border}`,
            borderRadius: tokens.radiusMd,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100,
            maxHeight: 160,
            overflow: 'auto',
            minWidth: 140,
          }}
        >
          <button
            onClick={() => { onChange(''); setShowPicker(false) }}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 11,
              color: tokens.textSecondary,
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Entfernen
          </button>
          {colorTokens.map((token) => (
            <button
              key={token.name}
              onClick={() => { onChange(`$${token.name}`); setShowPicker(false) }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                backgroundColor: color === `$${token.name}` ? tokens.bgHover : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  backgroundColor: token.value,
                  border: `1px solid ${tokens.border}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: tokens.textToken }}>${token.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * StandaloneIconButton - Icon button without container
 * Spec: 32x32 click area, 16px icon, transparent bg
 */
function StandaloneIconButton({
  icon,
  onClick,
  title,
  active = false,
}: {
  icon: React.ReactNode
  onClick: () => void
  title: string
  active?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: tokens.buttonSize,
        height: tokens.buttonSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        color: active || hovered ? tokens.textPrimary : tokens.textSecondary,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {icon}
    </button>
  )
}

/**
 * SectionHeader - Section title
 * Spec: 14px semibold, normal case (NOT uppercase)
 */
function SectionHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.rowGap,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: tokens.textPrimary,
        }}
      >
        {title}
      </span>
      {actions && (
        <div style={{ display: 'flex', gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * PropertyLabel - Small label above controls
 * Spec: 11px gray, normal case
 */
function PropertyLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: tokens.textSecondary,
        marginBottom: 6,
        display: 'block',
      }}
    >
      {children}
    </span>
  )
}

/**
 * Section - Container with divider
 */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: tokens.panelPad,
        borderBottom: `1px solid ${tokens.border}`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Checkbox - Rounded checkbox
 * Spec: 18x18, radius 4px
 */
function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: tokens.radiusSm,
          backgroundColor: checked ? tokens.accent : tokens.bgInput,
          border: checked ? 'none' : `1px solid ${tokens.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 12, color: tokens.textPrimary }}>{label}</span>
    </label>
  )
}

// ============================================
// Icons (16px)
// ============================================

const Icons = {
  ArrowDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Grid: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  Wrap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  GapHorizontal: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="3" y2="18" />
      <line x1="21" y1="6" x2="21" y2="18" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  GapVertical: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="18" y2="3" />
      <line x1="6" y1="21" x2="18" y2="21" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </svg>
  ),
  Radius: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 0 1 9-9" />
    </svg>
  ),
  Link: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
}

// ============================================
// Panel Sections
// ============================================

function LayoutSection({
  props,
  updateProperty,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const isHor = props.get('hor') === 'true'
  const gap = props.get('gap') || ''

  // Calculate alignment from props
  const horGroup = ['hor-l', 'hor-cen', 'hor-r']
  const verGroup = ['ver-t', 'ver-cen', 'ver-b']
  const currentHorIdx = horGroup.findIndex((p) => props.get(p) === 'true')
  const currentVerIdx = verGroup.findIndex((p) => props.get(p) === 'true')
  const isCentered = props.get('cen') === 'true'

  const alignValue = isCentered
    ? { h: 1, v: 1 }
    : currentHorIdx >= 0 || currentVerIdx >= 0
      ? { h: currentHorIdx >= 0 ? currentHorIdx : 1, v: currentVerIdx >= 0 ? currentVerIdx : 1 }
      : null

  const handleAlignChange = (h: number, v: number) => {
    // Clear cen first
    if (props.get('cen') === 'true') {
      updateProperty('cen', null)
    }

    // Clear existing alignment
    horGroup.forEach((p) => updateProperty(p, null))
    verGroup.forEach((p) => updateProperty(p, null))

    // Set new alignment (center is h:1, v:1)
    if (h === 1 && v === 1) {
      updateProperty('cen', 'true')
    } else {
      updateProperty(horGroup[h], 'true')
      updateProperty(verGroup[v], 'true')
    }
  }

  const direction = isHor ? 'hor' : 'ver'

  return (
    <Section>
      <SectionHeader title="Auto layout" />

      {/* Flow (Direction) */}
      <PropertyLabel>Flow</PropertyLabel>
      <div style={{ display: 'flex', gap: tokens.inputGap, marginBottom: tokens.rowGap }}>
        <SegmentedControl
          options={[
            { icon: <Icons.Wrap />, value: 'wrap', title: 'Wrap' },
            { icon: <Icons.ArrowDown />, value: 'ver', title: 'Vertical' },
            { icon: <Icons.ArrowRight />, value: 'hor', title: 'Horizontal' },
            { icon: <Icons.Grid />, value: 'grid', title: 'Grid' },
          ]}
          value={props.get('wrap') === 'true' ? 'wrap' : (props.get('grid') ? 'grid' : direction)}
          onChange={(val) => {
            // Clear all layout props
            updateProperty('hor', null)
            updateProperty('ver', null)
            updateProperty('wrap', null)
            updateProperty('grid', null)

            if (val === 'hor') updateProperty('hor', 'true')
            else if (val === 'wrap') updateProperty('wrap', 'true')
            else if (val === 'grid') updateProperty('grid', '2') // Default 2 columns
            // ver is default, no prop needed
          }}
        />
      </div>

      {/* Alignment + Gap side by side */}
      <div style={{ display: 'flex', gap: tokens.inputGap * 2 }}>
        <div>
          <PropertyLabel>Alignment</PropertyLabel>
          <AlignmentGrid value={alignValue} onChange={handleAlignChange} />
        </div>

        <div style={{ flex: 1 }}>
          <PropertyLabel>Gap</PropertyLabel>
          <IconInput
            icon={<Icons.GapHorizontal />}
            value={gap}
            onChange={(v) => updateProperty('gap', v || null)}
            placeholder="0"
          />

          {/* Additional layout options */}
          <div style={{ display: 'flex', gap: tokens.innerGap, marginTop: tokens.inputGap }}>
            <StandaloneIconButton
              icon={<Icons.GapVertical />}
              onClick={() => updateProperty('between', props.get('between') === 'true' ? null : 'true')}
              title="Space Between"
              active={props.get('between') === 'true'}
            />
            <StandaloneIconButton
              icon={<Icons.Link />}
              onClick={() => updateProperty('stacked', props.get('stacked') === 'true' ? null : 'true')}
              title="Stacked"
              active={props.get('stacked') === 'true'}
            />
          </div>
        </div>
      </div>
    </Section>
  )
}

function SizeSection({
  props,
  updateProperty,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const w = props.get('w') || ''
  const h = props.get('h') || ''

  return (
    <Section>
      <SectionHeader title="Size" />

      <div style={{ display: 'flex', gap: tokens.inputGap }}>
        <IconInput
          label="W"
          value={w}
          onChange={(v) => updateProperty('w', v || null)}
          placeholder="auto"
        />
        <IconInput
          label="H"
          value={h}
          onChange={(v) => updateProperty('h', v || null)}
          placeholder="auto"
        />
        <StandaloneIconButton
          icon={<Icons.Link />}
          onClick={() => {
            // Toggle full
            if (props.get('full') === 'true') {
              updateProperty('full', null)
            } else {
              updateProperty('full', 'true')
              updateProperty('grow', null)
              updateProperty('fill', null)
            }
          }}
          title="Full"
          active={props.get('full') === 'true'}
        />
      </div>

      {/* Quick options */}
      <div style={{ display: 'flex', gap: tokens.innerGap, marginTop: tokens.inputGap }}>
        <Checkbox
          checked={props.get('grow') === 'true'}
          onChange={(checked) => updateProperty('grow', checked ? 'true' : null)}
          label="Grow"
        />
        <Checkbox
          checked={props.get('fill') === 'true'}
          onChange={(checked) => updateProperty('fill', checked ? 'true' : null)}
          label="Fill"
        />
      </div>
    </Section>
  )
}

function SpacingSection({
  props,
  updateProperty,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const pad = props.get('pad') || ''
  const mar = props.get('mar') || ''

  return (
    <Section>
      <SectionHeader title="Spacing" />

      <PropertyLabel>Padding</PropertyLabel>
      <div style={{ display: 'flex', gap: tokens.inputGap, marginBottom: tokens.rowGap }}>
        <IconInput
          icon={<Icons.GapHorizontal />}
          value={pad}
          onChange={(v) => updateProperty('pad', v || null)}
          placeholder="0"
        />
        <StandaloneIconButton
          icon={<Icons.Link />}
          onClick={() => {}}
          title="Link padding"
          active={false}
        />
      </div>

      <PropertyLabel>Margin</PropertyLabel>
      <div style={{ display: 'flex', gap: tokens.inputGap }}>
        <IconInput
          icon={<Icons.GapHorizontal />}
          value={mar}
          onChange={(v) => updateProperty('mar', v || null)}
          placeholder="0"
        />
        <StandaloneIconButton
          icon={<Icons.Link />}
          onClick={() => {}}
          title="Link margin"
          active={false}
        />
      </div>
    </Section>
  )
}

function FillSection({
  props,
  updateProperty,
  colorTokens,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
  colorTokens: Array<{ name: string; value: string }>
}) {
  const bg = props.get('bg') || ''

  return (
    <Section>
      <SectionHeader title="Fill" />

      <ColorSwatch
        color={bg}
        onChange={(v) => updateProperty('bg', v || null)}
        colorTokens={colorTokens}
      />
    </Section>
  )
}

function BorderSection({
  props,
  updateProperty,
  colorTokens,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
  colorTokens: Array<{ name: string; value: string }>
}) {
  const rad = props.get('rad') || ''
  const bor = props.get('bor') || ''
  const boc = props.get('boc') || ''

  return (
    <Section>
      <SectionHeader title="Border" />

      <div style={{ display: 'flex', gap: tokens.inputGap, marginBottom: tokens.rowGap }}>
        <IconInput
          icon={<Icons.Radius />}
          value={rad}
          onChange={(v) => updateProperty('rad', v || null)}
          placeholder="0"
        />
        <IconInput
          label="bor"
          value={bor}
          onChange={(v) => updateProperty('bor', v || null)}
          placeholder="0"
        />
        <StandaloneIconButton
          icon={<Icons.Link />}
          onClick={() => {}}
          title="Link corners"
          active={false}
        />
      </div>

      {/* Border color */}
      <PropertyLabel>Border color</PropertyLabel>
      <ColorSwatch
        color={boc}
        onChange={(v) => updateProperty('boc', v || null)}
        colorTokens={colorTokens}
      />
    </Section>
  )
}

function TypographySection({
  props,
  updateProperty,
  colorTokens,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
  colorTokens: Array<{ name: string; value: string }>
}) {
  const col = props.get('col') || ''
  const size = props.get('size') || ''
  const weight = props.get('weight') || ''

  return (
    <Section>
      <SectionHeader title="Typography" />

      {/* Text color */}
      <ColorSwatch
        color={col}
        onChange={(v) => updateProperty('col', v || null)}
        colorTokens={colorTokens}
      />

      {/* Size and weight */}
      <div style={{ display: 'flex', gap: tokens.inputGap, marginTop: tokens.rowGap }}>
        <IconInput
          label="size"
          value={size}
          onChange={(v) => updateProperty('size', v || null)}
          placeholder="14"
        />
        <div
          style={{
            flex: 1,
            height: tokens.inputHeight,
            backgroundColor: tokens.bgInput,
            borderRadius: tokens.radiusMd,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: tokens.textSecondary, fontSize: 11 }}>wt</span>
          <select
            value={weight}
            onChange={(e) => updateProperty('weight', e.target.value || null)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.textPrimary,
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">-</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="600">600</option>
            <option value="700">700</option>
          </select>
        </div>
      </div>

      {/* Style buttons */}
      <div style={{ display: 'flex', gap: 2, marginTop: tokens.inputGap }}>
        <StyleButton
          active={props.get('italic') === 'true'}
          onClick={() => updateProperty('italic', props.get('italic') === 'true' ? null : 'true')}
          title="Italic"
        >
          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>I</span>
        </StyleButton>
        <StyleButton
          active={props.get('underline') === 'true'}
          onClick={() => updateProperty('underline', props.get('underline') === 'true' ? null : 'true')}
          title="Underline"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </StyleButton>
        <StyleButton
          active={props.get('uppercase') === 'true'}
          onClick={() => updateProperty('uppercase', props.get('uppercase') === 'true' ? null : 'true')}
          title="Uppercase"
        >
          <span style={{ fontSize: 9 }}>AA</span>
        </StyleButton>
        <StyleButton
          active={props.get('truncate') === 'true'}
          onClick={() => updateProperty('truncate', props.get('truncate') === 'true' ? null : 'true')}
          title="Truncate"
        >
          <span style={{ fontSize: 9 }}>...</span>
        </StyleButton>
      </div>
    </Section>
  )
}

function StyleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? tokens.bgButtonActive : tokens.bgInput,
        color: active ? tokens.textPrimary : tokens.textSecondary,
        border: active ? `1px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
        borderRadius: tokens.radiusSm,
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {children}
    </button>
  )
}

function EffectsSection({
  props,
  updateProperty,
}: {
  props: Map<string, string>
  updateProperty: (name: string, value: string | null) => void
}) {
  const opacity = props.get('opacity') || ''
  const shadow = props.get('shadow') || ''

  return (
    <Section>
      <SectionHeader title="Effects" />

      <div style={{ display: 'flex', gap: tokens.inputGap, marginBottom: tokens.rowGap }}>
        <IconInput
          label="opa"
          value={opacity}
          onChange={(v) => updateProperty('opacity', v || null)}
          placeholder="1"
        />
        <div
          style={{
            flex: 1,
            height: tokens.inputHeight,
            backgroundColor: tokens.bgInput,
            borderRadius: tokens.radiusMd,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: tokens.textSecondary, fontSize: 11 }}>shadow</span>
          <select
            value={shadow}
            onChange={(e) => updateProperty('shadow', e.target.value || null)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tokens.textPrimary,
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">-</option>
            <option value="sm">sm</option>
            <option value="md">md</option>
            <option value="lg">lg</option>
          </select>
        </div>
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Checkbox
          checked={props.get('hidden') === 'true'}
          onChange={(checked) => updateProperty('hidden', checked ? 'true' : null)}
          label="hidden"
        />
        <Checkbox
          checked={props.get('clip') === 'true'}
          onChange={(checked) => updateProperty('clip', checked ? 'true' : null)}
          label="clip"
        />
        <Checkbox
          checked={props.get('scroll') === 'true'}
          onChange={(checked) => updateProperty('scroll', checked ? 'true' : null)}
          label="scroll"
        />
      </div>
    </Section>
  )
}

// ============================================
// Main Component
// ============================================

export function PropertyPanel({
  selectedLine,
  layoutCode,
  tokens: tokenMap,
  onCodeChange,
  width = 280,
}: PropertyPanelProps) {
  const lines = useMemo(() => layoutCode.split('\n'), [layoutCode])

  // selectedLine is 1-indexed (from parser), convert to 0-indexed for array access
  const lineIndex = selectedLine !== null ? selectedLine - 1 : null
  const selectedLineContent = lineIndex !== null && lineIndex >= 0 && lineIndex < lines.length
    ? lines[lineIndex]
    : null

  const currentProps = useMemo(() => {
    if (!selectedLineContent) return new Map<string, string>()
    return parseLineProperties(selectedLineContent)
  }, [selectedLineContent])

  const componentName = useMemo(() => {
    if (!selectedLineContent) return null
    return getComponentName(selectedLineContent)
  }, [selectedLineContent])

  const colorTokens = useMemo(() => getColorTokens(tokenMap), [tokenMap])

  const updateProperty = useCallback((propName: string, newValue: string | null) => {
    if (lineIndex === null || !selectedLineContent) return

    // Preserve leading indentation
    const indentMatch = selectedLineContent.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1] : ''

    let content = selectedLineContent.trimStart()
    const valueRegex = new RegExp(`\\b${propName}\\s+[^\\s"]+`)
    const boolRegex = new RegExp(`\\b${propName}\\b`)

    if (newValue === null || newValue === '' || newValue === 'false') {
      content = content.replace(valueRegex, '').replace(boolRegex, '')
      // Clean up multiple spaces but keep content intact
      content = content.replace(/\s+/g, ' ').trim()
    } else if (newValue === 'true') {
      if (!boolRegex.test(content)) {
        const textMatch = content.match(/"[^"]*"$/)
        if (textMatch) {
          content = content.slice(0, textMatch.index).trimEnd() + ` ${propName} ` + textMatch[0]
        } else {
          content = content.trimEnd() + ` ${propName}`
        }
      }
    } else {
      if (valueRegex.test(content)) {
        content = content.replace(valueRegex, `${propName} ${newValue}`)
      } else {
        const textMatch = content.match(/"[^"]*"$/)
        if (textMatch) {
          content = content.slice(0, textMatch.index).trimEnd() + ` ${propName} ${newValue} ` + textMatch[0]
        } else {
          content = content.trimEnd() + ` ${propName} ${newValue}`
        }
      }
    }

    // Re-add indentation
    const newLine = indent + content
    const newLines = [...lines]
    newLines[lineIndex] = newLine
    onCodeChange(newLines.join('\n'))
  }, [lineIndex, selectedLineContent, lines, onCodeChange])

  // Empty state
  if (selectedLine === null || !selectedLineContent) {
    return (
      <div
        style={{
          width,
          height: '100%',
          backgroundColor: tokens.bgPanel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ color: tokens.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
          Klicke auf ein Element<br />um Properties zu bearbeiten
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width,
        height: '100%',
        backgroundColor: tokens.bgPanel,
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: tokens.panelPad,
          borderBottom: `1px solid ${tokens.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: tokens.radiusMd,
            backgroundColor: tokens.accent + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.accent} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: tokens.textPrimary }}>
            {componentName}
          </div>
          <div style={{ fontSize: 11, color: tokens.textSecondary }}>
            Zeile {selectedLine}
          </div>
        </div>
      </div>

      {/* Sections */}
      <LayoutSection props={currentProps} updateProperty={updateProperty} />
      <SizeSection props={currentProps} updateProperty={updateProperty} />
      <SpacingSection props={currentProps} updateProperty={updateProperty} />
      <FillSection props={currentProps} updateProperty={updateProperty} colorTokens={colorTokens} />
      <BorderSection props={currentProps} updateProperty={updateProperty} colorTokens={colorTokens} />
      <TypographySection props={currentProps} updateProperty={updateProperty} colorTokens={colorTokens} />
      <EffectsSection props={currentProps} updateProperty={updateProperty} />
    </div>
  )
}
