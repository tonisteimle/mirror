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
import * as PhosphorIcons from '@phosphor-icons/react'
import {
  InlinePanel,
  PanelList,
  PanelFooter,
} from './InlinePanel'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'
import { ColorSystemPalette } from './ColorSystemPalette'
import { TokenSwatches } from './TokenSwatches'
import { TokenButtonRow } from './TokenButtonRow'
import { colors } from '../theme'
import { searchIcons } from '../data/icon-synonyms'
import { MATERIAL_ICONS, searchMaterialIcons } from '../data/material-icons'
import { PHOSPHOR_ICONS, searchPhosphorIcons } from '../data/phosphor-icons'
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
const SIZE_PRESETS = [16, 20, 24, 32]

// ============================================
// UI Components
// ============================================

/** Number input for custom values (matching InlineLayoutPanel style) */
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
        const num = parseInt(e.target.value, 10)
        onChange(isNaN(num) ? 0 : num)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: `${width}px`,
        height: '22px',
        padding: '0 5px',
        backgroundColor: showValue ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
        color: PANEL_COLORS.textLight,
        border: 'none',
        borderRadius: '3px',
        fontSize: '10px',
        fontFamily: 'system-ui, sans-serif',
        outline: 'none',
      }}
    />
  )
}

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
  /** Token mode from project settings (if provided, overrides localStorage) */
  useTokenMode?: boolean
  /** Callback when token mode changes (if provided, updates project settings) */
  onTokenModeChange?: (mode: boolean) => void
}

const GRID_COLUMNS = 8

// Default icon color (white) - what icons look like in the preview
const DEFAULT_ICON_COLOR = '#FFFFFF'

/**
 * Convert weight to Phosphor weight variant
 */
function weightToPhosphorWeight(weight: number): 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' {
  if (weight <= 150) return 'thin'
  if (weight <= 250) return 'light'
  if (weight <= 450) return 'regular'
  if (weight <= 550) return 'bold'
  return 'fill'
}

/**
 * Separate component for icon preview to ensure proper re-rendering
 * when size, weight, or color changes.
 */
