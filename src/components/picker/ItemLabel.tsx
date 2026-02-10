/**
 * ItemLabel - Label component with primary and optional secondary text.
 * Used in picker list items to display token names with values.
 */
import { colors } from '../../theme'

export interface ItemLabelProps {
  /** Primary text (e.g., token name) */
  primary: string
  /** Secondary text (e.g., token value) - optional */
  secondary?: string
  /** Color for primary text (default: #9CDCFE) */
  primaryColor?: string
}

export function ItemLabel({ primary, secondary, primaryColor = '#9CDCFE' }: ItemLabelProps) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <span style={{ color: primaryColor }}>{primary}</span>
      {secondary && (
        <span style={{ color: colors.textMuted, marginLeft: '8px' }}>{secondary}</span>
      )}
    </div>
  )
}
