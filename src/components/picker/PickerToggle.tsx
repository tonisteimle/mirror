/**
 * PickerToggle - Unified toggle button component for picker mode switching.
 * Used by ColorPicker and FontPicker to switch between tokens and picker modes.
 */
import { colors } from '../../theme'

export interface PickerToggleOption {
  id: string
  label: string
}

export interface PickerToggleProps {
  options: PickerToggleOption[]
  activeId: string
  onChange: (id: string) => void
}

export function PickerToggle({ options, activeId, onChange }: PickerToggleProps) {
  return (
    <div
      style={{
        padding: '8px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        gap: '4px',
      }}
    >
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          style={{
            flex: 1,
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: activeId === option.id ? colors.accentPrimary : colors.inputBg,
            color: activeId === option.id ? colors.text : colors.textMuted,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
