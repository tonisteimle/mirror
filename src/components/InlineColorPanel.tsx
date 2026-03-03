/**
 * InlineColorPanel - Color picker with token swatches at the top
 *
 * Layout:
 * - Token swatches at the top (always visible if tokens exist)
 * - Color palette below for picking new colors
 *
 * Clicking a token inserts the token reference (e.g., $primary.bg)
 * Clicking a color inserts the hex value
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { ColorSystemPalette } from './ColorSystemPalette'
import { parseColorTokens } from '../utils/token-parser'

interface InlineColorPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (color: string) => void
  onCodeChange?: (color: string) => void
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void
  initialColor?: string
  /** @deprecated Token mode is now always integrated */
  useTokenMode?: boolean
  /** @deprecated Token mode is now always integrated */
  onTokenModeChange?: (mode: boolean) => void
  /** Editor code for extracting tokens */
  editorCode?: string
  /** Property context for filtering tokens (e.g., "bg" shows only $xxx.bg tokens) */
  propertyContext?: string | null
}

export function InlineColorPanel({
  isOpen,
  onClose,
  onSelect,
  position,
  onSelectedValueChange,
  initialColor,
  editorCode = '',
  propertyContext,
}: InlineColorPanelProps) {
  const [pickerColor, setPickerColor] = useState('#3B82F6')
  const [hoveredToken, setHoveredToken] = useState<string | null>(null)

  // Parse color tokens from editor code, filtered by property context
  const colorTokens = useMemo(() => {
    const allTokens = parseColorTokens(editorCode).map(t => ({ name: '$' + t.name, value: t.value }))

    // Known color property suffixes - tokens ending with these are property-bound
    const colorPropertySuffixes = ['.bg', '.col', '.boc']

    // If we have a property context, smart filter:
    // 1. Show tokens with matching suffix (e.g., $primary.bg when editing bg)
    // 2. Show generic tokens without any color property suffix (e.g., $blue-500)
    // 3. Hide tokens with wrong suffix (e.g., hide $primary.col when editing bg)
    if (propertyContext) {
      const matchingSuffix = '.' + propertyContext
      const filtered = allTokens.filter(t => {
        // Check if token ends with matching suffix
        if (t.name.endsWith(matchingSuffix)) {
          return true
        }
        // Check if token has NO color property suffix (generic palette token)
        const hasColorPropertySuffix = colorPropertySuffixes.some(suffix => t.name.endsWith(suffix))
        if (!hasColorPropertySuffix) {
          return true
        }
        // Has a different color property suffix - exclude it
        return false
      })

      // Sort: property-specific tokens first, then generic tokens
      return filtered.sort((a, b) => {
        const aHasMatchingSuffix = a.name.endsWith(matchingSuffix)
        const bHasMatchingSuffix = b.name.endsWith(matchingSuffix)
        if (aHasMatchingSuffix && !bHasMatchingSuffix) return -1
        if (!aHasMatchingSuffix && bHasMatchingSuffix) return 1
        return 0
      })
    }

    return allTokens
  }, [editorCode, propertyContext])

  // Initialize when panel opens
  useEffect(() => {
    if (isOpen) {
      if (initialColor) {
        const normalized = initialColor.startsWith('#') ? initialColor : `#${initialColor}`
        setPickerColor(normalized.toUpperCase())
      } else {
        setPickerColor('#3B82F6')
      }
      setHoveredToken(null)
    }
  }, [isOpen, initialColor])

  // Report changes
  useEffect(() => {
    onSelectedValueChange?.(pickerColor)
  }, [pickerColor, onSelectedValueChange])

  const handleColorSelect = useCallback((color: string) => {
    const upperColor = color.toUpperCase()
    onSelect(upperColor)
    onClose()
  }, [onSelect, onClose])

  const handleTokenSelect = useCallback((tokenName: string) => {
    onSelect(tokenName)
    onClose()
  }, [onSelect, onClose])

  const handleSubmit = useCallback(() => {
    onSelect(pickerColor)
    onClose()
  }, [pickerColor, onSelect, onClose])

  // Global keyboard handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleSubmit, onClose])

  // Token swatches component
  const renderTokenSwatches = () => {
    if (colorTokens.length === 0) return null

    return (
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #222',
      }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 500,
          color: '#666',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Tokens
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
        }}>
          {colorTokens.map((token) => (
            <button
              key={token.name}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleTokenSelect(token.name)
              }}
              onMouseEnter={() => setHoveredToken(token.name)}
              onMouseLeave={() => setHoveredToken(null)}
              title={token.name}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: token.value,
                border: hoveredToken === token.name ? '2px solid #fff' : '1px solid #333',
                cursor: 'pointer',
                padding: 0,
                boxSizing: 'border-box',
                transition: 'border 0.1s',
              }}
            />
          ))}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          marginTop: '6px',
          height: '16px', // Fixed height to prevent jumping
        }}>
          {hoveredToken || '\u00A0'} {/* Non-breaking space as placeholder */}
        </div>
      </div>
    )
  }

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={420}
      maxHeight={450}
      testId="panel-color-picker"
    >
      {/* Token swatches at the top */}
      {renderTokenSwatches()}

      {/* Color palette */}
      <div style={{ padding: '12px', paddingBottom: '8px' }}>
        <ColorSystemPalette
          color={pickerColor}
          onChange={handleColorSelect}
        />
      </div>
      <PanelFooter
        hints={[
          { label: 'Schliessen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />
    </InlinePanel>
  )
}
