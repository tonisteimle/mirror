/**
 * CompositePropertyPanel Component
 *
 * Wide property panel that shows multiple sections side by side.
 * Designed for complex components like Input, Button that need
 * Layout + Typography + Border editing.
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react'
import type { TokenValue } from '../parser/types'
import { InlineColorPanel } from './InlineColorPanel'

// ============================================
// Design Tokens
// ============================================

const t = {
  bg: '#1A1A1A',
  bgSection: '#1E1E1E',
  bgInput: '#252525',
  bgHover: '#2A2A2A',
  bgActive: '#3B82F6',
  text: '#E5E5E5',
  textMuted: '#666',
  textLabel: '#888',
  border: '#2A2A2A',
  borderSection: '#333',
  radius: 3,
}

// ============================================
// Icons
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
}

// ============================================
// Property Parsing
// ============================================

const BOOLEAN_PROPS = new Set([
  'horizontal', 'vertical', 'center', 'wrap', 'stacked', 'between',
  'hor', 'ver', 'cen',
  'w-min', 'w-max', 'h-min', 'h-max',
  'hidden', 'disabled', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
])

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
  { pattern: /\bfont\s+"([^"]+)"/, key: 'font' },
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
]

function parseProperties(line: string): Record<string, string> {
  const props: Record<string, string> = {}
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('//')) return props

  const componentMatch = trimmed.match(/^-?\s*([A-Z][\w]*)\s*(.*)$/)
  if (!componentMatch) return props

  const propsString = componentMatch[2]
  if (!propsString) return props

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
// UI Components
// ============================================

function SectionColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 140,
      padding: 12,
      backgroundColor: t.bgSection,
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: t.textLabel,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11, color: t.textMuted, width: 50, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '4px 6px',
        fontSize: 11,
        backgroundColor: t.bgInput,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        color: t.text,
        outline: 'none',
      }}
    />
  )
}

function ToggleButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '4px 8px',
        fontSize: 11,
        backgroundColor: active ? t.bgActive : t.bgInput,
        border: `1px solid ${active ? t.bgActive : t.border}`,
        borderRadius: t.radius,
        color: active ? '#fff' : t.text,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function ColorSwatch({
  color,
  onClick,
}: {
  color: string
  onClick: (e: React.MouseEvent) => void
}) {
  const isTransparent = !color || color === 'transparent'
  return (
    <button
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        backgroundColor: isTransparent ? '#333' : color,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isTransparent && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(45deg, #666 25%, transparent 25%, transparent 75%, #666 75%)',
          backgroundSize: '6px 6px',
        }} />
      )}
    </button>
  )
}

// ============================================
// Tab Component
// ============================================

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 500,
        backgroundColor: active ? t.bgSection : 'transparent',
        border: 'none',
        borderRadius: t.radius,
        color: active ? t.text : t.textMuted,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ============================================
// Main Component
// ============================================

interface ColorPickerState {
  isOpen: boolean
  position: { x: number; y: number }
  propertyName: string
  currentValue: string
}

interface CompositePropertyPanelProps {
  /** Is the panel open? */
  isOpen: boolean
  /** Position of the panel */
  position: { x: number; y: number }
  /** Current line content */
  lineContent: string
  /** Callback when code changes */
  onCodeChange: (newCode: string) => void
  /** Callback to close the panel */
  onClose: () => void
}

type TabType = 'layout' | 'typography' | 'border'

