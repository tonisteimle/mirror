import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { usePickerBehavior } from '../hooks/usePickerBehavior'
import { useGridNavigation } from '../hooks/useGridNavigation'
import { BasePicker, PickerFooter, PickerToggle } from './picker'
import { HexInput, HueSelector, VariationsGrid, ColorTokenList } from './color-picker'
import { hexToRgb, rgbToHsl, generateHueVariations, HUES } from '../utils/color'
import { parseColorTokens as parseColorTokensUtil } from '../utils/token-parser'
import type { Position } from '../types/common'

interface ColorPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (color: string) => void
  position: Position
  initialColor?: string
  tokens?: string // Token definitions
  defaultToTokens?: boolean // Whether to default to tokens tab (default: true)
}

// Toggle options for tokens/picker mode
const TOGGLE_OPTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'picker', label: 'Farbwähler' },
]

const COLS = 18

export const ColorPicker = memo(function ColorPicker({
  isOpen,
  onClose,
  onSelect,
  position,
  initialColor,
  tokens = '',
  defaultToTokens = true,
}: ColorPickerProps) {
  const [mode, setMode] = useState<'tokens' | 'picker'>(defaultToTokens ? 'tokens' : 'picker')
  const [customColor, setCustomColor] = useState('')
  const [selectedHue, setSelectedHue] = useState<number | null>(null)
  const customInputRef = useRef<HTMLInputElement>(null)

  // Use memoized token parsing
  const colorTokens = useMemo(
    () => parseColorTokensUtil(tokens).map(t => ({ name: '$' + t.name, value: t.value })),
    [tokens]
  )
  const variations = generateHueVariations(selectedHue, COLS)

  // Ref for custom color in grid select callback
  const customColorRef = useRef(customColor)
  customColorRef.current = customColor

  // Grid select handler
  const handleGridSelect = useCallback((pos: { row: number; col: number }) => {
    const currentCustomColor = customColorRef.current
    if (currentCustomColor) {
      onSelect('#' + currentCustomColor.toUpperCase())
    } else if (variations[pos.row]?.[pos.col]) {
      onSelect('#' + variations[pos.row][pos.col])
    }
    onClose()
  }, [variations, onSelect, onClose])

  // Grid navigation for picker mode
  const gridNav = useGridNavigation({
    isActive: isOpen && mode === 'picker',
    rowCount: variations.length,
    getColCount: (row) => variations[row]?.length || COLS,
    initialPosition: { row: 4, col: 0 },
    onSelect: handleGridSelect,
    onClose,
    onTab: () => setMode('tokens'),
  })

  // Token mode: use picker behavior
  const handleTokenSelect = useCallback(
    (index: number) => {
      if (colorTokens[index]) {
        onSelect(colorTokens[index].name)
        onClose()
      }
    },
    [colorTokens, onSelect, onClose]
  )

  // Custom Tab handler to switch modes
  const handleModeSwitch = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault()
      setMode(m => (m === 'tokens' ? 'picker' : 'tokens'))
    },
    []
  )

  const tokenPicker = usePickerBehavior({
    isOpen: isOpen && mode === 'tokens',
    onClose,
    itemCount: colorTokens.length,
    onSelect: handleTokenSelect,
    customKeyHandlers: { Tab: handleModeSwitch },
  })

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMode(defaultToTokens ? 'tokens' : 'picker')
      tokenPicker.resetSelection()

      if (initialColor) {
        const rgb = hexToRgb(initialColor)
        if (rgb) {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

          if (hsl.s < 10) {
            setSelectedHue(null)
            const rowIndex = Math.max(0, Math.min(9, Math.round((95 - hsl.l) / 9)))
            gridNav.reset({ row: rowIndex, col: 0 })
          } else {
            let closestHue = HUES[0]
            let minDiff = Math.abs(hsl.h - HUES[0])
            for (const hue of HUES) {
              const diff = Math.min(Math.abs(hsl.h - hue), 360 - Math.abs(hsl.h - hue))
              if (diff < minDiff) {
                minDiff = diff
                closestHue = hue
              }
            }
            setSelectedHue(closestHue)

            const rowIndex = Math.max(0, Math.min(9, Math.round((95 - hsl.l) / 9)))
            const colIndex = Math.max(0, Math.min(14, Math.round((100 - hsl.s) / 7)))
            gridNav.reset({ row: rowIndex, col: colIndex })
          }

          const hexWithoutHash = initialColor.replace('#', '').toUpperCase()
          setCustomColor(hexWithoutHash)
        } else {
          setCustomColor('')
          setSelectedHue(0)
          gridNav.reset({ row: 4, col: 0 })
        }
      } else {
        setCustomColor('')
        setSelectedHue(0)
        gridNav.reset({ row: 4, col: 0 })
      }
    }
  }, [isOpen, initialColor, defaultToTokens, tokenPicker, gridNav])

  const handleColorClick = (color: string) => {
    onSelect('#' + color)
    onClose()
  }

  const handleModeChange = (id: string) => {
    setMode(id as 'tokens' | 'picker')
  }

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={340}
      maxHeight={400}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
            { key: 'Tab', label: 'Wechseln' },
          ]}
        />
      }
    >
      {/* Toggle Buttons */}
      <PickerToggle options={TOGGLE_OPTIONS} activeId={mode} onChange={handleModeChange} />

      {mode === 'tokens' ? (
        /* Token List */
        <ColorTokenList
          ref={tokenPicker.listRef}
          tokens={colorTokens}
          selectedIndex={tokenPicker.selectedIndex}
          onSelect={handleTokenSelect}
          onHover={tokenPicker.setSelectedIndex}
          onKeyDown={tokenPicker.handleKeyDown}
        />
      ) : (
        /* Color Picker Grid */
        <>
          {/* Hex input */}
          <HexInput
            ref={customInputRef}
            value={customColor}
            onChange={setCustomColor}
            onSubmit={(color) => {
              onSelect(color)
              onClose()
            }}
          />

          {/* Color grid */}
          <div style={{ padding: '8px' }}>
            {/* Hue selector */}
            <HueSelector
              selectedHue={selectedHue}
              onHueSelect={(hue) => {
                setSelectedHue(hue)
                gridNav.setPosition({ row: hue === null ? 0 : 4, col: 0 })
              }}
            />

            {/* Variations grid */}
            <VariationsGrid
              variations={variations}
              selectedRow={gridNav.position.row}
              selectedCol={gridNav.position.col}
              onColorSelect={handleColorClick}
            />
          </div>
        </>
      )}
    </BasePicker>
  )
})
