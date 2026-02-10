import { useState, useRef, useEffect } from 'react'
import { colors } from '../theme'

export interface PageData {
  id: string
  name: string
  layoutCode: string
}

interface PageSidebarProps {
  pages: PageData[]
  currentPageId: string
  onSelectPage: (pageId: string) => void
  onAddPage: () => void
  onRenamePage: (pageId: string, newName: string) => void
  onDeletePage: (pageId: string) => string[] | null  // Returns referencing pages if can't delete
  onReorderPages: (fromIndex: number, toIndex: number) => void
}

export function PageSidebar({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onReorderPages,
}: PageSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageId: string } | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<{ pageId: string; references: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null)
      setDeleteError(null)
    }
    if (contextMenu || deleteError) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu, deleteError])

  const handleDoubleClick = (page: PageData) => {
    setEditingId(page.id)
    setEditName(page.name)
  }

  const handleRenameSubmit = () => {
    if (editingId && editName.trim()) {
      onRenamePage(editingId, editName.trim())
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

  const handleContextMenu = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, pageId })
  }

  const startRename = (pageId: string) => {
    const page = pages.find(p => p.id === pageId)
    if (page) {
      setEditingId(pageId)
      setEditName(page.name)
    }
    setContextMenu(null)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onReorderPages(draggedIndex, toIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div style={{
      width: '140px',
      minWidth: '140px',
      backgroundColor: colors.panel,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 10px 6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: colors.text,
        }}>
          Pages
        </span>
        <button
          onClick={onAddPage}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text,
            fontSize: '14px',
            lineHeight: 1,
            cursor: 'pointer',
            padding: '2px 4px',
            opacity: 0.6,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
        >
          +
        </button>
      </div>

      {/* Page List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
        {pages.map((page, index) => {
          const isActive = page.id === currentPageId
          const isEditing = page.id === editingId
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index && draggedIndex !== index

          return (
            <div
              key={page.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => !isEditing && onSelectPage(page.id)}
              onDoubleClick={() => handleDoubleClick(page)}
              onContextMenu={(e) => handleContextMenu(e, page.id)}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                color: colors.text,
                backgroundColor: isActive ? '#2A2A2A' : 'transparent',
                borderRadius: '4px',
                cursor: isEditing ? 'text' : 'pointer',
                transition: 'background-color 0.1s ease',
                marginBottom: '1px',
                opacity: isDragging ? 0.5 : 1,
                borderTop: isDragOver ? '2px solid #555' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDragging) {
                  e.currentTarget.style.backgroundColor = '#252525'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
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
                page.name
              )}
            </div>
          )
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#2A2A2A',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            padding: '2px 0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            minWidth: '90px',
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation()
              startRename(contextMenu.pageId)
            }}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              color: colors.text,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3A3A3A' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            Rename
          </div>
          {pages.length > 1 && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                const references = onDeletePage(contextMenu.pageId)
                if (references && references.length > 0) {
                  setDeleteError({ pageId: contextMenu.pageId, references })
                }
                setContextMenu(null)
              }}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                color: '#EF4444',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3A3A3A' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              Delete
            </div>
          )}
        </div>
      )}

      {/* Delete Error Popup */}
      {deleteError && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#2A2A2A',
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            maxWidth: '280px',
          }}
        >
          <div style={{ fontSize: '12px', color: colors.text, marginBottom: '8px' }}>
            Seite wird noch referenziert von:
          </div>
          <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '12px' }}>
            {deleteError.references.join(', ')}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteError(null)
            }}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              backgroundColor: '#3A3A3A',
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
