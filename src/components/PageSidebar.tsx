/**
 * PageSidebar - Minimal navigation for pages
 *
 * Design: Subtle, like editor tabs. No backgrounds, no borders.
 * - Page names only
 * - Delete icon appears on hover (if page can be deleted)
 * - Pages are created via code references (page PageName)
 * - Pages can only be deleted if not referenced in code
 */

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
  onDeletePage: (pageId: string) => string[] | null
  onRenamePage: (pageId: string, newName: string) => void
  /** Set of page names that are referenced in code */
  referencedPages?: Set<string>
}

export function PageSidebar({
  pages,
  currentPageId,
  onSelectPage,
  onDeletePage,
  onRenamePage,
  referencedPages = new Set(),
}: PageSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteError, setDeleteError] = useState<{ pageId: string; references: string[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // Close error popup on outside click
  useEffect(() => {
    if (deleteError) {
      const handleClick = () => setDeleteError(null)
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [deleteError])

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

  const handleDelete = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    const references = onDeletePage(pageId)
    if (references && references.length > 0) {
      setDeleteError({ pageId, references })
    }
  }

  const canDelete = (page: PageData): boolean => {
    // Can't delete if it's the only page
    if (pages.length <= 1) return false
    // Can't delete if referenced in code
    if (referencedPages.has(page.name)) return false
    return true
  }

  return (
    <nav
      role="navigation"
      aria-label="Page navigation"
      style={{
        width: '120px',
        minWidth: '120px',
        paddingTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.panel,
      }}>
      {/* Page List */}
      {pages.map((page) => {
        const isActive = page.id === currentPageId
        const isHovered = hoveredId === page.id
        const isEditing = page.id === editingId
        const showDelete = isHovered && canDelete(page) && !isEditing

        return (
          <div
            key={page.id}
            role="button"
            tabIndex={0}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page: ${page.name}`}
            onClick={() => !isEditing && onSelectPage(page.id)}
            onDoubleClick={() => handleDoubleClick(page)}
            onMouseEnter={() => setHoveredId(page.id)}
            onMouseLeave={() => setHoveredId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isEditing) {
                onSelectPage(page.id)
              }
            }}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              color: isActive ? '#fff' : '#666',
              cursor: isEditing ? 'text' : 'pointer',
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
                  color: '#fff',
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
                  {page.name}
                </span>
                {showDelete && (
                  <button
                    onClick={(e) => handleDelete(e, page.id)}
                    aria-label={`Delete page ${page.name}`}
                    title={`Delete page ${page.name}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0 0 0 8px',
                      color: '#666',
                      fontSize: '10px',
                      cursor: 'pointer',
                      lineHeight: 1,
                      opacity: 0.6,
                      transition: 'opacity 0.1s, color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.color = '#EF4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6'
                      e.currentTarget.style.color = '#666'
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

      {/* Delete Error Popup */}
      {deleteError && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: '140px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: '#1E1E2E',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '12px 16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            maxWidth: '240px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>
            Seite wird referenziert von:
          </div>
          <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '10px' }}>
            {deleteError.references.join(', ')}
          </div>
          <button
            onClick={() => setDeleteError(null)}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              backgroundColor: '#333',
              color: '#999',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      )}
    </nav>
  )
}
