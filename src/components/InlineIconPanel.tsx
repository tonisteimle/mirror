/**
 * InlineIconPanel - Inline icon picker that stays connected to the editor.
 *
 * Features:
 * - Focus remains in editor
 * - Typing filters icons (with synonym support)
 * - Grid layout with categories
 * - Mouse clicks work without stealing focus
 * - Triggered after "icon " in editor
 * - Supports Lucide and Material icon libraries
 * - Icon size, weight, and color options (always visible)
 */
import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as LucideIcons from 'lucide-react'
import {
  InlinePanel,
  PanelList,
  PanelFooter,
} from './InlinePanel'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'
import { TailwindColorPalette } from './TailwindColorPalette'
import { TokenSwatches } from './TokenSwatches'
import { TokenButtonRow } from './TokenButtonRow'
import { colors } from '../theme'
import { searchIcons } from '../data/icon-synonyms'
import { MATERIAL_ICONS, searchMaterialIcons } from '../data/material-icons'
import type { IconLibrary } from '../hooks/useInlinePanel'

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

// Colors matching InlineLayoutPanel for consistent appearance
const PANEL_COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
}

// Weight presets with labels
const WEIGHT_PRESETS = [
  { value: 100, label: 'Thin' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 700, label: 'Bold' },
]

// Size presets
const SIZE_PRESETS = [16, 20, 24, 32, 48]

// Get all icon names from Lucide
// Filter: PascalCase names, exclude "Icon" suffix duplicates, exclude utilities
const allLucideIconNames = Object.keys(LucideIcons).filter(
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

// Convert PascalCase to kebab-case for DSL (Lucide icons)
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

interface InlineIconPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconValue: string) => void
  /** Called when values change for live sync to editor */
  onCodeChange?: (code: string) => void
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void
  iconLibrary: IconLibrary
  onLibraryChange: (library: IconLibrary) => void
  /** Full editor code for extracting defined tokens */
  editorCode?: string
  /** Show tabs to switch between panels */
  showTabs?: boolean
  /** Called when user wants to switch to a different panel */
  onSwitchPanel?: (panel: PanelTabId) => void
  /** Which tabs to show (defaults to just icon) */
  availableTabs?: PanelTabId[]
}

const GRID_COLUMNS = 10

