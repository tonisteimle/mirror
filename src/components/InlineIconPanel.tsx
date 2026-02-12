/**
 * InlineIconPanel - Inline icon picker that stays connected to the editor.
 *
 * Features:
 * - Focus remains in editor
 * - Typing filters icons (with synonym support)
 * - Grid layout with categories
 * - Mouse clicks work without stealing focus
 * - Triggered after "icon " in editor
 */
import { useMemo, useCallback, useEffect, useRef } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  InlinePanel,
  PanelHeader,
  PanelList,
  PanelItem,
  PanelFooter,
} from './InlinePanel'
import { ItemLabel } from './picker'
import { colors } from '../theme'
import { searchIcons } from '../data/icon-synonyms'

// Get all icon names from Lucide
// Filter: PascalCase names, exclude "Icon" suffix duplicates, exclude utilities
const allIconNames = Object.keys(LucideIcons).filter(
  key =>
    // Must start with uppercase (PascalCase component name)
    /^[A-Z]/.test(key) &&
    // Exclude "Icon" suffix variants (Heart vs HeartIcon - keep only Heart)
    !key.endsWith('Icon') &&
    // Exclude known non-icon exports
    key !== 'Icon' &&
    // Must be a valid export (React component or function)
    !!(LucideIcons as Record<string, unknown>)[key]
)

// Popular icons for when no filter is set
const popularIcons = [
  'Search', 'Home', 'User', 'Settings', 'Menu', 'X', 'Check', 'Plus', 'Minus',
  'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'ArrowLeft', 'ArrowRight',
  'Heart', 'Star', 'Bell', 'Mail', 'Send', 'MessageCircle', 'Phone',
  'Calendar', 'Clock', 'MapPin', 'Image', 'Camera', 'Edit', 'Trash',
  'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'AlertCircle', 'Info',
]

// Convert PascalCase to kebab-case for DSL
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

interface InlineIconPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconValue: string) => void
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void
}

const GRID_COLUMNS = 6
const MAX_RESULTS = 36 // 6 rows

export function InlineIconPanel({
  isOpen,
  onClose,
  onSelect,
  position,
  filter,
  selectedIndex,
  onSelectedIndexChange,
  onSelectedValueChange,
}: InlineIconPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Filter icons based on input with synonym support
  const filteredIcons = useMemo(() => {
    if (filter && filter.length > 0) {
      // Remove leading quote if present (user might type icon "ch)
      const cleanFilter = filter.replace(/^["']/, '')
      return searchIcons(allIconNames, cleanFilter).slice(0, MAX_RESULTS)
    }
    // Show popular icons when no filter
    return popularIcons.slice(0, MAX_RESULTS)
  }, [filter])

  // Compute selected value and report it
  const selectedValue = useMemo(() => {
    const icon = filteredIcons[selectedIndex]
    return icon ? `"${toKebabCase(icon)}"` : null
  }, [filteredIcons, selectedIndex])

  // Report selected value changes
  useEffect(() => {
    onSelectedValueChange?.(selectedValue)
  }, [selectedValue, onSelectedValueChange])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const row = Math.floor(selectedIndex / GRID_COLUMNS)
    const rowElement = listRef.current.children[row] as HTMLElement
    if (rowElement) {
      rowElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Handle icon click
  const handleIconClick = useCallback((iconName: string) => {
    onSelect(`"${toKebabCase(iconName)}"`)
    onClose()
  }, [onSelect, onClose])

  // Group icons into rows for grid layout
  const iconRows = useMemo(() => {
    const rows: string[][] = []
    for (let i = 0; i < filteredIcons.length; i += GRID_COLUMNS) {
      rows.push(filteredIcons.slice(i, i + GRID_COLUMNS))
    }
    return rows
  }, [filteredIcons])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={320}
      maxHeight={340}
    >
      <PanelHeader
        filter={filter ? `"${filter}` : undefined}
        placeholder="Icon-Name eingeben..."
      />

      <PanelList listRef={listRef}>
        {filteredIcons.length === 0 ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: colors.textMuted,
          }}>
            Keine Icons gefunden
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {iconRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '4px',
                }}
              >
                {row.map((iconName, colIndex) => {
                  const flatIndex = rowIndex * GRID_COLUMNS + colIndex
                  const isSelected = flatIndex === selectedIndex
                  const IconComponent = (
                    LucideIcons as unknown as Record<
                      string,
                      React.ComponentType<{ size?: number; color?: string }>
                    >
                  )[iconName]

                  if (!IconComponent) return null

                  return (
                    <div
                      key={iconName}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleIconClick(iconName)
                      }}
                      onMouseEnter={() => onSelectedIndexChange(flatIndex)}
                      title={toKebabCase(iconName)}
                      style={{
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? colors.accentPrimary : 'transparent',
                        borderRadius: '6px',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <IconComponent size={20} color={colors.text} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </PanelList>

      {/* Selected Icon Preview */}
      {filteredIcons[selectedIndex] && (
        <div
          style={{
            padding: '6px 12px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: colors.lineActive,
          }}
        >
          {(() => {
            const IconComponent = (
              LucideIcons as unknown as Record<
                string,
                React.ComponentType<{ size?: number; color?: string }>
              >
            )[filteredIcons[selectedIndex]]
            return IconComponent ? <IconComponent size={14} color={colors.text} /> : null
          })()}
          <span style={{
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            color: colors.text,
          }}>
            {toKebabCase(filteredIcons[selectedIndex])}
          </span>
        </div>
      )}

      <PanelFooter
        hints={[
          { key: '↑↓←→', label: 'Navigation' },
          { key: '↵', label: 'Einfügen' },
        ]}
      />
    </InlinePanel>
  )
}

/**
 * Calculate next index for grid navigation.
 */
export function navigateIconGrid(
  currentIndex: number,
  direction: 'up' | 'down' | 'left' | 'right',
  totalItems: number,
  columns: number = GRID_COLUMNS
): number {
  if (totalItems === 0) return 0

  switch (direction) {
    case 'up':
      return Math.max(0, currentIndex - columns)
    case 'down':
      return Math.min(totalItems - 1, currentIndex + columns)
    case 'left':
      return Math.max(0, currentIndex - 1)
    case 'right':
      return Math.min(totalItems - 1, currentIndex + 1)
    default:
      return currentIndex
  }
}
