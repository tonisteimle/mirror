/**
 * InlineTypographyPanel - Typography picker for Mirror DSL
 *
 * Features:
 * - Font family selection
 * - Font weight presets
 * - Font size presets
 * - Line height presets
 * - Color picker (opens sub-panel)
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { ColorSystemPalette } from './ColorSystemPalette'
import { TokenSwatches } from './TokenSwatches'
import { TokenButtonRow } from './TokenButtonRow'
import { AlignLeft, AlignCenter, AlignRight, Scissors, ChevronDown } from 'lucide-react'
import { colors } from '../theme'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'
import { transformCode } from '../editor/shorthand-expansion'

// ============================================
// Token Mode Persistence
// ============================================

const STORAGE_KEY = 'mirror-panel-token-mode'

function getStoredTokenMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function setStoredTokenMode(mode: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, mode ? 'true' : 'false')
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// Types
// ============================================

interface TypographyState {
  font: string
  weight: number
  size: number | string  // Can be number or token like "$m"
  line: number
  color: string
  align: 'left' | 'center' | 'right' | ''
  truncate: boolean
  // UI state
  showColorPicker: boolean
  showFontPicker: boolean
  useTokenMode: boolean
}

interface InlineTypographyPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string) => void
  onCodeChange?: (code: string) => void
  position: { x: number; y: number }
  initialCode?: string
  /** Full editor code for extracting defined tokens */
  editorCode?: string
  /** Show tabs to switch between panels */
  showTabs?: boolean
  /** Called when user wants to switch to a different panel */
  onSwitchPanel?: (panel: PanelTabId) => void
  /** Which tabs to show (defaults to layout, font, border) */
  availableTabs?: PanelTabId[]
  /** Token mode from project settings (if provided, overrides localStorage) */
  useTokenMode?: boolean
  /** Callback when token mode changes (if provided, updates project settings) */
  onTokenModeChange?: (mode: boolean) => void
  /** If true, panel is embedded in sidebar (no absolute positioning) */
  embedded?: boolean
  /** If true, output long form (e.g., "color"); if false, output short form (e.g., "col") */
  toLongForm?: boolean
}

// ============================================
// Constants
// ============================================

const COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  buttonBgHover: '#2a2a2a',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
  border: '#333',
}

const WEIGHTS = [300, 400, 500, 600, 700]
const SIZES = [12, 14, 16, 18, 24, 32]
const LINE_HEIGHTS = [1.0, 1.2, 1.4, 1.5, 1.8]

