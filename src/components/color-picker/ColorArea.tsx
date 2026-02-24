/**
 * ColorArea Component
 *
 * Interactive color picker area using react-colorful.
 * Displays saturation/brightness picker, hue slider, and color value display.
 */

import { memo, useCallback } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { colors } from '../../theme'

interface ColorAreaProps {
  color: string
  onChange: (color: string) => void
  onSubmit: (color: string) => void
}

export const ColorArea = memo(function ColorArea({
  color,
  onChange,
  onSubmit,
}: ColorAreaProps) {
  // Ensure color has # prefix for react-colorful
  const normalizedColor = color.startsWith('#') ? color : `#${color}`

  const handleChange = useCallback((newColor: string) => {
    onChange(newColor.toUpperCase())
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && color) {
      e.preventDefault()
      onSubmit(normalizedColor.toUpperCase())
    }
  }, [color, normalizedColor, onSubmit])

  return (
    <div style={{ padding: '12px' }}>
      {/* Color Picker */}
      <div className="color-picker-wrapper">
        <HexColorPicker
          color={normalizedColor}
          onChange={handleChange}
        />
      </div>

      {/* Color Value Display */}
      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {/* Color Preview Swatch */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: normalizedColor,
            border: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        />

        {/* HEX Input */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 10px',
            backgroundColor: colors.inputBg,
            borderRadius: '6px',
          }}
        >
          <span
            style={{
              color: colors.textMuted,
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            #
          </span>
          <HexColorInput
            color={normalizedColor}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            prefixed={false}
            style={{
              flex: 1,
              padding: 0,
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.text,
              outline: 'none',
              textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      {/* Styles for react-colorful */}
      <style>{`
        .color-picker-wrapper .react-colorful {
          width: 100%;
          height: 180px;
        }
        .color-picker-wrapper .react-colorful__saturation {
          border-radius: 6px 6px 0 0;
        }
        .color-picker-wrapper .react-colorful__hue {
          height: 14px;
          border-radius: 0 0 6px 6px;
        }
        .color-picker-wrapper .react-colorful__pointer {
          width: 18px;
          height: 18px;
          border-width: 3px;
        }
        .color-picker-wrapper .react-colorful__hue-pointer {
          width: 10px;
          height: 18px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
})
