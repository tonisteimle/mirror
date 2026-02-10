import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { colors } from '../theme'
import { usePickerBehavior } from '../hooks/usePickerBehavior'
import { BasePicker, PickerList, PickerFooter, PickerToggle, ColorSwatch } from './picker'
import { hslToHex, hexToRgb, rgbToHsl, generateHueVariations, HUES } from '../utils/color'
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

interface ColorToken {
  name: string
  value: string
}

// Parse color tokens from tokens string
function parseColorTokens(tokens: string): ColorToken[] {
  const colorTokens: ColorToken[] = []
  const lines = tokens.split('\n')
  let inColorSection = false

  for (const line of lines) {
    // Check for section header
    if (line.match(/^\/\/\s*(farben|color)/i)) {
      inColorSection = true
      continue
    }
    if (line.match(/^\/\/\s*\w/)) {
      inColorSection = false
      continue
    }

    // Parse token in color section
    if (inColorSection) {
      const match = line.match(/^\s*(\$[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,6})\s*$/)
      if (match) {
        colorTokens.push({
          name: match[1],
          value: match[2].toUpperCase(),
        })
      }
    }
  }

  return colorTokens
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
  const [gridIndex, setGridIndex] = useState({ row: 0, col: 0 })
  const customInputRef = useRef<HTMLInputElement>(null)

  const colorTokens = parseColorTokens(tokens)
  const variations = generateHueVariations(selectedHue, COLS)

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

  // Grid navigation for picker mode
  useEffect(() => {
    if (!isOpen || mode !== 'picker') return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (customColor) {
            onSelect('#' + customColor.toUpperCase())
          } else if (variations[gridIndex.row]?.[gridIndex.col]) {
            onSelect('#' + variations[gridIndex.row][gridIndex.col])
          }
          onClose()
          break
        case 'ArrowUp':
          e.preventDefault()
          setGridIndex(prev => ({ ...prev, row: Math.max(0, prev.row - 1) }))
          break
        case 'ArrowDown':
          e.preventDefault()
          setGridIndex(prev => ({ ...prev, row: Math.min(variations.length - 1, prev.row + 1) }))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setGridIndex(prev => ({ ...prev, col: Math.max(0, prev.col - 1) }))
          break
        case 'ArrowRight':
          e.preventDefault()
          setGridIndex(prev => ({
            ...prev,
            col: Math.min((variations[0]?.length || 1) - 1, prev.col + 1),
          }))
          break
        case 'Tab':
          e.preventDefault()
          setMode('tokens')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, mode, onClose, onSelect, customColor, gridIndex, variations])

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
            setGridIndex({ row: rowIndex, col: 0 })
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
            setGridIndex({ row: rowIndex, col: colIndex })
          }

          const hexWithoutHash = initialColor.replace('#', '').toUpperCase()
          setCustomColor(hexWithoutHash)
        } else {
          setCustomColor('')
          setSelectedHue(0)
          setGridIndex({ row: 4, col: 0 })
        }
      } else {
        setCustomColor('')
        setSelectedHue(0)
        setGridIndex({ row: 4, col: 0 })
      }
    }
  }, [isOpen, initialColor, defaultToTokens, tokenPicker])

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
        <PickerList ref={tokenPicker.listRef} onKeyDown={tokenPicker.handleKeyDown}>
          {colorTokens.length === 0 ? (
            <div
              style={{
                padding: '12px',
                fontSize: '12px',
                color: colors.textMuted,
                textAlign: 'center',
              }}
            >
              Keine Farb-Tokens definiert
            </div>
          ) : (
            colorTokens.map((token, index) => {
              const isSelected = index === tokenPicker.selectedIndex
              return (
                <div
                  key={token.name}
                  data-index={index}
                  onClick={() => handleTokenSelect(index)}
                  onMouseEnter={() => tokenPicker.setSelectedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? colors.selected : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* Color swatch */}
                  <ColorSwatch color={token.value} size={24} borderRadius={4} />
                  {/* Token info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: colors.text,
                      }}
                    >
                      {token.name}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: colors.textMuted,
                      }}
                    >
                      {token.value}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </PickerList>
      ) : (
        /* Color Picker Grid */
        <>
          {/* Custom input */}
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
              ref={customInputRef}
              type="text"
              value={customColor}
              onChange={e =>
                setCustomColor(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))
              }
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
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ' ') && customColor) {
                  e.preventDefault()
                  onSelect('#' + customColor.toUpperCase())
                  onClose()
                }
              }}
            />
            {customColor && (
              <ColorSwatch
                color={
                  '#' +
                  (customColor.length === 3
                    ? customColor.split('').map(c => c + c).join('')
                    : customColor)
                }
                size={24}
                borderRadius={4}
              />
            )}
          </div>

          {/* Color grid */}
          <div style={{ padding: '8px' }}>
            {/* Hue selector */}
            <div style={{ display: 'flex', gap: '1px', marginBottom: '4px' }}>
              <div
                onClick={() => {
                  setSelectedHue(null)
                  setGridIndex({ row: 0, col: 0 })
                }}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '2px',
                  background: 'linear-gradient(135deg, #FFF 0%, #000 100%)',
                  cursor: 'pointer',
                  border: selectedHue === null ? '1px solid #FFF' : 'none',
                  boxSizing: 'border-box',
                }}
                title="Graustufen"
              />
              {HUES.map(hue => (
                <div
                  key={hue}
                  onClick={() => {
                    setSelectedHue(hue)
                    setGridIndex({ row: 4, col: 0 })
                  }}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '2px',
                    backgroundColor: '#' + hslToHex(hue, 100, 50),
                    cursor: 'pointer',
                    border: selectedHue === hue ? '1px solid #FFF' : 'none',
                    boxSizing: 'border-box',
                  }}
                  title={`Hue ${hue}°`}
                />
              ))}
            </div>

            {/* Variations grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {variations.map((row, rowIndex) => (
                <div key={rowIndex} style={{ display: 'flex', gap: '1px' }}>
                  {row.map((color, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleColorClick(color)}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '2px',
                        backgroundColor: '#' + color,
                        cursor: 'pointer',
                        border:
                          gridIndex.row === rowIndex && gridIndex.col === colIndex
                            ? '1px solid #FFF'
                            : 'none',
                        boxSizing: 'border-box',
                      }}
                      title={'#' + color}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BasePicker>
  )
})