// Google Fonts - comprehensive list organized by category
const FONTS = [
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
  { name: 'Raleway', value: '"Raleway"', category: 'Sans-Serif' },
  { name: 'Quicksand', value: '"Quicksand"', category: 'Sans-Serif' },
  { name: 'Mulish', value: '"Mulish"', category: 'Sans-Serif' },
  { name: 'Barlow', value: '"Barlow"', category: 'Sans-Serif' },
  { name: 'Rubik', value: '"Rubik"', category: 'Sans-Serif' },
  { name: 'Karla', value: '"Karla"', category: 'Sans-Serif' },
  { name: 'Lexend', value: '"Lexend"', category: 'Sans-Serif' },
  { name: 'Ubuntu', value: '"Ubuntu"', category: 'Sans-Serif' },
  { name: 'Cabin', value: '"Cabin"', category: 'Sans-Serif' },
  { name: 'Josefin Sans', value: '"Josefin Sans"', category: 'Sans-Serif' },
  // Serif
  { name: 'Playfair Display', value: '"Playfair Display"', category: 'Serif' },
  { name: 'Merriweather', value: '"Merriweather"', category: 'Serif' },
  { name: 'Lora', value: '"Lora"', category: 'Serif' },
  { name: 'Roboto Slab', value: '"Roboto Slab"', category: 'Serif' },
  { name: 'EB Garamond', value: '"EB Garamond"', category: 'Serif' },
  { name: 'Cormorant Garamond', value: '"Cormorant Garamond"', category: 'Serif' },
  { name: 'DM Serif Display', value: '"DM Serif Display"', category: 'Serif' },
  { name: 'Libre Baskerville', value: '"Libre Baskerville"', category: 'Serif' },
  { name: 'Source Serif Pro', value: '"Source Serif Pro"', category: 'Serif' },
  { name: 'Crimson Text', value: '"Crimson Text"', category: 'Serif' },
  { name: 'Bitter', value: '"Bitter"', category: 'Serif' },
  { name: 'Arvo', value: '"Arvo"', category: 'Serif' },
  { name: 'Zilla Slab', value: '"Zilla Slab"', category: 'Serif' },
  // Display
  { name: 'Bebas Neue', value: '"Bebas Neue"', category: 'Display' },
  { name: 'Oswald', value: '"Oswald"', category: 'Display' },
  { name: 'Abril Fatface', value: '"Abril Fatface"', category: 'Display' },
  { name: 'Pacifico', value: '"Pacifico"', category: 'Display' },
  { name: 'Permanent Marker', value: '"Permanent Marker"', category: 'Display' },
  { name: 'Lobster', value: '"Lobster"', category: 'Display' },
  { name: 'Righteous', value: '"Righteous"', category: 'Display' },
  { name: 'Alfa Slab One', value: '"Alfa Slab One"', category: 'Display' },
  { name: 'Fredoka One', value: '"Fredoka One"', category: 'Display' },
  { name: 'Bangers', value: '"Bangers"', category: 'Display' },
  // Handwriting
  { name: 'Dancing Script', value: '"Dancing Script"', category: 'Handwriting' },
  { name: 'Caveat', value: '"Caveat"', category: 'Handwriting' },
  { name: 'Great Vibes', value: '"Great Vibes"', category: 'Handwriting' },
  { name: 'Satisfy', value: '"Satisfy"', category: 'Handwriting' },
  { name: 'Kalam', value: '"Kalam"', category: 'Handwriting' },
  { name: 'Indie Flower', value: '"Indie Flower"', category: 'Handwriting' },
  { name: 'Shadows Into Light', value: '"Shadows Into Light"', category: 'Handwriting' },
  // Monospace
  { name: 'JetBrains Mono', value: '"JetBrains Mono"', category: 'Monospace' },
  { name: 'Fira Code', value: '"Fira Code"', category: 'Monospace' },
  { name: 'Roboto Mono', value: '"Roboto Mono"', category: 'Monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro"', category: 'Monospace' },
  { name: 'IBM Plex Mono', value: '"IBM Plex Mono"', category: 'Monospace' },
  { name: 'Space Mono', value: '"Space Mono"', category: 'Monospace' },
  { name: 'Inconsolata', value: '"Inconsolata"', category: 'Monospace' },
]

