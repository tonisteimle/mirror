/**
 * InlineFontPanel - Inline font picker that stays connected to the editor.
 *
 * Features:
 * - Focus remains in editor
 * - Typing filters fonts
 * - Font preview in actual typeface
 * - Category grouping
 * - Triggered after "font " in editor
 */
import { useMemo, useCallback, useEffect, useRef } from 'react'
import {
  InlinePanel,
  PanelList,
  PanelFooter,
} from './InlinePanel'
import { colors } from '../theme'

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
  { name: 'Poppins', value: '"Poppins"', category: 'Sans-Serif' },
  { name: 'Montserrat', value: '"Montserrat"', category: 'Sans-Serif' },
  { name: 'Lato', value: '"Lato"', category: 'Sans-Serif' },
  { name: 'Nunito', value: '"Nunito"', category: 'Sans-Serif' },
  { name: 'DM Sans', value: '"DM Sans"', category: 'Sans-Serif' },
  { name: 'Work Sans', value: '"Work Sans"', category: 'Sans-Serif' },
  { name: 'Outfit', value: '"Outfit"', category: 'Sans-Serif' },
  { name: 'Manrope', value: '"Manrope"', category: 'Sans-Serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk"', category: 'Sans-Serif' },
  { name: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans"', category: 'Sans-Serif' },
  { name: 'Figtree', value: '"Figtree"', category: 'Sans-Serif' },
  { name: 'Sora', value: '"Sora"', category: 'Sans-Serif' },
  // Serif
  { name: 'Playfair Display', value: '"Playfair Display"', category: 'Serif' },
  { name: 'Merriweather', value: '"Merriweather"', category: 'Serif' },
  { name: 'Lora', value: '"Lora"', category: 'Serif' },
  { name: 'Roboto Slab', value: '"Roboto Slab"', category: 'Serif' },
  { name: 'EB Garamond', value: '"EB Garamond"', category: 'Serif' },
  { name: 'Cormorant Garamond', value: '"Cormorant Garamond"', category: 'Serif' },
  { name: 'DM Serif Display', value: '"DM Serif Display"', category: 'Serif' },
  { name: 'Libre Baskerville', value: '"Libre Baskerville"', category: 'Serif' },
  // Display
  { name: 'Bebas Neue', value: '"Bebas Neue"', category: 'Display' },
  { name: 'Oswald', value: '"Oswald"', category: 'Display' },
  { name: 'Abril Fatface', value: '"Abril Fatface"', category: 'Display' },
  { name: 'Pacifico', value: '"Pacifico"', category: 'Display' },
  { name: 'Permanent Marker', value: '"Permanent Marker"', category: 'Display' },
  { name: 'Lobster', value: '"Lobster"', category: 'Display' },
  // Handwriting
  { name: 'Dancing Script', value: '"Dancing Script"', category: 'Handwriting' },
  { name: 'Caveat', value: '"Caveat"', category: 'Handwriting' },
  { name: 'Great Vibes', value: '"Great Vibes"', category: 'Handwriting' },
  { name: 'Satisfy', value: '"Satisfy"', category: 'Handwriting' },
  // Monospace
  { name: 'JetBrains Mono', value: '"JetBrains Mono"', category: 'Monospace' },
  { name: 'Fira Code', value: '"Fira Code"', category: 'Monospace' },
  { name: 'Roboto Mono', value: '"Roboto Mono"', category: 'Monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro"', category: 'Monospace' },
  { name: 'IBM Plex Mono', value: '"IBM Plex Mono"', category: 'Monospace' },
]

// Track loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>()

// Load all fonts at once using a single request
let allFontsLoaded = false
function loadAllGoogleFonts() {
  if (allFontsLoaded) return
  allFontsLoaded = true

  const families = googleFonts.map(f => encodeURIComponent(f.name)).join('&family=')
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)

  googleFonts.forEach(f => loadedFonts.add(f.name))
}

interface InlineFontPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (fontValue: string) => void
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void
}

const MAX_RESULTS = 20

/**
 * Search fonts by name and category.
 */
function searchFonts(query: string): FontItem[] {
  const q = query.toLowerCase()
  return googleFonts
    .filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    )
    .slice(0, MAX_RESULTS)
}

export function InlineFontPanel({
  isOpen,
  onClose,
  onSelect,
  position,
  filter,
  selectedIndex,
  onSelectedIndexChange,
  onSelectedValueChange,
}: InlineFontPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Load fonts when panel opens
  useEffect(() => {
    if (isOpen) {
      loadAllGoogleFonts()
    }
  }, [isOpen])

  // Filter fonts based on input
  const filteredFonts = useMemo(() => {
    const cleanFilter = filter.replace(/^["']/, '')
    if (cleanFilter && cleanFilter.length > 0) {
      return searchFonts(cleanFilter)
    }
    // Show all fonts when no filter (most popular first)
    return googleFonts.slice(0, MAX_RESULTS)
  }, [filter])

  // Compute selected value and report it (with trailing space for next property)
  const selectedValue = useMemo(() => {
    const font = filteredFonts[selectedIndex]
    return font ? font.value + ' ' : null
  }, [filteredFonts, selectedIndex])

  // Report selected value changes
  useEffect(() => {
    onSelectedValueChange?.(selectedValue)
  }, [selectedValue, onSelectedValueChange])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const items = listRef.current.querySelectorAll('[data-font-item]')
    const selectedItem = items[selectedIndex] as HTMLElement
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Handle font click - adds trailing space for next property
  const handleFontClick = useCallback((font: FontItem) => {
    onSelect(font.value + ' ')
    onClose()
  }, [onSelect, onClose])

  const selectedFont = filteredFonts[selectedIndex]

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={240}
      maxHeight={320}
    >
      <PanelList listRef={listRef}>
        {filteredFonts.length === 0 ? (
          <div style={{
            padding: '12px',
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: '11px',
          }}>
            Kein Font gefunden
          </div>
        ) : (
          <div style={{ padding: '4px' }}>
            {filteredFonts.map((font, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={font.name}
                  data-font-item
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleFontClick(font)
                  }}
                  onMouseEnter={() => onSelectedIndexChange(index)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? colors.lineActive : 'transparent',
                    borderRadius: '3px',
                    fontFamily: font.value,
                    fontSize: '15px',
                    color: colors.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {font.name}
                </div>
              )
            })}
          </div>
        )}
      </PanelList>

      {/* Preview for selected font */}
      {selectedFont && (
        <div style={{
          padding: '10px 12px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.lineActive,
        }}>
          <div style={{
            fontSize: '9px',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
          }}>
            {selectedFont.category}
          </div>
          <div style={{
            fontFamily: selectedFont.value,
            fontSize: '20px',
            color: colors.text,
            lineHeight: 1.3,
          }}>
            The quick brown fox
          </div>
        </div>
      )}

      <PanelFooter
        hints={[
          { key: '↑↓', label: 'nav' },
          { key: '↵', label: 'select' },
        ]}
      />
    </InlinePanel>
  )
}

