/**
 * Dropdown Demo - Proof of Concept
 *
 * Zeigt wie die Mirror-Syntax funktionieren würde:
 *
 * ```mirror
 * item: hor gap 8 pad 8 hover-bg #333
 *   onclick select self, close dropdown
 *   onhover highlight self
 *
 * dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
 *   onclick-outside close self
 *   onkeydown escape close self
 *
 * input onclick open dropdown below onkey filter dropdown
 *
 * dropdown
 *   item icon "home" "Dashboard"
 *   item icon "user" "Profil"
 *   item icon "settings" "Einstellungen"
 * ```
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { colors } from '../theme'

interface DropdownItem {
  icon: string
  label: string
  value: string
}

const ITEMS: DropdownItem[] = [
  { icon: '🏠', label: 'Dashboard', value: 'dashboard' },
  { icon: '👤', label: 'Profil', value: 'profile' },
  { icon: '⚙️', label: 'Einstellungen', value: 'settings' },
  { icon: '📊', label: 'Analytics', value: 'analytics' },
  { icon: '📁', label: 'Dateien', value: 'files' },
  { icon: '🚪', label: 'Abmelden', value: 'logout' },
]

export function DropdownDemo() {
  // State
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filtered items
  const filteredItems = ITEMS.filter(item =>
    item.label.toLowerCase().includes(filter.toLowerCase())
  )

  // Selected item
  const selectedItem = ITEMS.find(i => i.value === selectedValue)

  // ════════════════════════════════════════════════════════════════
  // BEHAVIORS - Das ist was der Compiler generieren würde
  // ════════════════════════════════════════════════════════════════

  // onclick open dropdown below
  const handleInputClick = useCallback(() => {
    setIsOpen(true)
    setFilter('')
    setHighlightedIndex(0)
  }, [])

  // onkey filter dropdown
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value)
    setHighlightedIndex(0)
    if (!isOpen) setIsOpen(true)
  }, [isOpen])

  // onclick-outside close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // onkeydown escape close dropdown
  // onkeydown arrow-down highlight next
  // onkeydown arrow-up highlight prev
  // onkeydown enter select highlighted
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(i => Math.min(i + 1, filteredItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredItems[highlightedIndex]) {
            setSelectedValue(filteredItems[highlightedIndex].value)
            setIsOpen(false)
            setFilter('')
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, highlightedIndex])

  // Scroll highlighted into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const highlighted = listRef.current.querySelector('[data-highlighted="true"]')
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, highlightedIndex])

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div style={{ padding: 40, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <h2 style={{ color: colors.text, marginBottom: 24, fontFamily: 'system-ui' }}>
        Dropdown Demo
      </h2>

      <p style={{ color: colors.textMuted, marginBottom: 24, fontFamily: 'system-ui', fontSize: 14 }}>
        Das ist was 11 Zeilen Mirror-Code erzeugen würden:
      </p>

      {/* Mirror Code Display */}
      <pre style={{
        backgroundColor: colors.panel,
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        fontSize: 12,
        color: colors.text,
        fontFamily: 'JetBrains Mono, monospace',
        overflow: 'auto',
      }}>
{`// Definition
item: hor gap 8 pad 8 hover-bg #333
  onclick select self, close dropdown
  onhover highlight self

dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
  onclick-outside close self
  onkeydown escape close self

// Anwendung
input onclick open dropdown below onkey filter dropdown

dropdown
  item icon "🏠" "Dashboard"
  item icon "👤" "Profil"
  item icon "⚙️" "Einstellungen"`}
      </pre>

      {/* The actual dropdown */}
      <div ref={containerRef} style={{ position: 'relative', width: 280 }}>
        {/* Input - "input onclick open dropdown below onkey filter dropdown" */}
        <input
          ref={inputRef}
          type="text"
          value={filter || (selectedItem?.label ?? '')}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder="Wählen..."
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.panel,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.text,
            fontSize: 14,
            fontFamily: 'system-ui',
            outline: 'none',
          }}
        />

        {/* Dropdown - "dropdown: ver bg #1E1E2E rad 8 shadow lg hidden" */}
        {isOpen && (
          <div
            ref={listRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              maxHeight: 240,
              overflowY: 'auto',
              zIndex: 1000,
            }}
          >
            {filteredItems.length === 0 ? (
              <div style={{
                padding: 12,
                color: colors.textMuted,
                textAlign: 'center',
                fontSize: 13,
              }}>
                Keine Ergebnisse
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isHighlighted = index === highlightedIndex
                const isSelected = item.value === selectedValue

                return (
                  /* Item - "item: hor gap 8 pad 8 hover-bg #333" */
                  <div
                    key={item.value}
                    data-highlighted={isHighlighted}
                    onClick={() => {
                      // "onclick select self, close dropdown"
                      setSelectedValue(item.value)
                      setIsOpen(false)
                      setFilter('')
                    }}
                    onMouseEnter={() => {
                      // "onhover highlight self"
                      setHighlightedIndex(index)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      backgroundColor: isHighlighted ? colors.lineActive : 'transparent',
                      color: colors.text,
                      fontSize: 14,
                      fontFamily: 'system-ui',
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    {isSelected && (
                      <span style={{ marginLeft: 'auto', color: colors.accent }}>✓</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Selected value display */}
      {selectedValue && (
        <p style={{
          marginTop: 16,
          color: colors.textMuted,
          fontSize: 13,
          fontFamily: 'system-ui',
        }}>
          Ausgewählt: <strong style={{ color: colors.text }}>{selectedItem?.label}</strong>
        </p>
      )}
    </div>
  )
}

export default DropdownDemo