export function InlineIconPanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  filter,
  selectedIndex,
  onSelectedIndexChange,
  onSelectedValueChange,
  iconLibrary,
  onLibraryChange,
  editorCode,
  showTabs,
  onSwitchPanel,
  availableTabs,
}: InlineIconPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)

  // Token mode state (shared with other panels via localStorage)
  const [useTokenMode, setUseTokenMode] = useState(getStoredTokenMode)

  // Icon options state
  const [iconSize, setIconSize] = useState<number | string | null>(null)  // null = default (24), can be token like "$s"
  const [iconWeight, setIconWeight] = useState<number | null>(null)  // null = default (400)
  const [iconColor, setIconColor] = useState<string | null>(null)  // null = default
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Reset options when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIconSize(null)
      setIconWeight(null)
      setIconColor(null)
      setShowColorPicker(false)
      hasUserInteractedRef.current = false
    }
  }, [isOpen])

  // Filter icons based on input with synonym support (library-specific)
  const filteredIcons = useMemo(() => {
    // Remove leading quote if present (user might type icon "ch)
    const cleanFilter = filter ? filter.replace(/^["']/, '') : ''

    if (iconLibrary === 'material') {
      // Material Icons (snake_case)
      return cleanFilter ? searchMaterialIcons(cleanFilter) : MATERIAL_ICONS
    } else {
      // Lucide Icons (PascalCase)
      return cleanFilter
        ? searchIcons(allLucideIconNames, cleanFilter)
        : allLucideIconNames.sort()
    }
  }, [filter, iconLibrary])

  // Build icon value string with options
  // Order: Name → Library → Size → Weight → Color
  const buildIconValue = useCallback((iconName: string) => {
    const parts: string[] = []

    // 1. Icon name
    if (iconLibrary === 'material') {
      parts.push(`"${iconName}"`)
      parts.push('material')
    } else {
      parts.push(`"${toKebabCase(iconName)}"`)
    }

    // 2. Size (is) - can be number or token
    if (iconSize !== null) {
      if (typeof iconSize === 'string' && iconSize.startsWith('$')) {
        parts.push(`is ${iconSize}`)
      } else if (typeof iconSize === 'number' && iconSize !== 24) {
        parts.push(`is ${iconSize}`)
      }
    }

    // 3. Weight (iw)
    if (iconWeight !== null && iconWeight !== 400) {
      parts.push(`iw ${iconWeight}`)
    }

    // 4. Color (ic)
    if (iconColor !== null) {
      parts.push(`ic ${iconColor}`)
    }

    return parts.join(', ')
  }, [iconLibrary, iconSize, iconWeight, iconColor])

  // Compute selected value and report it (library-specific format)
  const selectedValue = useMemo(() => {
    const icon = filteredIcons[selectedIndex]
    if (!icon) return null
    return buildIconValue(icon)
  }, [filteredIcons, selectedIndex, buildIconValue])

  // Report selected value changes
  useEffect(() => {
    onSelectedValueChange?.(selectedValue)
  }, [selectedValue, onSelectedValueChange])

  // Live sync to editor after user interaction
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange && selectedValue) {
      pendingSyncRef.current = false
      onCodeChange(selectedValue)
    }
  }, [selectedValue, onCodeChange])

  // Wrapper functions to track user interaction and trigger sync
  const handleSizeChange = useCallback((size: number | string | null) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setIconSize(size)
  }, [])

  const handleWeightChange = useCallback((weight: number | null) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setIconWeight(weight)
  }, [])

  const handleColorChange = useCallback((color: string | null) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setIconColor(color)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const row = Math.floor(selectedIndex / GRID_COLUMNS)
    const rowElement = listRef.current.children[row] as HTMLElement
    if (rowElement) {
      rowElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Handle icon click - just select, don't close (user can adjust options first)
  const handleIconClick = useCallback((iconName: string, index: number) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    onSelectedIndexChange(index)
  }, [onSelectedIndexChange])

  // Handle submit (Enter or button click)
  const handleSubmit = useCallback(() => {
    const icon = filteredIcons[selectedIndex]
    if (icon) {
      onSelect(buildIconValue(icon))
      onClose()
    }
  }, [filteredIcons, selectedIndex, buildIconValue, onSelect, onClose])

  // Group icons into rows for grid layout
  const iconRows = useMemo(() => {
    const rows: string[][] = []
    for (let i = 0; i < filteredIcons.length; i += GRID_COLUMNS) {
      rows.push(filteredIcons.slice(i, i + GRID_COLUMNS))
    }
    return rows
  }, [filteredIcons])

  // Muted color for grid icons (not the selected one)
  const GRID_ICON_COLOR = '#888'

  // Render a single icon based on library (for grid, uses muted styling)
  const renderIconPreview = useCallback((iconName: string, size: number = 18) => {
    if (iconLibrary === 'material') {
      // Material Icons: Font-based
      return (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: size,
            color: GRID_ICON_COLOR,
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
          }}
        >
          {iconName}
        </span>
      )
    } else {
      // Lucide Icons: React Component
      const IconComponent = (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
        >
      )[iconName]
      return IconComponent ? <IconComponent size={size} color={GRID_ICON_COLOR} /> : null
    }
  }, [iconLibrary])

  // Default icon color (white) - what icons look like in the preview
  const DEFAULT_ICON_COLOR = '#FFFFFF'

  // Render icon with current options (for large preview)
  const renderIconWithOptions = useCallback((iconName: string) => {
    // For preview, use numeric size or default 24 (tokens show as 24)
    const size = typeof iconSize === 'number' ? iconSize : 24
    const weight = iconWeight ?? 400
    const color = iconColor ?? DEFAULT_ICON_COLOR

    if (iconLibrary === 'material') {
      return (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: size,
            color,
            fontVariationSettings: `'FILL' 0, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
          }}
        >
          {iconName}
        </span>
      )
    } else {
      // Map weight 100-700 to strokeWidth 0.75-3.0
      const strokeWidth = 0.75 + ((weight - 100) / 600) * 2.25
      const IconComponent = (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
        >
      )[iconName]
      return IconComponent ? (
        <IconComponent size={size} color={color} strokeWidth={strokeWidth} />
      ) : null
    }
  }, [iconLibrary, iconSize, iconWeight, iconColor])

  // Get display name for icon (kebab-case for Lucide, snake_case for Material)
  const getDisplayName = useCallback((iconName: string) => {
    return iconLibrary === 'material' ? iconName : toKebabCase(iconName)
  }, [iconLibrary])

  // Library tabs for PanelHeader
  const libraryTabs = useMemo(() => [
    { id: 'lucide', label: 'Lucide' },
    { id: 'material', label: 'Material' },
  ], [])

  const handleTabChange = useCallback((id: string) => {
    onLibraryChange(id as IconLibrary)
  }, [onLibraryChange])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={440}
      maxHeight={400}
      testId="panel-icon-picker"
    >
      {/* Panel Tab Header (Icon tab) when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader
          activeTab="icon"
          onSwitchPanel={onSwitchPanel}
          availableTabs={availableTabs}
          useTokenMode={useTokenMode}
          onTokenModeChange={(mode) => {
            setStoredTokenMode(mode)
            setUseTokenMode(mode)
          }}
        />
      )}
      {/* Library Tabs */}
      <div style={{
        display: 'flex',
        padding: '4px',
        gap: '2px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {libraryTabs.map(tab => (
          <button
            key={tab.id}
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              handleTabChange(tab.id)
            }}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 500,
              fontFamily: 'system-ui, sans-serif',
              backgroundColor: iconLibrary === tab.id ? colors.lineActive : 'transparent',
              color: iconLibrary === tab.id ? colors.text : colors.textMuted,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          <div style={{ padding: '4px' }}>
            {iconRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                style={{
                  display: 'flex',
                  gap: '2px',
                  marginBottom: '2px',
                }}
              >
                {row.map((iconName, colIndex) => {
                  const flatIndex = rowIndex * GRID_COLUMNS + colIndex
                  const isSelected = flatIndex === selectedIndex

                  return (
                    <div
                      key={iconName}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleIconClick(iconName, flatIndex)
                      }}
                      title={getDisplayName(iconName)}
                      style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {renderIconPreview(iconName)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </PanelList>

      {/* Options Panel - Compact layout */}
      <div style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '12px',
        backgroundColor: PANEL_COLORS.bg,
      }}>
        {/* Row 1: Size + Weight + Icon Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          {/* Size buttons - token mode or numeric presets */}
          {useTokenMode && editorCode ? (
            <TokenButtonRow
              code={editorCode}
              property="is"
              value={iconSize ?? 24}
              onSelect={(token) => handleSizeChange(token)}
              maxTokens={3}
            />
          ) : (
            <div style={{ display: 'flex', gap: '3px' }}>
              {SIZE_PRESETS.map(size => (
                <button
                  key={size}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSizeChange(size === 24 ? null : size)
                  }}
                  style={{
                    minWidth: '24px',
                    height: '24px',
                    padding: '0 5px',
                    fontSize: '11px',
                    fontFamily: 'system-ui, sans-serif',
                    backgroundColor: (typeof iconSize === 'number' ? iconSize : 24) === size ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
                    color: (typeof iconSize === 'number' ? iconSize : 24) === size ? PANEL_COLORS.textLight : PANEL_COLORS.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
          {/* Weight buttons */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {WEIGHT_PRESETS.map(({ value, label }) => (
              <button
                key={value}
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleWeightChange(value === 400 ? null : value)
                }}
                style={{
                  height: '24px',
                  padding: '0 6px',
                  fontSize: '11px',
                  fontFamily: 'system-ui, sans-serif',
                  backgroundColor: (iconWeight ?? 400) === value ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
                  color: (iconWeight ?? 400) === value ? PANEL_COLORS.textLight : PANEL_COLORS.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title={`${value}`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Icon preview */}
          {filteredIcons[selectedIndex] && (
            <div style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: PANEL_COLORS.buttonBg,
              borderRadius: '4px',
              flexShrink: 0,
            }}>
              {renderIconWithOptions(filteredIcons[selectedIndex])}
            </div>
          )}
        </div>

        {/* Row 2: Color - horizontal with inline swatches */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          {/* Color button */}
          <button
            ref={colorButtonRef}
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowColorPicker(!showColorPicker)
            }}
            style={{
              width: '80px',
              height: '24px',
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: PANEL_COLORS.buttonBg,
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
                backgroundColor: iconColor || 'transparent',
                border: iconColor ? 'none' : '1px dashed #666',
              }}
            />
            <span style={{
              color: iconColor ? PANEL_COLORS.textLight : PANEL_COLORS.text,
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {iconColor ? iconColor.replace('#', '') : 'Auto'}
            </span>
          </button>
          {/* Token Swatches inline */}
          {editorCode && (
            <TokenSwatches
              code={editorCode}
              onSelect={(tokenName) => handleColorChange(tokenName)}
              selectedValue={iconColor ?? undefined}
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

      {/* Color Picker Popup */}
      {showColorPicker && colorButtonRef.current && createPortal(
        <IconColorPicker
          color={iconColor || ''}
          onChange={handleColorChange}
          onClose={() => setShowColorPicker(false)}
          triggerRef={colorButtonRef}
        />,
        document.body
      )}
    </InlinePanel>
  )
}

// ============================================
// Icon Color Picker (Portal-based)
// ============================================

function IconColorPicker({
  color,
  onChange,
  onClose,
  triggerRef,
}: {
  color: string
  onChange: (color: string | null) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Calculate position based on trigger element
  useEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
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
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: PANEL_COLORS.bg,
        border: `1px solid ${PANEL_COLORS.label}`,
        borderRadius: '8px',
        zIndex: 10001,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '12px' }}>
        <TailwindColorPalette
          color={color || ''}
          onChange={(c) => onChange(c || null)}
        />
      </div>
      {/* Footer */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${PANEL_COLORS.label}`,
        display: 'flex',
        gap: '8px',
        fontSize: '10px',
        color: PANEL_COLORS.text,
      }}>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${PANEL_COLORS.label}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: PANEL_COLORS.text,
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
            border: `1px solid ${PANEL_COLORS.label}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            color: PANEL_COLORS.text,
          }}
        >
          <span style={{ fontWeight: 500, color: '#ccc' }}>Esc</span> Schließen
        </button>
      </div>
    </div>
  )
}

