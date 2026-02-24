/**
 * InlineColorPanel - Color picker with multiple color systems or token swatches
 *
 * Normal mode: Shows color palette with tabs (Tailwind, Radix, etc.)
 * Token mode: Shows only defined color tokens from the editor
 *
 * Has a Token toggle button in the header to switch between modes.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { ColorSystemPalette } from './ColorSystemPalette'
import { ColorTokenList } from './color-picker'
import { parseColorTokens } from '../utils/token-parser'
import { usePickerBehavior } from '../hooks/usePickerBehavior'

interface InlineColorPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (color: string) => void
  onCodeChange?: (color: string) => void
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  onSelectedValueChange?: (value: string | null) => void
  initialColor?: string
  /** Token mode - show only tokens instead of color picker */
  useTokenMode?: boolean
  /** Callback when token mode changes */
  onTokenModeChange?: (mode: boolean) => void
  /** Editor code for extracting tokens */
  editorCode?: string
}

export function InlineColorPanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  onSelectedValueChange,
  initialColor,
  useTokenMode: useTokenModeProp = false,
  onTokenModeChange,
  editorCode = '',
}: InlineColorPanelProps) {
  const [pickerColor, setPickerColor] = useState('#3B82F6')

  // Internal token mode state (synced with prop)
  const [internalTokenMode, setInternalTokenMode] = useState(useTokenModeProp)

  // Sync with prop when it changes
  useEffect(() => {
    setInternalTokenMode(useTokenModeProp)
  }, [useTokenModeProp])

  // Effective token mode
  const useTokenMode = internalTokenMode

  // Handle token mode toggle
  const handleTokenModeToggle = useCallback(() => {
    const newMode = !internalTokenMode
    setInternalTokenMode(newMode)
    onTokenModeChange?.(newMode)
  }, [internalTokenMode, onTokenModeChange])

  // Parse color tokens from editor code
  const colorTokens = useMemo(
    () => parseColorTokens(editorCode).map(t => ({ name: '$' + t.name, value: t.value })),
    [editorCode]
  )

  // Token picker behavior
  const handleTokenSelect = useCallback(
    (index: number) => {
      if (colorTokens[index]) {
        onSelect(colorTokens[index].name)
        onClose()
      }
    },
    [colorTokens, onSelect, onClose]
  )

  const tokenPicker = usePickerBehavior({
    isOpen: isOpen && useTokenMode,
    onClose,
    itemCount: colorTokens.length,
    onSelect: handleTokenSelect,
  })

  // Initialize when panel opens
  useEffect(() => {
    if (isOpen) {
      if (initialColor) {
        const normalized = initialColor.startsWith('#') ? initialColor : `#${initialColor}`
        setPickerColor(normalized.toUpperCase())
      } else {
        setPickerColor('#3B82F6')
      }
      tokenPicker.resetSelection()
    }
  }, [isOpen, initialColor, tokenPicker])

  // Report changes
  useEffect(() => {
    onSelectedValueChange?.(pickerColor)
  }, [pickerColor, onSelectedValueChange])

  const handleColorSelect = useCallback((color: string) => {
    const upperColor = color.toUpperCase()
    setPickerColor(upperColor)
    onCodeChange?.(upperColor)
  }, [onCodeChange])

  const handleSubmit = useCallback(() => {
    onSelect(pickerColor)
    onClose()
  }, [pickerColor, onSelect, onClose])

  // Global keyboard handler (only for color mode, token mode uses picker behavior)
  useEffect(() => {
    if (!isOpen || useTokenMode) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, useTokenMode, handleSubmit, onClose])

  // Header with Token toggle button
  const renderHeader = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: '1px solid #222',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        color: '#999',
      }}>
        {useTokenMode ? 'Token-Farben' : 'Farbauswahl'}
      </span>
      <button
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleTokenModeToggle()
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
        title="Token Mode"
      >
        Tokens
      </button>
    </div>
  )

  // Token mode: show token list
  if (useTokenMode) {
    return (
      <InlinePanel
        isOpen={isOpen}
        onClose={onClose}
        position={position}
        width={300}
        maxHeight={360}
        testId="panel-color-tokens"
      >
        {renderHeader()}
        {colorTokens.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#888',
            fontSize: '13px',
          }}>
            Keine Farb-Tokens definiert.
            <br />
            <span style={{ fontSize: '12px', color: '#666' }}>
              Definiere Tokens im Tokens-Tab:<br />
              $primary: #3B82F6
            </span>
          </div>
        ) : (
          <ColorTokenList
            ref={tokenPicker.listRef}
            tokens={colorTokens}
            selectedIndex={tokenPicker.selectedIndex}
            onSelect={handleTokenSelect}
            onHover={tokenPicker.setSelectedIndex}
            onKeyDown={tokenPicker.handleKeyDown}
          />
        )}
        <PanelFooter
          hints={[
            { label: 'Schliessen', onClick: onClose },
          ]}
        />
      </InlinePanel>
    )
  }

  // Normal mode: show color palette with system tabs
  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={420}
      maxHeight={400}
      testId="panel-color-picker"
    >
      {renderHeader()}
      <div style={{ padding: '12px', paddingBottom: '8px' }}>
        <ColorSystemPalette
          color={pickerColor}
          onChange={handleColorSelect}
        />
      </div>
      <PanelFooter
        hints={[
          { label: 'Schliessen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />
    </InlinePanel>
  )
}
