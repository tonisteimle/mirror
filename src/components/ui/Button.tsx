/**
 * Shared Button Components for Inline Panels
 *
 * IconButton - 24x24 square button for icons
 * PresetButton - Variable width button for preset values
 */
import { PANEL_COLORS, PANEL_SIZES } from './tokens'

interface IconButtonProps {
  selected?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
  /** Size in pixels (default: 24) */
  size?: number
}

/**
 * Square icon button (24x24 by default)
 * Used for direction, alignment, border side toggles, etc.
 */
export function IconButton({
  selected,
  onClick,
  children,
  title,
  size = PANEL_SIZES.iconButtonSize,
}: IconButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
        color: selected ? PANEL_COLORS.textLight : PANEL_COLORS.text,
        border: 'none',
        borderRadius: PANEL_SIZES.borderRadius,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

interface PresetButtonProps {
  /** Value to display (number or string) */
  value: number | string
  selected: boolean
  onClick: () => void
  /** Optional label override (displays label instead of value) */
  label?: string
  /** Minimum width in pixels (default: 24) */
  width?: number
}

/**
 * Preset value button for numeric presets (0, 4, 8, 12, etc.)
 * or string presets (font weights, line heights, etc.)
 */
export function PresetButton({
  value,
  selected,
  onClick,
  label,
  width = PANEL_SIZES.buttonHeight,
}: PresetButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      style={{
        minWidth: width,
        height: PANEL_SIZES.buttonHeight,
        padding: '0 5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
        color: selected ? PANEL_COLORS.textLight : PANEL_COLORS.text,
        border: 'none',
        borderRadius: PANEL_SIZES.borderRadius,
        cursor: 'pointer',
        fontSize: PANEL_SIZES.fontSize,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {label ?? value}
    </button>
  )
}