// Load Google Fonts
let fontsLoaded = false
function loadGoogleFonts() {
  if (fontsLoaded) return
  fontsLoaded = true
  const families = FONTS.map(f => encodeURIComponent(f.name)).join('&family=')
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// ============================================
// Code Generation
// ============================================

function generateTypographyCode(state: TypographyState): string {
  const parts: string[] = []

  // ============================================
  // Property Order: Size → Weight → Font → Line → Align → Style → Color
  // ============================================

  // 1. Size (most important, comes first) - can be number or token
  // Only output if explicitly set (> 0 or token)
  if (state.size) {
    if (typeof state.size === 'string' && state.size.startsWith('$')) {
      parts.push(`size ${state.size}`)
    } else if (typeof state.size === 'number' && state.size > 0) {
      parts.push(`size ${state.size}`)
    }
  }

  // 2. Weight (boldness) - only output if explicitly set (> 0)
  if (state.weight && state.weight > 0) {
    parts.push(`weight ${state.weight}`)
  }

  // 3. Font family
  if (state.font) {
    parts.push(`font ${state.font}`)
  }

  // 4. Line height - only output if explicitly set (> 0)
  if (state.line && state.line > 0) {
    parts.push(`line ${state.line}`)
  }

  // 5. Alignment
  if (state.align) {
    parts.push(`text-align ${state.align}`)
  }

  // 6. Truncate (style modifier)
  if (state.truncate) {
    parts.push('truncate')
  }

  // 7. Color (visual, comes last)
  if (state.color) {
    parts.push(`col ${state.color}`)
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseTypographyCode(code: string): Partial<TypographyState> {
  const state: Partial<TypographyState> = {}
  if (!code) return state

  // Font (quoted string after font keyword)
  const fontMatch = code.match(/font\s+"([^"]+)"/)
  if (fontMatch) state.font = `"${fontMatch[1]}"`

  // Weight
  const weightMatch = code.match(/weight\s+(\d+)/)
  if (weightMatch) state.weight = parseInt(weightMatch[1], 10)

  // Size (support text-size, ts, fs, font-size, size for backwards compatibility)
  // Can be number or token reference
  const sizeTokenMatch = code.match(/(?:text-size|font-size|ts|fs|size)\s+(\$[\w.-]+)/)
  if (sizeTokenMatch) {
    state.size = sizeTokenMatch[1]
  } else {
    const sizeMatch = code.match(/(?:text-size|font-size|ts|fs|size)\s+(\d+)/)
    if (sizeMatch) state.size = parseInt(sizeMatch[1], 10)
  }

  // Line height
  const lineMatch = code.match(/line\s+([\d.]+)/)
  if (lineMatch) state.line = parseFloat(lineMatch[1])

  // Alignment (support both text-align and align for backwards compatibility)
  const alignMatch = code.match(/(?:text-align|align)\s+(left|center|right)/)
  if (alignMatch) state.align = alignMatch[1] as 'left' | 'center' | 'right'

  // Truncate
  if (/\btruncate\b/.test(code)) {
    state.truncate = true
  }

  // Color
  const colMatch = code.match(/col(?:or)?\s+(#[0-9a-fA-F]{3,8}|\w+)/)
  if (colMatch) state.color = colMatch[1]

  return state
}

// ============================================
// UI Components
// ============================================

function SectionLabel({ children, indent }: { children: React.ReactNode; indent?: boolean }) {
  return (
    <div style={{
      fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.label,
      marginBottom: '4px',
      marginLeft: indent ? '24px' : 0,
    }}>
      {children}
    </div>
  )
}

function PresetButton({
  value,
  selected,
  onClick,
  width = 24,
}: {
  value: number | string
  selected: boolean
  onClick: () => void
  width?: number
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      style={{
        minWidth: `${width}px`,
        height: '24px',
        padding: '0 5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: selected ? COLORS.textLight : COLORS.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {value}
    </button>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  width = 40,
  presets = [],
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  width?: number
  presets?: number[]  // When value matches a preset, show empty and not highlighted
}) {
  // Only show value and highlight if it's a custom value (not matching any preset)
  const isPresetValue = presets.includes(value)
  const showValue = !isPresetValue && value > 0
  return (
    <input
      type="text"
      value={showValue ? value : ''}
      placeholder={placeholder}
      onChange={(e) => {
        const num = parseFloat(e.target.value)
        onChange(isNaN(num) ? 0 : num)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: `${width}px`,
        height: '24px',
        padding: '0 5px',
        backgroundColor: showValue ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: COLORS.textLight,
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      }}
    />
  )
}

function ColorButton({
  color,
  onClick,
}: {
  color: string
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      style={{
        width: '80px',
        height: '24px',
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: COLORS.buttonBg,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          backgroundColor: color || 'transparent',
          border: color ? 'none' : `1px dashed ${COLORS.label}`,
        }}
      />
      <span style={{
        color: color ? COLORS.textLight : COLORS.text,
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {color || 'Keine'}
      </span>
    </button>
  )
}

function MiniColorPicker({
  color,
  onChange,
  onClose,
  triggerRef,
}: {
  color: string
  onChange: (color: string) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Calculate position based on trigger element
  useEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Position below the trigger
    setPosition({
      top: rect.bottom + 8, // 8px gap below
      left: rect.left,
    })
  }, [triggerRef])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const content = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '12px' }}>
        <ColorSystemPalette
          color={color || '#FFFFFF'}
          onChange={(c) => onChange(c.toUpperCase())}
        />
      </div>
      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
        color: COLORS.text,
      }}>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: COLORS.text,
          }}
        >
          <span style={{ fontWeight: 500, color: '#ccc' }}>↵</span> Einfügen
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: COLORS.text,
          }}
        >
          <span style={{ fontWeight: 500, color: '#ccc' }}>Esc</span> Schließen
        </button>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function MiniFontPicker({
  font,
  onChange,
  onClose,
}: {
  font: string
  onChange: (font: string) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load fonts on mount
  useEffect(() => {
    loadGoogleFonts()
  }, [])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Filter fonts
  const filteredFonts = useMemo(() => {
    if (!filter) return FONTS
    const q = filter.toLowerCase()
    return FONTS.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    )
  }, [filter])

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const items = listRef.current.querySelectorAll('[data-font-item]')
    const selectedItem = items[selectedIndex] as HTMLElement
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleSelect = useCallback((fontValue: string) => {
    onChange(fontValue)
    onClose()
  }, [onChange, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filteredFonts.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedFont = filteredFonts[selectedIndex]
      if (selectedFont) {
        handleSelect(selectedFont.value)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [filteredFonts, selectedIndex, handleSelect, onClose])

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: COLORS.bg,
        border: `1px solid ${COLORS.label}`,
        borderRadius: '4px',
        zIndex: 20,
        overflow: 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search input */}
      <div style={{ padding: '6px' }}>
        <input
          ref={inputRef}
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Font suchen..."
          style={{
            width: '100%',
            height: '24px',
            padding: '0 6px',
            backgroundColor: COLORS.buttonBg,
            color: COLORS.textLight,
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'system-ui, sans-serif',
            outline: 'none',
          }}
        />
      </div>

      {/* Font list */}
      <div
        ref={listRef}
        style={{
          maxHeight: '160px',
          overflowY: 'auto',
          padding: '0 4px 4px',
        }}
      >
        {filteredFonts.length === 0 ? (
          <div style={{
            padding: '8px',
            textAlign: 'center',
            color: COLORS.text,
            fontSize: '11px',
          }}>
            Kein Font gefunden
          </div>
        ) : (
          filteredFonts.map((f, index) => {
            const isSelected = index === selectedIndex
            return (
              <div
                key={f.name}
                data-font-item
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(f.value)
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '4px 6px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? COLORS.buttonBgSelected : 'transparent',
                  borderRadius: '4px',
                  fontFamily: f.value,
                  fontSize: '12px',
                  color: COLORS.textLight,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {f.name}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

const defaultState: TypographyState = {
  font: '',
  weight: 0,  // 0 = not set, shows no preset selected
  size: 0,    // 0 = not set, shows no preset selected
  line: 0,    // 0 = not set, shows no preset selected
  color: '',
  align: '',
  truncate: false,
  showColorPicker: false,
  showFontPicker: false,
  useTokenMode: getStoredTokenMode(),
}

export function InlineTypographyPanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  initialCode,
  editorCode,
  showTabs,
  onSwitchPanel,
  availableTabs,
  useTokenMode: useTokenModeProp,
  onTokenModeChange,
  toLongForm = true,
}: InlineTypographyPanelProps) {
  const [state, setState] = useState<TypographyState>(defaultState)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)
  // Ref for color picker positioning
  const colorButtonRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isOpen) {
      hasUserInteractedRef.current = false
      pendingSyncRef.current = false
      const parsed = parseTypographyCode(initialCode || '')
      // Use prop if provided, otherwise fall back to localStorage
      const tokenMode = useTokenModeProp !== undefined ? useTokenModeProp : getStoredTokenMode()
      setState({ ...defaultState, ...parsed, useTokenMode: tokenMode })
      // Pre-load fonts
      loadGoogleFonts()
    }
  }, [isOpen, initialCode, useTokenModeProp])

  // Sync token mode with prop when it changes externally
  useEffect(() => {
    if (useTokenModeProp !== undefined && state.useTokenMode !== useTokenModeProp) {
      setState(prev => ({ ...prev, useTokenMode: useTokenModeProp }))
    }
  }, [useTokenModeProp])

  // Sync to editor after user interaction
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange) {
      pendingSyncRef.current = false
      const code = generateTypographyCode(state)
      // Transform to long/short form based on editor mode
      const transformedCode = transformCode(code, toLongForm)
      onCodeChange(transformedCode)
    }
  }, [state, onCodeChange, toLongForm])

  const updateState = useCallback((updater: (prev: TypographyState) => TypographyState) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setState(updater)
  }, [])

  const handleSubmit = useCallback(() => {
    const code = generateTypographyCode(state)
    // Transform to long/short form based on editor mode
    const transformedCode = transformCode(code, toLongForm)
    onSelect(transformedCode)
    onClose()
  }, [state, onSelect, onClose, toLongForm])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !state.showColorPicker && !state.showFontPicker) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (state.showColorPicker) {
        setState(prev => ({ ...prev, showColorPicker: false }))
      } else if (state.showFontPicker) {
        setState(prev => ({ ...prev, showFontPicker: false }))
      } else {
        onClose()
      }
    }
  }, [handleSubmit, onClose, state.showColorPicker, state.showFontPicker])

  // Get display name for current font
  const fontDisplayName = useMemo(() => {
    if (!state.font) return 'Wählen...'
    // Remove quotes and return name
    const name = state.font.replace(/"/g, '')
    return name
  }, [state.font])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={360}
      maxHeight={400}
      testId="panel-typography-picker"
    >
      {/* Tabs header when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader
          activeTab="font"
          onSwitchPanel={onSwitchPanel}
          availableTabs={availableTabs}
          useTokenMode={state.useTokenMode}
          onTokenModeChange={(mode) => {
            updateState(s => ({ ...s, useTokenMode: mode }))
            // Notify parent if callback provided (saves to project)
            onTokenModeChange?.(mode)
          }}
        />
      )}
      <div
        style={{ padding: showTabs ? '8px 16px 16px 16px' : '16px', flex: 1 }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Two column layout - 60/40 split for better button fit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
          {/* Left Column */}
          <div>
            {/* Font */}
            <div style={{ position: 'relative' }}>
              <SectionLabel>Font</SectionLabel>
              {state.useTokenMode && editorCode ? (
                <TokenButtonRow
                  code={editorCode}
                  property="font"
                  value={state.font}
                  onSelect={(token) => updateState(s => ({ ...s, font: token }))}
                  maxTokens={4}
                />
              ) : (
                <>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setState(s => ({ ...s, showFontPicker: !s.showFontPicker, showColorPicker: false }))
                    }}
                    style={{
                      width: '100%',
                      height: '28px',
                      padding: '0 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: COLORS.buttonBg,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontFamily: state.font || 'system-ui, sans-serif',
                      fontSize: '11px',
                      color: state.font ? COLORS.textLight : COLORS.text,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fontDisplayName}</span>
                    <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                  </button>
                  {state.showFontPicker && (
                    <MiniFontPicker
                      font={state.font}
                      onChange={(f) => updateState(s => ({ ...s, font: f }))}
                      onClose={() => setState(s => ({ ...s, showFontPicker: false }))}
                    />
                  )}
                </>
              )}
            </div>

            {/* Weight */}
            <div style={{ marginTop: '16px' }}>
              <SectionLabel>Weight</SectionLabel>
              <div style={{ display: 'flex', gap: '3px' }}>
                {WEIGHTS.map((w) => (
                  <PresetButton
                    key={w}
                    value={w}
                    selected={state.weight === w}
                    onClick={() => updateState(s => ({ ...s, weight: w }))}
                    width={26}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            <div style={{ marginTop: '16px' }}>
              <SectionLabel>Size</SectionLabel>
              {state.useTokenMode && editorCode ? (
                <TokenButtonRow
                  code={editorCode}
                  property="size"
                  value={state.size}
                  onSelect={(token) => updateState(s => ({ ...s, size: token }))}
                  maxTokens={5}
                />
              ) : (
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  {SIZES.slice(0, 4).map((s) => (
                    <PresetButton
                      key={s}
                      value={s}
                      selected={state.size === s}
                      onClick={() => updateState(st => ({ ...st, size: s }))}
                    />
                  ))}
                  <NumberInput
                    value={typeof state.size === 'number' ? state.size : 0}
                    onChange={(v) => updateState(s => ({ ...s, size: v }))}
                    width={36}
                    presets={SIZES.slice(0, 4)}
                  />
                </div>
              )}
            </div>

            {/* Line Height */}
            <div style={{ marginTop: '16px' }}>
              <SectionLabel>Line</SectionLabel>
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                {LINE_HEIGHTS.slice(0, 4).map((l) => (
                  <PresetButton
                    key={l}
                    value={l}
                    selected={state.line === l}
                    onClick={() => updateState(s => ({ ...s, line: l }))}
                    width={26}
                  />
                ))}
                <NumberInput
                  value={state.line}
                  onChange={(v) => updateState(s => ({ ...s, line: v }))}
                  width={36}
                  presets={LINE_HEIGHTS.slice(0, 4)}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Alignment */}
            <div>
              <SectionLabel>Align</SectionLabel>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); updateState(s => ({ ...s, align: s.align === 'left' ? '' : 'left' })) }}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: state.align === 'left' ? COLORS.buttonBgSelected : COLORS.buttonBg,
                    color: state.align === 'left' ? COLORS.textLight : COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); updateState(s => ({ ...s, align: s.align === 'center' ? '' : 'center' })) }}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: state.align === 'center' ? COLORS.buttonBgSelected : COLORS.buttonBg,
                    color: state.align === 'center' ? COLORS.textLight : COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); updateState(s => ({ ...s, align: s.align === 'right' ? '' : 'right' })) }}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: state.align === 'right' ? COLORS.buttonBgSelected : COLORS.buttonBg,
                    color: state.align === 'right' ? COLORS.textLight : COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <AlignRight size={14} />
                </button>
              </div>
            </div>

            {/* Truncate */}
            <div style={{ marginTop: '20px' }}>
              <SectionLabel>Truncate</SectionLabel>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); updateState(s => ({ ...s, truncate: false })) }}
                  style={{
                    minWidth: '28px',
                    height: '24px',
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: !state.truncate ? COLORS.buttonBgSelected : COLORS.buttonBg,
                    color: !state.truncate ? COLORS.textLight : COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Off
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); updateState(s => ({ ...s, truncate: true })) }}
                  style={{
                    minWidth: '28px',
                    height: '24px',
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    backgroundColor: state.truncate ? COLORS.buttonBgSelected : COLORS.buttonBg,
                    color: state.truncate ? COLORS.textLight : COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  <Scissors size={10} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Color - full width with inline swatches */}
        <div style={{ marginTop: '16px' }}>
          <SectionLabel>Color</SectionLabel>
          {state.useTokenMode && editorCode ? (
            /* Token mode: only show token swatches */
            <TokenSwatches
              code={editorCode}
              onSelect={(tokenName) => updateState(s => ({ ...s, color: tokenName }))}
              selectedValue={state.color}
            />
          ) : (
            /* Normal mode: only color button */
            <div ref={colorButtonRef as React.RefObject<HTMLDivElement>}>
              <ColorButton
                color={state.color}
                onClick={() => setState(s => ({ ...s, showColorPicker: !s.showColorPicker, showFontPicker: false }))}
              />
            </div>
          )}
          {state.showColorPicker && !state.useTokenMode && (
            <MiniColorPicker
              color={state.color}
              onChange={(c) => updateState(s => ({ ...s, color: c }))}
              onClose={() => setState(s => ({ ...s, showColorPicker: false }))}
              triggerRef={colorButtonRef}
            />
          )}
        </div>
      </div>

      <PanelFooter
        hints={[
          { label: 'Abbrechen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />
    </InlinePanel>
  )
}