function IconPreview({
  iconName,
  iconLibrary,
  iconSize,
  iconWeight,
  iconColor,
}: {
  iconName: string
  iconLibrary: IconLibrary
  iconSize: number | string | null
  iconWeight: number | null
  iconColor: string | null
}) {
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
  } else if (iconLibrary === 'phosphor') {
    const phosphorWeight = weightToPhosphorWeight(weight)
    const IconComponent = (
      PhosphorIcons as unknown as Record<
        string,
        React.ComponentType<{ size?: number; color?: string; weight?: string }>
      >
    )[iconName]
    return IconComponent ? (
      <IconComponent size={size} color={color} weight={phosphorWeight} />
    ) : null
  } else {
    // Lucide - Map weight 100-700 to strokeWidth 0.75-3.0
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
}

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
  useTokenMode: useTokenModeProp,
  onTokenModeChange,
}: InlineIconPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)

  // Token mode state - use prop if provided, otherwise fall back to localStorage
  const [useTokenModeState, setUseTokenModeState] = useState(() =>
    useTokenModeProp !== undefined ? useTokenModeProp : getStoredTokenMode()
  )

  // Effective token mode - prefer prop over local state
  const useTokenMode = useTokenModeProp !== undefined ? useTokenModeProp : useTokenModeState

  // Sync with prop when it changes
  useEffect(() => {
    if (useTokenModeProp !== undefined) {
      setUseTokenModeState(useTokenModeProp)
    }
  }, [useTokenModeProp])

  // Handler for token mode change
  const handleTokenModeChange = useCallback((mode: boolean) => {
    setUseTokenModeState(mode)
    // Notify parent if callback provided (saves to project)
    onTokenModeChange?.(mode)
  }, [onTokenModeChange])

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
    } else if (iconLibrary === 'phosphor') {
      // Phosphor Icons (PascalCase)
      return cleanFilter ? searchPhosphorIcons(cleanFilter) : PHOSPHOR_ICONS
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
    } else if (iconLibrary === 'phosphor') {
      parts.push(`"${iconName}"`)
      parts.push('phosphor')
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
  // Include iconColor, iconSize, iconWeight as dependencies to ensure effect runs on their changes
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange && selectedValue) {
      pendingSyncRef.current = false
      onCodeChange(selectedValue)
    }
  }, [selectedValue, onCodeChange, iconColor, iconSize, iconWeight])

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
    } else if (iconLibrary === 'phosphor') {
      // Phosphor Icons: React Component
      const IconComponent = (
        PhosphorIcons as unknown as Record<
          string,
          React.ComponentType<{ size?: number; color?: string; weight?: string }>
        >
      )[iconName]
      return IconComponent ? <IconComponent size={size} color={GRID_ICON_COLOR} weight="regular" /> : null
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

  // Get display name for icon (kebab-case for Lucide, snake_case for Material, PascalCase for Phosphor)
  const getDisplayName = useCallback((iconName: string) => {
    if (iconLibrary === 'material') return iconName
    if (iconLibrary === 'phosphor') return iconName  // Keep PascalCase for Phosphor
    return toKebabCase(iconName)  // Lucide: convert to kebab-case
  }, [iconLibrary])

  // Library tabs for PanelHeader
  const libraryTabs = useMemo(() => [
    { id: 'lucide', label: 'Lucide' },
    { id: 'material', label: 'Material' },
    { id: 'phosphor', label: 'Phosphor' },
  ], [])

  const handleTabChange = useCallback((id: string) => {
    onLibraryChange(id as IconLibrary)
  }, [onLibraryChange])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={520}
      maxHeight={340}
      testId="panel-icon-picker"
    >
      {/* Panel Tab Header (Icon tab) when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader
          activeTab="icon"
          onSwitchPanel={onSwitchPanel}
          availableTabs={availableTabs}
          useTokenMode={useTokenMode}
          onTokenModeChange={handleTokenModeChange}
        />
      )}
      {/* Library Tabs + Token Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        gap: '2px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {/* Library tabs - left aligned */}
        {libraryTabs.map(tab => (
          <button
            key={tab.id}
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              handleTabChange(tab.id)
            }}
            style={{
              padding: '4px 10px',
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
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Token Mode Toggle - always visible */}
        <button
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleTokenModeChange(!useTokenMode)
          }}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 500,
            backgroundColor: useTokenMode ? '#252525' : '#181818',
            color: useTokenMode ? '#ccc' : '#555',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
          title="Token Mode - Größen und Farben als Tokens"
        >
          Tokens
        </button>
      </div>

      {/* Main content: Icon grid left, Options right */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Icon Grid - left side */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
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
                          width: '32px',
                          height: '32px',
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
                        {renderIconPreview(iconName, 16)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </PanelList>
        </div>

        {/* Options Panel - right side */}
        <div style={{
          width: '200px',
          borderLeft: `1px solid ${colors.border}`,
          padding: '8px',
          backgroundColor: '#111',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}>
          {/* Icon preview - top */}
          {filteredIcons[selectedIndex] && (
            <div style={{
              width: '100%',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: PANEL_COLORS.buttonBg,
              borderRadius: '4px',
            }}>
              <IconPreview
                iconName={filteredIcons[selectedIndex]}
                iconLibrary={iconLibrary}
                iconSize={iconSize}
                iconWeight={iconWeight}
                iconColor={iconColor}
              />
            </div>
          )}

          {/* Size */}
          <div>
            <div style={{ fontSize: '10px', color: PANEL_COLORS.label, marginBottom: '4px' }}>Size</div>
            {useTokenMode ? (
              editorCode ? (
                <TokenButtonRow
                  code={editorCode}
                  property="is"
                  value={iconSize ?? ''}
                  onSelect={(token) => handleSizeChange(token)}
                  maxTokens={4}
                />
              ) : null
            ) : (
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                {SIZE_PRESETS.map(size => {
                  const isSelected = iconSize !== null && (typeof iconSize === 'number' ? iconSize : 0) === size
                  return (
                    <button
                      key={size}
                      tabIndex={-1}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleSizeChange(isSelected ? null : size)
                      }}
                      style={{
                        minWidth: '28px',
                        height: '22px',
                        padding: '0 4px',
                        fontSize: '10px',
                        fontFamily: 'system-ui, sans-serif',
                        backgroundColor: isSelected ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
                        color: isSelected ? PANEL_COLORS.textLight : PANEL_COLORS.text,
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                      }}
                    >
                      {size}
                    </button>
                  )
                })}
                <NumberInput
                  value={typeof iconSize === 'number' ? iconSize : 0}
                  onChange={(v) => handleSizeChange(v > 0 ? v : null)}
                  presets={SIZE_PRESETS}
                  width={32}
                />
              </div>
            )}
          </div>

          {/* Weight */}
          <div>
            <div style={{ fontSize: '10px', color: PANEL_COLORS.label, marginBottom: '4px' }}>Weight</div>
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
              {WEIGHT_PRESETS.map(({ value, label }) => {
                const isSelected = iconWeight !== null && iconWeight === value
                return (
                  <button
                    key={value}
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleWeightChange(isSelected ? null : value)
                    }}
                    style={{
                      height: '22px',
                      padding: '0 5px',
                      fontSize: '10px',
                      fontFamily: 'system-ui, sans-serif',
                      backgroundColor: isSelected ? PANEL_COLORS.buttonBgSelected : PANEL_COLORS.buttonBg,
                      color: isSelected ? PANEL_COLORS.textLight : PANEL_COLORS.text,
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                    title={`${value}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <div style={{ fontSize: '10px', color: PANEL_COLORS.label, marginBottom: '4px' }}>Color</div>
            {useTokenMode && editorCode ? (
              <TokenSwatches
                code={editorCode}
                onSelect={(tokenName) => handleColorChange(tokenName)}
                selectedValue={iconColor ?? undefined}
              />
            ) : (
              <button
                ref={colorButtonRef}
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowColorPicker(!showColorPicker)
                }}
                style={{
                  width: '100%',
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
            )}
          </div>
        </div>
      </div>

      <PanelFooter
        hints={[
          { label: 'Abbrechen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />

      {/* Color Picker Popup */}
      {showColorPicker && !useTokenMode && colorButtonRef.current && createPortal(
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

  // Calculate position based on trigger element - open ABOVE the trigger
  useEffect(() => {
    if (!triggerRef.current || !panelRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelHeight = panelRef.current.offsetHeight || 300 // Estimate if not measured yet
    setPosition({
      top: rect.top - panelHeight - 8,
      left: rect.left,
    })
  }, [triggerRef])

  // Re-measure after render to get accurate height
  useEffect(() => {
    if (!triggerRef.current || !panelRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelHeight = panelRef.current.offsetHeight
    setPosition({
      top: rect.top - panelHeight - 8,
      left: rect.left,
    })
  })

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
        <ColorSystemPalette
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

