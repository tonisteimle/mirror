import { useState, useEffect, useRef, useCallback } from 'react'
import { colors } from '../theme'
import { searchCommands, commandCategories, type DSLCommand } from '../editor/dsl-commands'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (syntax: string) => void
  position: { x: number; y: number }
  initialQuery?: string
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  position,
  initialQuery = ''
}: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredCommands = searchCommands(query)

  // Group by category for display
  const groupedCommands = new Map<string, DSLCommand[]>()
  for (const category of commandCategories) {
    const cmds = filteredCommands.filter(c => c.category === category)
    if (cmds.length > 0) {
      groupedCommands.set(category, cmds)
    }
  }

  // Flatten for keyboard navigation
  const flatCommands = filteredCommands

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, initialQuery])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, flatCommands.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          onSelect(flatCommands[selectedIndex].syntax)
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          setSelectedIndex(i => Math.max(i - 1, 0))
        } else {
          setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1))
        }
        break
    }
  }, [flatCommands, selectedIndex, onSelect, onClose])

  if (!isOpen) return null

  // Calculate position (ensure it stays within viewport)
  const maxHeight = 320
  const width = 280

  let top = position.y
  let left = position.x

  // Adjust if would overflow bottom
  if (top + maxHeight > window.innerHeight - 20) {
    top = position.y - maxHeight - 24
  }

  // Adjust if would overflow right
  if (left + width > window.innerWidth - 20) {
    left = window.innerWidth - width - 20
  }

  let commandIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Palette */}
      <div
        style={{
          position: 'fixed',
          left,
          top,
          width,
          maxHeight,
          backgroundColor: '#252525',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div style={{ padding: '8px', borderBottom: `1px solid ${colors.border}` }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen... (z.B. rahmen, padding)"
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '12px',
              fontFamily: 'system-ui, sans-serif',
              backgroundColor: '#1A1A1A',
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '4px 0',
          }}
        >
          {flatCommands.length === 0 ? (
            <div style={{
              padding: '12px',
              fontSize: '12px',
              color: colors.textMuted,
              textAlign: 'center',
            }}>
              Keine Befehle gefunden
            </div>
          ) : (
            Array.from(groupedCommands.entries()).map(([category, commands]) => (
              <div key={category}>
                {/* Category Header */}
                <div style={{
                  padding: '6px 12px 4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {category}
                </div>

                {/* Commands */}
                {commands.map((cmd) => {
                  const index = commandIndex++
                  const isSelected = index === selectedIndex

                  return (
                    <div
                      key={cmd.name + cmd.syntax}
                      data-index={index}
                      onClick={() => {
                        onSelect(cmd.syntax)
                        onClose()
                      }}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#3A3A3A' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12px',
                          color: colors.text,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {cmd.syntax.split('\n')[0]}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: colors.textMuted,
                          marginTop: '2px',
                        }}>
                          {cmd.description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '6px 12px',
          fontSize: '10px',
          color: colors.textMuted,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          gap: '12px',
        }}>
          <span>↑↓ Navigation</span>
          <span>↵ Einfügen</span>
          <span>Esc Schliessen</span>
        </div>
      </div>
    </>
  )
}
