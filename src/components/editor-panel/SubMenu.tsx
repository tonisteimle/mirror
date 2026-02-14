/**
 * SubMenu Component
 *
 * Vertical sub-menu for listing items with rename/delete functionality.
 * Used for sections within editor tabs.
 */

import { memo, useState, useRef, useEffect } from 'react'
import { colors } from '../../theme'

interface SubMenuItem {
  id: string
  name: string
}

interface SubMenuProps {
  items: SubMenuItem[]
  activeId?: string
  onSelect?: (id: string) => void
  canDelete?: (id: string) => boolean
  onDelete?: (id: string) => string[] | null
  onRename?: (id: string, name: string) => void
}

export const SubMenu = memo(function SubMenu({
  items,
  activeId,
  onSelect,
  canDelete,
  onDelete,
  onRename,
}: SubMenuProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const handleDoubleClick = (item: SubMenuItem) => {
    if (onRename) {
      setEditingId(item.id)
      setEditName(item.name)
    }
  }

  const handleRenameSubmit = () => {
    if (editingId && editName.trim() && onRename) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditName('')
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDelete?.(id)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '4px',
      minWidth: '80px',
      marginLeft: '-8px',
    }}>
      {items.map((item) => {
        const isActive = item.id === activeId
        const isHovered = hoveredId === item.id
        const isEditing = item.id === editingId
        const showDelete = isHovered && canDelete?.(item.id) && !isEditing && onDelete

        return (
          <div
            key={item.id}
            onClick={() => !isEditing && onSelect?.(item.id)}
            onDoubleClick={() => handleDoubleClick(item)}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: '3px 12px',
              fontSize: '12px',
              color: isActive ? colors.text : colors.textMuted,
              cursor: isEditing ? 'text' : onSelect ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'color 0.1s ease',
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '0',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  backgroundColor: 'transparent',
                  color: colors.text,
                  border: 'none',
                  outline: 'none',
                }}
              />
            ) : (
              <>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </span>
                {showDelete && (
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0 0 0 8px',
                      color: colors.textMuted,
                      fontSize: '10px',
                      cursor: 'pointer',
                      lineHeight: 1,
                      opacity: 0.6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.color = '#EF4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6'
                      e.currentTarget.style.color = colors.textMuted
                    }}
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
})