export const CompositePropertyPanel = memo(function CompositePropertyPanel({
  isOpen,
  position,
  lineContent,
  onCodeChange,
  onClose,
}: CompositePropertyPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('layout')

  // Color picker state
  const [colorPicker, setColorPicker] = useState<ColorPickerState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    propertyName: '',
    currentValue: '#3B82F6',
  })

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [isOpen, onClose])

  const currentProps = useMemo(() => {
    if (!lineContent) return {}
    return parseProperties(lineContent)
  }, [lineContent])

  const componentName = useMemo(() => {
    if (!lineContent) return null
    return getComponentName(lineContent)
  }, [lineContent])

  const updateProperty = useCallback((propName: string, newValue: string | null) => {
    if (!lineContent) return

    // Format font values
    let formattedValue = newValue
    if (propName === 'font' && newValue && newValue.includes(' ') && !newValue.startsWith('"')) {
      formattedValue = `"${newValue}"`
    }

    const indentMatch = lineContent.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1] : ''

    let content = lineContent.trimStart()

    const escapedPropName = propName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const valuePattern = `"[^"]*"|[^\\s,]+`
    const propWithValueRegex = new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})|\\b${escapedPropName}\\b(?!\\s+\\w)`)

    if (formattedValue === null || formattedValue === '') {
      // Remove property
      content = content
        .replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern}),?\\s*`), '')
        .replace(new RegExp(`\\b${escapedPropName}\\b,?\\s*`), '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
    } else if (propWithValueRegex.test(content)) {
      // Update existing property
      if (formattedValue === 'true' && BOOLEAN_PROPS.has(propName)) {
        content = content.replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})`), propName)
      } else {
        content = content.replace(new RegExp(`\\b${escapedPropName}\\s+(?:${valuePattern})`), `${propName} ${formattedValue}`)
        content = content.replace(new RegExp(`\\b${escapedPropName}\\b(?!\\s)`), `${propName} ${formattedValue}`)
      }
    } else {
      // Add new prop
      const textMatch = content.match(/"[^"]*"$/)
      if (textMatch && textMatch.index !== undefined) {
        const insertPos = textMatch.index
        const propStr = formattedValue === 'true' && BOOLEAN_PROPS.has(propName) ? propName : `${propName} ${formattedValue}`
        content = content.slice(0, insertPos).trimEnd() + `, ${propStr}, ` + textMatch[0]
      } else {
        const propStr = formattedValue === 'true' && BOOLEAN_PROPS.has(propName) ? propName : `${propName} ${formattedValue}`
        content = content.trimEnd() + `, ${propStr}`
      }
    }

    content = content.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim()

    onCodeChange(indent + content)
  }, [lineContent, onCodeChange])

  // Color picker handlers
  const handleOpenColorPicker = useCallback((
    e: React.MouseEvent,
    propertyName: string,
    currentValue: string
  ) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setColorPicker({
      isOpen: true,
      position: { x: rect.left, y: rect.bottom + 4 },
      propertyName,
      currentValue,
    })
  }, [])

  const handleColorSelect = useCallback((color: string) => {
    updateProperty(colorPicker.propertyName, color)
    setColorPicker(prev => ({ ...prev, isOpen: false }))
  }, [colorPicker.propertyName, updateProperty])

  const handleCloseColorPicker = useCallback(() => {
    setColorPicker(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: t.bg,
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        border: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 400,
        zIndex: 1000,
      }}
    >
      {/* Header with Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginRight: 8 }}>{componentName}</div>
          <div style={{ display: 'flex', gap: 2, backgroundColor: t.bgInput, borderRadius: t.radius, padding: 2 }}>
            <TabButton active={activeTab === 'layout'} onClick={() => setActiveTab('layout')}>Layout</TabButton>
            <TabButton active={activeTab === 'typography'} onClick={() => setActiveTab('typography')}>Font</TabButton>
            <TabButton active={activeTab === 'border'} onClick={() => setActiveTab('border')}>Border</TabButton>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Icons.Close />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={{ display: 'flex', gap: 12, padding: 8, backgroundColor: t.bgSection, borderRadius: 6 }}>
        {activeTab === 'layout' && (
          <>
            <PropertyRow label="Dir">
              <div style={{ display: 'flex', gap: 4 }}>
                <ToggleButton
                  active={currentProps.horizontal === 'true'}
                  onClick={() => {
                    if (currentProps.horizontal === 'true') {
                      updateProperty('hor', null)
                    } else {
                      updateProperty('ver', null)
                      updateProperty('hor', 'true')
                    }
                  }}
                  title="Horizontal"
                >
                  <Icons.Horizontal />
                </ToggleButton>
                <ToggleButton
                  active={currentProps.vertical === 'true' || !currentProps.horizontal}
                  onClick={() => {
                    if (currentProps.vertical === 'true') {
                      updateProperty('ver', null)
                    } else {
                      updateProperty('hor', null)
                      updateProperty('ver', 'true')
                    }
                  }}
                  title="Vertical"
                >
                  <Icons.Vertical />
                </ToggleButton>
              </div>
            </PropertyRow>
            <PropertyRow label="Pad">
              <NumberInput
                value={currentProps.padding || ''}
                onChange={(v) => updateProperty('pad', v || null)}
                placeholder="16"
              />
            </PropertyRow>
            <PropertyRow label="Gap">
              <NumberInput
                value={currentProps.gap || ''}
                onChange={(v) => updateProperty('gap', v || null)}
                placeholder="8"
              />
            </PropertyRow>
            <PropertyRow label="Rad">
              <NumberInput
                value={currentProps.radius || ''}
                onChange={(v) => updateProperty('rad', v || null)}
                placeholder="8"
              />
            </PropertyRow>
            <PropertyRow label="BG">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ColorSwatch
                  color={currentProps.background || ''}
                  onClick={(e) => handleOpenColorPicker(e, 'bg', currentProps.background || '#333333')}
                />
                <NumberInput
                  value={currentProps.background || ''}
                  onChange={(v) => updateProperty('bg', v || null)}
                  placeholder="#333"
                />
              </div>
            </PropertyRow>
          </>
        )}

        {activeTab === 'typography' && (
          <>
            <PropertyRow label="Size">
              <NumberInput
                value={currentProps.size || ''}
                onChange={(v) => updateProperty('size', v || null)}
                placeholder="14"
              />
            </PropertyRow>
            <PropertyRow label="Weight">
              <NumberInput
                value={currentProps.weight || ''}
                onChange={(v) => updateProperty('weight', v || null)}
                placeholder="400"
              />
            </PropertyRow>
            <PropertyRow label="Line">
              <NumberInput
                value={currentProps.lineHeight || ''}
                onChange={(v) => updateProperty('line', v || null)}
                placeholder="1.5"
              />
            </PropertyRow>
            <PropertyRow label="Font">
              <NumberInput
                value={currentProps.font || ''}
                onChange={(v) => updateProperty('font', v || null)}
                placeholder="Inter"
              />
            </PropertyRow>
            <PropertyRow label="Color">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ColorSwatch
                  color={currentProps.color || ''}
                  onClick={(e) => handleOpenColorPicker(e, 'col', currentProps.color || '#FFFFFF')}
                />
                <NumberInput
                  value={currentProps.color || ''}
                  onChange={(v) => updateProperty('col', v || null)}
                  placeholder="#FFF"
                />
              </div>
            </PropertyRow>
          </>
        )}

        {activeTab === 'border' && (
          <>
            <PropertyRow label="Width">
              <NumberInput
                value={currentProps.border?.split(' ')[0] || ''}
                onChange={(v) => {
                  if (!v) {
                    updateProperty('bor', null)
                  } else {
                    const parts = (currentProps.border || '1').split(' ')
                    parts[0] = v
                    updateProperty('bor', parts.join(' '))
                  }
                }}
                placeholder="1"
              />
            </PropertyRow>
            <PropertyRow label="Radius">
              <NumberInput
                value={currentProps.radius || ''}
                onChange={(v) => updateProperty('rad', v || null)}
                placeholder="8"
              />
            </PropertyRow>
            <PropertyRow label="Color">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ColorSwatch
                  color={currentProps.borderColor || ''}
                  onClick={(e) => handleOpenColorPicker(e, 'boc', currentProps.borderColor || '#666666')}
                />
                <NumberInput
                  value={currentProps.borderColor || ''}
                  onChange={(v) => updateProperty('boc', v || null)}
                  placeholder="#666"
                />
              </div>
            </PropertyRow>
          </>
        )}
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
    </div>
  )
})
