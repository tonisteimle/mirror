import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { colors } from '../theme'
import { usePickerWithSearch } from '../hooks/usePickerWithSearch'
import { useGroupedItems } from '../hooks/useGroupedItems'
import { BasePicker, PickerList, PickerFooter, PickerSearch, PickerToggle, PickerItem, CategoryHeader, EmptyState } from './picker'
import { parseFontTokens as parseFontTokensUtil } from '../utils/token-parser'
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

// Toggle options for tokens/fonts mode
const TOGGLE_OPTIONS = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'fonts', label: 'System Fonts' },
]

// Stable callbacks for filtering and grouping
const getFontSearchableFields = (item: FontItem) => [item.name, item.value, item.preview]
const getFontCategory = (item: FontItem) => item.category

export const FontPicker = memo(function FontPicker({
  isOpen,
  onClose,
  onSelect,
  position,
  tokens,
  defaultToTokens = true,
}: FontPickerProps) {
  const [mode, setMode] = useState<'fonts' | 'tokens'>(defaultToTokens ? 'tokens' : 'fonts')

  // Use memoized token parsing with unified parser
  const fontTokens = useMemo(
    () => parseFontTokensUtil(tokens).map(t => ({
      name: '$' + t.name,
      value: '$' + t.name, // Insert the token reference
      preview: t.value,
      category: 'Font Tokens',
    })),
    [tokens]
  )

  // Get items based on mode
  const allItems = mode === 'fonts' ? systemFonts : fontTokens

  // Handle font selection
  const handleFontSelect = useCallback(
    (item: FontItem) => onSelect(item.value),
    [onSelect]
  )

  // Combined search, filter, and navigation
  const {
    query,
    setQuery,
    filteredItems,
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    handleSelect,
    resetSelection,
  } = usePickerWithSearch({
    isOpen,
    onClose,
    items: allItems,
    getSearchableFields: getFontSearchableFields,
    onSelectItem: handleFontSelect,
  })

  // Group by category with stable indices
  const categories = mode === 'fonts' ? fontCategories : ['Font Tokens']
  const { groupedItems } = useGroupedItems({
    items: filteredItems,
    getCategory: getFontCategory,
    categories,
  })

  // Reset mode when opened
  useEffect(() => {
    if (isOpen) {
      setMode(defaultToTokens ? 'tokens' : 'fonts')
    }
  }, [isOpen, defaultToTokens])

  // Reset selection when mode changes
  useEffect(() => {
    resetSelection()
  }, [mode, resetSelection])

  const handleModeChange = (id: string) => {
    setMode(id as 'tokens' | 'fonts')
  }

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
          <EmptyState>
            {mode === 'tokens'
              ? 'Keine Font-Tokens definiert. Definiere z.B. $font-heading: "Playfair Display", serif'
              : 'Keine Fonts gefunden'}
          </EmptyState>
        ) : (
          groupedItems.map(({ category, items }) => (
            <div key={category}>
              <CategoryHeader>{category}</CategoryHeader>
              {items.map(item => (
                <PickerItem
                  key={item.name}
                  index={item.flatIndex}
                  isSelected={item.flatIndex === selectedIndex}
                  onClick={() => handleSelect(item.flatIndex)}
                  onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                  style={{ gap: '8px' }}
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
                </PickerItem>
              ))}
            </div>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
