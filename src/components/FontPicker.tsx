import { useState, useEffect, useCallback, memo } from 'react'
import { colors } from '../theme'
import { usePickerBehavior } from '../hooks/usePickerBehavior'
import { BasePicker, PickerList, PickerFooter, PickerSearch, PickerToggle } from './picker'
import type { Position } from '../types/common'

interface FontPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (value: string) => void
  position: Position
  tokens: string // Token definitions from Tokens tab
  defaultToTokens?: boolean // Whether to default to tokens tab (default: true)
}

interface FontItem {
  name: string
  value: string
  preview?: string
  category: string
}

// System fonts organized by category
const systemFonts: FontItem[] = [
  // Sans-Serif
  { name: 'Inter', value: '"Inter", sans-serif', category: 'Sans-Serif' },
  { name: 'Roboto', value: '"Roboto", sans-serif', category: 'Sans-Serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif', category: 'Sans-Serif' },
  { name: 'Lato', value: '"Lato", sans-serif', category: 'Sans-Serif' },
  { name: 'Poppins', value: '"Poppins", sans-serif', category: 'Sans-Serif' },
  { name: 'Montserrat', value: '"Montserrat", sans-serif', category: 'Sans-Serif' },
  { name: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif', category: 'Sans-Serif' },
  { name: 'Nunito', value: '"Nunito", sans-serif', category: 'Sans-Serif' },
  { name: 'System UI', value: 'system-ui, sans-serif', category: 'Sans-Serif' },

  // Serif
  { name: 'Georgia', value: 'Georgia, serif', category: 'Serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif', category: 'Serif' },
  { name: 'Merriweather', value: '"Merriweather", serif', category: 'Serif' },
  { name: 'Lora', value: '"Lora", serif', category: 'Serif' },
  { name: 'PT Serif', value: '"PT Serif", serif', category: 'Serif' },
  { name: 'Libre Baskerville', value: '"Libre Baskerville", serif', category: 'Serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif', category: 'Serif' },

  // Monospace
  { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace', category: 'Monospace' },
  { name: 'Fira Code', value: '"Fira Code", monospace', category: 'Monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro", monospace', category: 'Monospace' },
  { name: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace', category: 'Monospace' },
  { name: 'Roboto Mono', value: '"Roboto Mono", monospace', category: 'Monospace' },
  { name: 'Monaco', value: 'Monaco, monospace', category: 'Monospace' },
  { name: 'Consolas', value: 'Consolas, monospace', category: 'Monospace' },

  // Display
  { name: 'Oswald', value: '"Oswald", sans-serif', category: 'Display' },
  { name: 'Raleway', value: '"Raleway", sans-serif', category: 'Display' },
  { name: 'Bebas Neue', value: '"Bebas Neue", sans-serif', category: 'Display' },
  { name: 'Abril Fatface', value: '"Abril Fatface", serif', category: 'Display' },
]

const fontCategories = ['Sans-Serif', 'Serif', 'Monospace', 'Display']

// Parse font tokens from tokens string
function parseFontTokens(tokens: string): FontItem[] {
  const fontTokens: FontItem[] = []
  const lines = tokens.split('\n')

  for (const line of lines) {
    const match = line.match(/^\s*(\$font-[a-zA-Z0-9-]+)\s*:\s*(.+)$/)
    if (match) {
      fontTokens.push({
        name: match[1],
        value: match[1], // Insert the token reference
        preview: match[2].trim(),
        category: 'Font Tokens',
      })
    }
  }

  return fontTokens
}

// Toggle options for tokens/fonts mode
const TOGGLE_OPTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'fonts', label: 'System Fonts' },
]

export const FontPicker = memo(function FontPicker({
  isOpen,
  onClose,
  onSelect,
  position,
  tokens,
  defaultToTokens = true,
}: FontPickerProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'fonts' | 'tokens'>(defaultToTokens ? 'tokens' : 'fonts')

  const fontTokens = parseFontTokens(tokens)

  // Get items based on mode
  const allItems = mode === 'fonts' ? systemFonts : fontTokens

  // Filter by query
  const filteredItems = query
    ? allItems.filter(
        item =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.value.toLowerCase().includes(query.toLowerCase()) ||
          (item.preview && item.preview.toLowerCase().includes(query.toLowerCase()))
      )
    : allItems

  // Group by category
  const categories = mode === 'fonts' ? fontCategories : ['Font Tokens']
  const groupedItems = new Map<string, FontItem[]>()
  for (const category of categories) {
    const items = filteredItems.filter(item => item.category === category)
    if (items.length > 0) {
      groupedItems.set(category, items)
    }
  }

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setMode(defaultToTokens ? 'tokens' : 'fonts')
    }
  }, [isOpen, defaultToTokens])

  const handleSelect = useCallback(
    (index: number) => {
      if (filteredItems[index]) {
        onSelect(filteredItems[index].value)
        onClose()
      }
    },
    [filteredItems, onSelect, onClose]
  )

  const {
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    resetSelection,
  } = usePickerBehavior({
    isOpen,
    onClose,
    itemCount: filteredItems.length,
    onSelect: handleSelect,
  })

  // Reset selection when query or mode changes
  useEffect(() => {
    resetSelection()
  }, [query, mode, resetSelection])

  const handleModeChange = (id: string) => {
    setMode(id as 'tokens' | 'fonts')
  }

  let itemIndex = 0

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={300}
      maxHeight={360}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
          ]}
        />
      }
    >
      {/* Toggle Buttons */}
      <PickerToggle options={TOGGLE_OPTIONS} activeId={mode} onChange={handleModeChange} />

      {/* Search Input */}
      <PickerSearch
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
        placeholder="Suchen..."
      />

      {/* Font List */}
      <PickerList ref={listRef}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '12px',
              fontSize: '12px',
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            {mode === 'tokens'
              ? 'Keine Font-Tokens definiert. Definiere z.B. $font-heading: "Playfair Display", serif'
              : 'Keine Fonts gefunden'}
          </div>
        ) : (
          Array.from(groupedItems.entries()).map(([category, items]) => (
            <div key={category}>
              {/* Category Header */}
              <div
                style={{
                  padding: '6px 12px 4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {category}
              </div>

              {/* Items */}
              {items.map(item => {
                const index = itemIndex++
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={item.name}
                    data-index={index}
                    onClick={() => handleSelect(index)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? colors.selected : 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      {/* Font name (readable) */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: colors.text,
                          fontFamily: 'system-ui, sans-serif',
                          minWidth: '100px',
                        }}
                      >
                        {item.name}
                      </div>
                      {/* Font preview */}
                      {mode === 'fonts' && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: colors.textMuted,
                            fontFamily: item.value,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Beispiel
                        </div>
                      )}
                      {/* Token preview (for tokens mode) */}
                      {item.preview && mode === 'tokens' && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: colors.textMuted,
                            fontFamily: 'JetBrains Mono, monospace',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.preview}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
