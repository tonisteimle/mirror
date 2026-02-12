/**
 * HexInput Component
 *
 * Input field for entering hex color values with live preview.
 */

import { forwardRef, memo } from 'react'
import { colors } from '../../theme'
import { ColorSwatch } from '../picker'

interface HexInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (color: string) => void
}

export const HexInput = memo(forwardRef<HTMLInputElement, HexInputProps>(
  function HexInput({ value, onChange, onSubmit }, ref) {
    // Expand 3-char hex to 6-char
    const expandedColor = value.length === 3
      ? value.split('').map(c => c + c).join('')
      : value

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow valid hex characters, max 6 chars
      const sanitized = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
      onChange(sanitized)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && value) {
        e.preventDefault()
        onSubmit('#' + value.toUpperCase())
      }
    }

    return (
      <div
        style={{
          padding: '8px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: colors.textMuted,
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          #
        </span>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="333 oder 3B82F6"
          autoFocus
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            backgroundColor: colors.inputBg,
            border: 'none',
            borderRadius: '4px',
            color: colors.text,
            outline: 'none',
          }}
        />
        {value && (
          <ColorSwatch
            color={'#' + expandedColor}
            size={24}
            borderRadius={4}
          />
        )}
      </div>
    )
  }
))
