/**
 * Shared Input Components for Inline Panels
 *
 * NumberInput - Numeric input with preset highlight logic
 */
import { PANEL_COLORS, PANEL_SIZES } from './tokens'

interface NumberInputProps {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  /** Width in pixels (default: 40) */
  width?: number
  /** Presets that should show empty field when matched */
  presets?: number[]
  /** Use parseFloat instead of parseInt (for decimals like line-height) */
  allowDecimals?: boolean
  /** Compact mode - smaller height and font (default: false) */
  compact?: boolean
}

/**
 * Numeric input field with preset-aware highlighting
 *
 * When value matches a preset, the input shows empty and uses default styling.
 * When value is custom (not in presets), the input shows the value and highlights.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  width = 40,
  presets = [],
  allowDecimals = false,
  compact = false,
}: NumberInputProps) {
  // Only show value and highlight if it's a custom value (not matching any preset)
  const isPresetValue = presets.includes(value)
  const showValue = !isPresetValue && value > 0

  const height = compact ? PANEL_SIZES.buttonHeightSmall : PANEL_SIZES.buttonHeight
  const fontSize = compact ? PANEL_SIZES.fontSizeSmall : PANEL_SIZES.fontSize
  const borderRadius = compact ? PANEL_SIZES.borderRadiusSmall : PANEL_SIZES.borderRadius

  return (
    <input
      type="text"
      value={showValue ? value : ''}
      placeholder={placeholder}
      onChange={(e) => {
        const num = allowDecimals
          ? parseFloat(e.target.value)
          : parseInt(e.target.value, 10)
        onChange(isNaN(num) ? 0 : num)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width,
        height,
        padding: '0 5px',
        backgroundColor: showValue ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
        color: PANEL_COLORS.textLight,
        border: 'none',
        borderRadius,
        fontSize,
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      }}
    />
  )
}
