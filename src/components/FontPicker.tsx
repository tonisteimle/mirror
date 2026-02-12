import { useEffect, useCallback, useRef, memo } from 'react'
import { colors } from '../theme'
import { usePickerWithSearch } from '../hooks/usePickerWithSearch'
import { useGroupedItems } from '../hooks/useGroupedItems'
import { BasePicker, PickerList, PickerFooter, PickerSearch, PickerItem, CategoryHeader, EmptyState } from './picker'
import type { Position } from '../types/common'

interface FontPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (value: string) => void
  position: Position
}

interface FontItem {
  name: string
  value: string
  category: string
}

// Google Fonts - comprehensive list organized by category
const googleFonts: FontItem[] = [
  // Sans-Serif (most popular first)
  { name: 'Inter', value: '"Inter"', category: 'Sans-Serif' },
  { name: 'Roboto', value: '"Roboto"', category: 'Sans-Serif' },
  { name: 'Open Sans', value: '"Open Sans"', category: 'Sans-Serif' },
  { name: 'Noto Sans', value: '"Noto Sans"', category: 'Sans-Serif' },
  { name: 'Lato', value: '"Lato"', category: 'Sans-Serif' },
  { name: 'Poppins', value: '"Poppins"', category: 'Sans-Serif' },
  { name: 'Montserrat', value: '"Montserrat"', category: 'Sans-Serif' },
  { name: 'Source Sans 3', value: '"Source Sans 3"', category: 'Sans-Serif' },
  { name: 'Nunito', value: '"Nunito"', category: 'Sans-Serif' },
  { name: 'Nunito Sans', value: '"Nunito Sans"', category: 'Sans-Serif' },
  { name: 'Rubik', value: '"Rubik"', category: 'Sans-Serif' },
  { name: 'Work Sans', value: '"Work Sans"', category: 'Sans-Serif' },
  { name: 'DM Sans', value: '"DM Sans"', category: 'Sans-Serif' },
  { name: 'Outfit', value: '"Outfit"', category: 'Sans-Serif' },
  { name: 'Manrope', value: '"Manrope"', category: 'Sans-Serif' },
  { name: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans"', category: 'Sans-Serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk"', category: 'Sans-Serif' },
  { name: 'Figtree', value: '"Figtree"', category: 'Sans-Serif' },
  { name: 'Sora', value: '"Sora"', category: 'Sans-Serif' },
  { name: 'Lexend', value: '"Lexend"', category: 'Sans-Serif' },
  { name: 'Urbanist', value: '"Urbanist"', category: 'Sans-Serif' },
  { name: 'Quicksand', value: '"Quicksand"', category: 'Sans-Serif' },
  { name: 'Barlow', value: '"Barlow"', category: 'Sans-Serif' },
  { name: 'Karla', value: '"Karla"', category: 'Sans-Serif' },
  { name: 'Mulish', value: '"Mulish"', category: 'Sans-Serif' },
  { name: 'Cabin', value: '"Cabin"', category: 'Sans-Serif' },
  { name: 'Archivo', value: '"Archivo"', category: 'Sans-Serif' },
  { name: 'Mukta', value: '"Mukta"', category: 'Sans-Serif' },
  { name: 'Exo 2', value: '"Exo 2"', category: 'Sans-Serif' },
  { name: 'Albert Sans', value: '"Albert Sans"', category: 'Sans-Serif' },
  { name: 'Be Vietnam Pro', value: '"Be Vietnam Pro"', category: 'Sans-Serif' },
  { name: 'Public Sans', value: '"Public Sans"', category: 'Sans-Serif' },
  { name: 'IBM Plex Sans', value: '"IBM Plex Sans"', category: 'Sans-Serif' },
  { name: 'Overpass', value: '"Overpass"', category: 'Sans-Serif' },
  { name: 'Assistant', value: '"Assistant"', category: 'Sans-Serif' },
  { name: 'Titillium Web', value: '"Titillium Web"', category: 'Sans-Serif' },
  { name: 'Catamaran', value: '"Catamaran"', category: 'Sans-Serif' },
  { name: 'Hind', value: '"Hind"', category: 'Sans-Serif' },
  { name: 'Questrial', value: '"Questrial"', category: 'Sans-Serif' },
  { name: 'Red Hat Display', value: '"Red Hat Display"', category: 'Sans-Serif' },
  { name: 'Asap', value: '"Asap"', category: 'Sans-Serif' },
  { name: 'Signika', value: '"Signika"', category: 'Sans-Serif' },
  { name: 'Maven Pro', value: '"Maven Pro"', category: 'Sans-Serif' },
  { name: 'Prompt', value: '"Prompt"', category: 'Sans-Serif' },
  { name: 'Encode Sans', value: '"Encode Sans"', category: 'Sans-Serif' },
  { name: 'Nanum Gothic', value: '"Nanum Gothic"', category: 'Sans-Serif' },

  // Serif (most popular first)
  { name: 'Roboto Slab', value: '"Roboto Slab"', category: 'Serif' },
  { name: 'Playfair Display', value: '"Playfair Display"', category: 'Serif' },
  { name: 'Merriweather', value: '"Merriweather"', category: 'Serif' },
  { name: 'Lora', value: '"Lora"', category: 'Serif' },
  { name: 'PT Serif', value: '"PT Serif"', category: 'Serif' },
  { name: 'Noto Serif', value: '"Noto Serif"', category: 'Serif' },
  { name: 'Source Serif 4', value: '"Source Serif 4"', category: 'Serif' },
  { name: 'Libre Baskerville', value: '"Libre Baskerville"', category: 'Serif' },
  { name: 'EB Garamond', value: '"EB Garamond"', category: 'Serif' },
  { name: 'Crimson Text', value: '"Crimson Text"', category: 'Serif' },
  { name: 'Cormorant Garamond', value: '"Cormorant Garamond"', category: 'Serif' },
  { name: 'Bitter', value: '"Bitter"', category: 'Serif' },
  { name: 'DM Serif Display', value: '"DM Serif Display"', category: 'Serif' },
  { name: 'Vollkorn', value: '"Vollkorn"', category: 'Serif' },
  { name: 'Spectral', value: '"Spectral"', category: 'Serif' },
  { name: 'Cardo', value: '"Cardo"', category: 'Serif' },
  { name: 'Libre Caslon Text', value: '"Libre Caslon Text"', category: 'Serif' },
  { name: 'Old Standard TT', value: '"Old Standard TT"', category: 'Serif' },
  { name: 'Domine', value: '"Domine"', category: 'Serif' },
  { name: 'Gentium Plus', value: '"Gentium Plus"', category: 'Serif' },
  { name: 'Alegreya', value: '"Alegreya"', category: 'Serif' },
  { name: 'Arvo', value: '"Arvo"', category: 'Serif' },
  { name: 'Noticia Text', value: '"Noticia Text"', category: 'Serif' },
  { name: 'Tinos', value: '"Tinos"', category: 'Serif' },
  { name: 'Frank Ruhl Libre', value: '"Frank Ruhl Libre"', category: 'Serif' },
  { name: 'IBM Plex Serif', value: '"IBM Plex Serif"', category: 'Serif' },
  { name: 'Crete Round', value: '"Crete Round"', category: 'Serif' },
  { name: 'Neuton', value: '"Neuton"', category: 'Serif' },
  { name: 'Cormorant', value: '"Cormorant"', category: 'Serif' },
  { name: 'Crimson Pro', value: '"Crimson Pro"', category: 'Serif' },

  // Display (most popular first)
  { name: 'Oswald', value: '"Oswald"', category: 'Display' },
  { name: 'Raleway', value: '"Raleway"', category: 'Display' },
  { name: 'Bebas Neue', value: '"Bebas Neue"', category: 'Display' },
  { name: 'Abril Fatface', value: '"Abril Fatface"', category: 'Display' },
  { name: 'Anton', value: '"Anton"', category: 'Display' },
  { name: 'Pacifico', value: '"Pacifico"', category: 'Display' },
  { name: 'Permanent Marker', value: '"Permanent Marker"', category: 'Display' },
  { name: 'Righteous', value: '"Righteous"', category: 'Display' },
  { name: 'Lobster', value: '"Lobster"', category: 'Display' },
  { name: 'Satisfy', value: '"Satisfy"', category: 'Display' },
  { name: 'Alfa Slab One', value: '"Alfa Slab One"', category: 'Display' },
  { name: 'Passion One', value: '"Passion One"', category: 'Display' },
  { name: 'Comfortaa', value: '"Comfortaa"', category: 'Display' },
  { name: 'Staatliches', value: '"Staatliches"', category: 'Display' },
  { name: 'Bangers', value: '"Bangers"', category: 'Display' },
  { name: 'Russo One', value: '"Russo One"', category: 'Display' },
  { name: 'Monoton', value: '"Monoton"', category: 'Display' },
  { name: 'Bungee', value: '"Bungee"', category: 'Display' },
  { name: 'Titan One', value: '"Titan One"', category: 'Display' },
  { name: 'Black Ops One', value: '"Black Ops One"', category: 'Display' },
  { name: 'Fugaz One', value: '"Fugaz One"', category: 'Display' },
  { name: 'Fredoka', value: '"Fredoka"', category: 'Display' },
  { name: 'Lilita One', value: '"Lilita One"', category: 'Display' },
  { name: 'Secular One', value: '"Secular One"', category: 'Display' },
  { name: 'Big Shoulders Display', value: '"Big Shoulders Display"', category: 'Display' },

  // Handwriting (most popular first)
  { name: 'Dancing Script', value: '"Dancing Script"', category: 'Handwriting' },
  { name: 'Great Vibes', value: '"Great Vibes"', category: 'Handwriting' },
  { name: 'Caveat', value: '"Caveat"', category: 'Handwriting' },
  { name: 'Sacramento', value: '"Sacramento"', category: 'Handwriting' },
  { name: 'Kalam', value: '"Kalam"', category: 'Handwriting' },
  { name: 'Indie Flower', value: '"Indie Flower"', category: 'Handwriting' },
  { name: 'Patrick Hand', value: '"Patrick Hand"', category: 'Handwriting' },
  { name: 'Shadows Into Light', value: '"Shadows Into Light"', category: 'Handwriting' },
  { name: 'Courgette', value: '"Courgette"', category: 'Handwriting' },
  { name: 'Cookie', value: '"Cookie"', category: 'Handwriting' },
  { name: 'Allura', value: '"Allura"', category: 'Handwriting' },
  { name: 'Architects Daughter', value: '"Architects Daughter"', category: 'Handwriting' },
  { name: 'Handlee', value: '"Handlee"', category: 'Handwriting' },
  { name: 'Tangerine', value: '"Tangerine"', category: 'Handwriting' },
  { name: 'Gloria Hallelujah', value: '"Gloria Hallelujah"', category: 'Handwriting' },
  { name: 'Alex Brush', value: '"Alex Brush"', category: 'Handwriting' },
  { name: 'Parisienne', value: '"Parisienne"', category: 'Handwriting' },
  { name: 'Amatic SC', value: '"Amatic SC"', category: 'Handwriting' },
  { name: 'Kaushan Script', value: '"Kaushan Script"', category: 'Handwriting' },
  { name: 'Marck Script', value: '"Marck Script"', category: 'Handwriting' },

  // Monospace (most popular first)
  { name: 'Roboto Mono', value: '"Roboto Mono"', category: 'Monospace' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono"', category: 'Monospace' },
  { name: 'Fira Code', value: '"Fira Code"', category: 'Monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro"', category: 'Monospace' },
  { name: 'IBM Plex Mono', value: '"IBM Plex Mono"', category: 'Monospace' },
  { name: 'Space Mono', value: '"Space Mono"', category: 'Monospace' },
  { name: 'Inconsolata', value: '"Inconsolata"', category: 'Monospace' },
  { name: 'Ubuntu Mono', value: '"Ubuntu Mono"', category: 'Monospace' },
  { name: 'Cousine', value: '"Cousine"', category: 'Monospace' },
  { name: 'Anonymous Pro', value: '"Anonymous Pro"', category: 'Monospace' },
  { name: 'PT Mono', value: '"PT Mono"', category: 'Monospace' },
  { name: 'Red Hat Mono', value: '"Red Hat Mono"', category: 'Monospace' },
  { name: 'Overpass Mono', value: '"Overpass Mono"', category: 'Monospace' },
  { name: 'DM Mono', value: '"DM Mono"', category: 'Monospace' },
  { name: 'Martian Mono', value: '"Martian Mono"', category: 'Monospace' },
]

const fontCategories = ['Sans-Serif', 'Serif', 'Display', 'Handwriting', 'Monospace']

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>()

// Load a Google Font dynamically
function loadGoogleFont(fontName: string) {
  if (loadedFonts.has(fontName)) return
  loadedFonts.add(fontName)

  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// Preload all fonts at once using a single request (more efficient)
let allFontsLoaded = false
function loadAllGoogleFonts() {
  if (allFontsLoaded) return
  allFontsLoaded = true

  // Build a single URL with all font families
  const families = googleFonts.map(f => encodeURIComponent(f.name)).join('&family=')
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)

  // Mark all as loaded
  googleFonts.forEach(f => loadedFonts.add(f.name))
}

// Stable callbacks for filtering and grouping
const getFontSearchableFields = (item: FontItem) => [item.name, item.category]
const getFontCategory = (item: FontItem) => item.category

export const FontPicker = memo(function FontPicker({
  isOpen,
  onClose,
  onSelect,
  position,
}: FontPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
  } = usePickerWithSearch({
    isOpen,
    onClose,
    items: googleFonts,
    getSearchableFields: getFontSearchableFields,
    onSelectItem: handleFontSelect,
  })

  // Group by category with stable indices
  const { groupedItems } = useGroupedItems({
    items: filteredItems,
    getCategory: getFontCategory,
    categories: fontCategories,
  })

  // Load all fonts when picker opens
  useEffect(() => {
    if (isOpen) {
      loadAllGoogleFonts()
    }
  }, [isOpen])

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={340}
      maxHeight={420}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
          ]}
        />
      }
    >
      {/* Search Input */}
      <PickerSearch
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
        placeholder="Font suchen..."
      />

      {/* Font List */}
      <PickerList ref={(el) => {
        // Combine refs
        if (listRef) (listRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        if (scrollContainerRef) scrollContainerRef.current = el
      }}>
        {filteredItems.length === 0 ? (
          <EmptyState>Keine Fonts gefunden</EmptyState>
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
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    padding: '8px 10px',
                  }}
                >
                  {/* Font name label */}
                  <div
                    style={{
                      fontSize: '10px',
                      color: colors.textMuted,
                      fontFamily: 'system-ui, sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.name}
                  </div>
                  {/* Font preview - large, in the actual font */}
                  <div
                    style={{
                      fontSize: '20px',
                      color: colors.text,
                      fontFamily: item.value,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      lineHeight: 1.3,
                    }}
                  >
                    The quick brown fox
                  </div>
                </PickerItem>
              ))}
            </div>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
