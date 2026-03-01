/**
 * Shared Label Components for Inline Panels
 *
 * SectionLabel - Section header label
 */
import { PANEL_COLORS, PANEL_SIZES } from './tokens'

interface SectionLabelProps {
  children: React.ReactNode
  /** Indent label (for sub-sections) */
  indent?: boolean
}

/**
 * Section label for panel sections (Size, Direction, Gap, etc.)
 */
export function SectionLabel({ children, indent }: SectionLabelProps) {
  return (
    <div
      style={{
        fontSize: PANEL_SIZES.fontSize,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: PANEL_COLORS.label,
        marginBottom: 4,
        marginLeft: indent ? PANEL_SIZES.buttonHeight : 0,
      }}
    >
      {children}
    </div>
  )
}
