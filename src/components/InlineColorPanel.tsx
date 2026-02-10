/**
 * InlineColorPanel - Pure color picker that stays connected to the editor.
 *
 * Only shows the color grid - token selection is handled by TokenPicker.
 * - Focus remains in editor
 * - Typing hex values shows preview
 * - Mouse clicks on colors work
 * - Triggered by # character
 */
import { useEffect, useMemo, useCallback } from 'react'
import {
  InlinePanel,
  PanelHeader,
  PanelList,
  PanelItem,
  PanelFooter,
} from './InlinePanel'
import { ColorSwatch, ItemLabel } from './picker'
import { COLOR_GRID } from '../utils/color'

interface InlineColorPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (color: string) => void
  position: { x: number; y: number }
  filter: string // Current filter text from editor (hex input)
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void // Reports current selected value
}

export function InlineColorPanel({
  isOpen,
  onClose,
  onSelect,
  position,
  filter,
  selectedIndex,
  onSelectedIndexChange,
  onSelectedValueChange,
}: InlineColorPanelProps) {
  // Check if filter looks like a hex color (user typing after #)
  const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(filter)
  const hexPreview = isHexInput && filter.length >= 3
    ? '#' + filter.toUpperCase()
    : null

  // Compute current selected value and report it
  const currentSelectedValue = useMemo(() => {
    // If user typed a valid hex, that's the selected value
    if (hexPreview && selectedIndex === 0) {
      return hexPreview
    }
    // Otherwise, get color from grid (offset by 1 if hex preview exists)
    const gridIndex = hexPreview ? selectedIndex - 1 : selectedIndex
    const cols = COLOR_GRID[0]?.length || 1
    const row = Math.floor(gridIndex / cols)
    const col = gridIndex % cols
    const color = COLOR_GRID[row]?.[col]
    return color ? '#' + color : null
  }, [selectedIndex, hexPreview])

  // Report selected value changes
  useEffect(() => {
    onSelectedValueChange?.(currentSelectedValue)
  }, [currentSelectedValue, onSelectedValueChange])

  // Handle hex input selection
  const handleHexSelect = useCallback(() => {
    if (hexPreview) {
      onSelect(hexPreview)
      onClose()
    }
  }, [hexPreview, onSelect, onClose])

  // Handle color grid click
  const handleColorClick = useCallback((color: string) => {
    onSelect('#' + color)
    onClose()
  }, [onSelect, onClose])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={290}
      maxHeight={400}
    >
      <PanelHeader
        filter={filter ? '#' + filter : undefined}
        placeholder="Hex eingeben..."
      />

      <div style={{ padding: '8px', flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Hex preview if user is typing a valid color */}
        {hexPreview && (
          <PanelList>
            <PanelItem
              isSelected={selectedIndex === 0}
              onClick={handleHexSelect}
              onMouseEnter={() => onSelectedIndexChange(0)}
            >
              <ColorSwatch color={hexPreview} />
              <ItemLabel
                primary={hexPreview}
                secondary="Hex eingeben"
                primaryColor="#C586C0"
              />
            </PanelItem>
          </PanelList>
        )}

        {/* Color Grid */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          marginTop: hexPreview ? '8px' : 0,
        }}>
          {COLOR_GRID.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} style={{ display: 'flex', gap: '2px' }}>
              {row.map((color, colIndex) => {
                const flatIndex = rowIndex * row.length + colIndex
                const adjustedIndex = hexPreview ? flatIndex + 1 : flatIndex
                return (
                  <div
                    key={color}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleColorClick(color)
                    }}
                    onMouseEnter={() => onSelectedIndexChange(adjustedIndex)}
                    style={{
                      width: '22px',
                      height: '16px',
                      borderRadius: '2px',
                      backgroundColor: '#' + color,
                      cursor: 'pointer',
                      border: selectedIndex === adjustedIndex
                        ? '2px solid #FFF'
                        : '1px solid transparent',
                      boxSizing: 'border-box',
                    }}
                    title={'#' + color}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <PanelFooter
        hints={[
          { key: '↑↓←→', label: 'Navigation' },
          { key: '↵', label: 'Einfügen' },
        ]}
      />
    </InlinePanel>
  )
}
