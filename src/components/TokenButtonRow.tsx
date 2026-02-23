/**
 * TokenButtonRow - Token selection for non-color properties
 *
 * Shows tokens as buttons matching the existing picker design.
 * Used for padding, gap, radius, size properties.
 *
 * Design matches PresetButton rows in InlineLayoutPanel/InlineTypographyPanel:
 * - 24px height buttons
 * - Dark background (#181818), lighter when selected (#252525)
 * - Token name prominent, resolved value small below
 */

import { useMemo } from 'react'
import { parseBoundTokens, getTokensForProperty } from '../utils/token-parser'
import type { TokenPropertyBinding, BoundToken } from '../utils/token-parser'

// Match existing picker colors exactly
const COLORS = {
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  text: '#555',
  textLight: '#ccc',
  textMuted: '#444',
}

interface TokenButtonRowProps {
  /** Editor code to extract tokens from */
  code: string
  /** Property to filter tokens (pad, gap, rad, size, etc.) */
  property: TokenPropertyBinding
  /** Currently selected value (token name like "$sm.pad" or raw value) */
  value?: string | number
  /** Called when a token is selected */
  onSelect: (tokenName: string) => void
  /** Optional component context for prioritization */
  componentContext?: string
  /** Max tokens to show (default: 6) */
  maxTokens?: number
}

/**
 * Extract display name from token path.
 * $sm.pad → "SM"
 * $s.pad → "S"
 * Uses the baseName directly from token definition.
 */
function getDisplayName(token: BoundToken): string {
  return token.baseName.toUpperCase()
}

/**
 * Format resolved value for display.
 * Numbers stay as-is, colors show as hex.
 */
function formatValue(value: string): string {
  const num = parseFloat(value)
  if (!isNaN(num)) return String(num)
  return value
}

export function TokenButtonRow({
  code,
  property,
  value,
  onSelect,
  componentContext,
  maxTokens = 6,
}: TokenButtonRowProps) {
  // Parse and filter tokens for this property
  const tokens = useMemo(() => {
    if (!code) return []

    const allTokens = parseBoundTokens(code)
    const filtered = getTokensForProperty(property, componentContext, allTokens)

    // Limit to maxTokens
    return filtered.slice(0, maxTokens)
  }, [code, property, componentContext, maxTokens])

  // Check if current value matches a token (by baseName since we use simplified refs)
  const isSelected = (token: BoundToken): boolean => {
    if (!value) return false
    const tokenRef = `$${token.baseName}`
    return value === tokenRef || value === token.baseName ||
           value === `$${token.name}` || value === token.name
  }

  // Don't render if no tokens
  if (tokens.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
      {tokens.map((token) => {
        const selected = isSelected(token)
        const displayName = getDisplayName(token)
        const displayValue = formatValue(token.value)

        return (
          <button
            key={token.name}
            onMouseDown={(e) => {
              e.preventDefault()
              // Insert simplified reference - parser resolves based on context
              onSelect(`$${token.baseName}`)
            }}
            title={`$${token.baseName} → ${token.value}`}
            style={{
              minWidth: '24px',
              height: '24px',
              padding: '0 6px',
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
            <span style={{
              fontSize: '10px',
              fontWeight: 500,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              {displayName}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default TokenButtonRow
