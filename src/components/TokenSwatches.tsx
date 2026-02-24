/**
 * TokenSwatches Component
 *
 * Displays defined color tokens as clickable swatches.
 * Used in picker panels to allow quick token selection.
 *
 * Features:
 * - Extracts color tokens from editor code
 * - Shows tokens as colored squares
 * - Hover tooltip shows token name + value
 * - Click inserts the token reference ($name)
 */

import React, { useMemo, useState, useRef } from 'react'
import { parseActiveThemeColorTokens, parseBoundTokens, getTokensForProperty } from '../utils/token-parser'
import type { ParsedToken, BoundToken, TokenPropertyBinding } from '../utils/token-parser'

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const color = hex.replace(/^#/, '')

  let r: number, g: number, b: number
  if (color.length === 3) {
    r = parseInt(color[0] + color[0], 16)
    g = parseInt(color[1] + color[1], 16)
    b = parseInt(color[2] + color[2], 16)
  } else if (color.length >= 6) {
    r = parseInt(color.slice(0, 2), 16)
    g = parseInt(color.slice(2, 4), 16)
    b = parseInt(color.slice(4, 6), 16)
  } else {
    return null
  }

  return { r, g, b }
}

/**
 * Calculate relative luminance/brightness of a hex color (0 = black, 1 = white)
 */
function getColorBrightness(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0.5
  // Calculate relative luminance (ITU-R BT.709)
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
}

/**
 * Check if a color is a gray tone (R ≈ G ≈ B within threshold)
 */
function isGrayTone(hex: string, threshold = 15): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false

  const { r, g, b } = rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  // Gray if the difference between max and min RGB is small
  return (max - min) <= threshold
}

interface TokenSwatchesProps {
  /** Editor code to extract tokens from */
  code: string
  /** Called when a token is selected */
  onSelect: (tokenName: string, colorValue: string) => void
  /** Currently selected value (token name or hex) for highlighting */
  selectedValue?: string
  /** Property context for filtering (e.g., 'bg', 'col', 'boc') */
  propertyContext?: TokenPropertyBinding
  /** Component context for prioritization (e.g., 'Button', 'Icon') */
  componentContext?: string
}

/**
 * Displays color tokens as clickable swatches with hover tooltips.
 * Tokens are sorted by brightness (dark to light).
 *
 * When propertyContext is provided, uses the bound token system to filter
 * tokens that are specifically defined for that property (e.g., $default.bg).
 */
export function TokenSwatches({ code, onSelect, selectedValue, propertyContext, componentContext }: TokenSwatchesProps) {
  const [hoveredToken, setHoveredToken] = useState<ParsedToken | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract color tokens from active theme
  // If propertyContext is provided, use bound token filtering
  // Separate grays (sorted by brightness) from colors (original order)
  const colorTokens = useMemo(() => {
    console.log('[TokenSwatches] code length:', code?.length ?? 0)
    console.log('[TokenSwatches] propertyContext:', propertyContext)

    let tokens: ParsedToken[]

    if (propertyContext) {
      // Use bound token system for property-specific filtering
      const boundTokens = parseBoundTokens(code)
      const filtered = getTokensForProperty(propertyContext, componentContext, boundTokens)
      // Convert BoundToken to ParsedToken format
      tokens = filtered.map(t => ({
        name: t.name,
        value: t.value,
        type: t.type,
      }))
      console.log('[TokenSwatches] bound tokens for', propertyContext, ':', tokens.length)
    } else {
      // Fallback to legacy color token parsing
      tokens = parseActiveThemeColorTokens(code)
      console.log('[TokenSwatches] legacy tokens:', tokens.length)
    }

    // Separate gray tones from chromatic colors
    const grays = tokens.filter(t => isGrayTone(t.value))
    const colors = tokens.filter(t => !isGrayTone(t.value))

    // Sort grays by brightness (dark to light)
    grays.sort((a, b) => getColorBrightness(a.value) - getColorBrightness(b.value))

    // Return grays first, then colors in original order
    return [...grays, ...colors]
  }, [code, propertyContext, componentContext])

  // Don't render if no tokens
  if (colorTokens.length === 0) {
    return null
  }

  const handleMouseEnter = (token: ParsedToken, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
    setHoveredToken(token)
  }

  const handleMouseLeave = () => {
    setHoveredToken(null)
  }

  const isSelected = (token: ParsedToken) => {
    if (!selectedValue) return false
    return selectedValue === token.name || selectedValue === `$${token.name.replace(/^\$/, '')}`
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Token Swatches Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
        }}
      >
        {colorTokens.map((token) => (
          <button
            key={token.name}
            onClick={() => onSelect(`$${token.name}`, token.value)}
            onMouseEnter={(e) => handleMouseEnter(token, e)}
            onMouseLeave={handleMouseLeave}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: isSelected(token)
                ? '2px solid #3B82F6'
                : '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: token.value,
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              transition: 'transform 0.1s, border-color 0.1s',
              transform: hoveredToken?.name === token.name ? 'scale(1.1)' : 'scale(1)',
            }}
            title={`$${token.name}: ${token.value}`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {hoveredToken && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1E1E2E',
            color: '#CDD6F4',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            zIndex: 10002,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ color: '#89B4FA' }}>${hoveredToken.name}</span>
          <span style={{ color: '#6C7086' }}>{': '}</span>
          <span style={{ color: '#F9E2AF' }}>{hoveredToken.value}</span>
        </div>
      )}
    </div>
  )
}

export default TokenSwatches
