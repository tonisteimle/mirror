/**
 * HeaderBar component for the main application header.
 * Contains logo, tutorial link, and menu dropdown.
 */

import { useState, useRef, useEffect } from 'react'
import { colors } from '../theme'
import type { ViewMode } from '../hooks/useAppState'

interface HeaderBarProps {
  onNewPrototype: () => void
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onOpenSettings: () => void
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  /** Whether property panel is visible */
  showPropertyPanel?: boolean
  /** Callback to toggle property panel */
  onTogglePropertyPanel?: () => void
  /** Whether content edit mode is active (edit text directly in preview) */
  contentEditMode?: boolean
  /** Callback to toggle content edit mode */
  onToggleContentEditMode?: () => void
}

export function HeaderBar({
  onNewPrototype,
  onOpen,
  onSave,
  onExport,
  onOpenSettings,
  viewMode = 'edit',
  onViewModeChange,
  showPropertyPanel = false,
  onTogglePropertyPanel,
  contentEditMode = false,
  onToggleContentEditMode,
}: HeaderBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div style={{
      height: '40px',
      backgroundColor: colors.header,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '20px',
      paddingRight: '16px',
    }}>
      {/* Left: Logo */}
      <img src={`${import.meta.env.BASE_URL}Logo.png`} alt="mirror" style={{ height: '24px', marginTop: '-4px', marginLeft: '-2px' }} />


      {/* Right: Actions */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <>
            <IconButton
              onClick={() => onViewModeChange(viewMode === 'preview' ? 'edit' : 'preview')}
              title={viewMode === 'preview' ? 'Edit Mode (⌘.)' : 'Preview Mode (⌘.)'}
              active={viewMode === 'preview'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </IconButton>
            <IconButton
              onClick={() => onViewModeChange(viewMode === 'fullscreen' ? 'edit' : 'fullscreen')}
              title={viewMode === 'fullscreen' ? 'Exit Fullscreen (Esc)' : 'Fullscreen (⌘⇧.)'}
              active={viewMode === 'fullscreen'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </IconButton>
            <div style={{ width: '1px', backgroundColor: colors.border, height: '20px', margin: '0 4px' }} />
          </>
        )}

        {/* Property Panel Toggle - temporarily disabled */}
        {/* {onTogglePropertyPanel && viewMode === 'edit' && (
          <IconButton
            onClick={onTogglePropertyPanel}
            title={showPropertyPanel ? 'Properties ausblenden' : 'Properties einblenden'}
            active={showPropertyPanel}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </IconButton>
        )} */}

        {/* Content Edit Mode Toggle (Pencil) */}
        {onToggleContentEditMode && (
          <IconButton
            onClick={onToggleContentEditMode}
            title={contentEditMode ? 'Edit-Modus beenden' : 'Text direkt bearbeiten'}
            active={contentEditMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </IconButton>
        )}

        {/* Documentation Link - opens in new tab */}
        <IconButton
          onClick={() => window.open('http://ux-strategy.ch/mirror/mirror-docu-generated.html', '_blank')}
          title="Dokumentation öffnen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </IconButton>

        <div style={{ width: '1px', backgroundColor: colors.border, height: '20px', margin: '0 4px' }} />

        {/* Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <IconButton
            onClick={() => setMenuOpen(!menuOpen)}
            title="Menu"
            active={menuOpen}
            ariaHaspopup={true}
            ariaExpanded={menuOpen}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </IconButton>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Application menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: colors.panel,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '4px',
                minWidth: '140px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
              }}>
              <MenuItem
                onClick={() => { onNewPrototype(); setMenuOpen(false) }}
                icon={<NewIcon />}
              >
                New
              </MenuItem>

              <MenuDivider />

              <MenuItem
                onClick={() => { onOpen(); setMenuOpen(false) }}
                icon={<FolderOpenIcon />}
              >
                Open
              </MenuItem>
              <MenuItem
                onClick={() => { onSave(); setMenuOpen(false) }}
                icon={<SaveIcon />}
              >
                Save
              </MenuItem>

              <MenuDivider />

              <MenuItem
                onClick={() => { onExport(); setMenuOpen(false) }}
                icon={<ExportIcon />}
              >
                Export
              </MenuItem>

              <MenuDivider />

              <MenuItem
                onClick={() => { onOpenSettings(); setMenuOpen(false) }}
                icon={<SettingsIcon />}
              >
                Settings
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IconButton({
  onClick,
  title,
  children,
  active = false,
  disabled = false,
  ariaHaspopup,
  ariaExpanded,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  ariaHaspopup?: boolean
  ariaExpanded?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        backgroundColor: active ? colors.panelHover : 'transparent',
        color: active ? colors.text : colors.textMuted,
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'color 0.15s ease, background-color 0.15s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function MenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const label = typeof children === 'string' ? children : undefined

  return (
    <button
      role="menuitem"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '8px 12px',
        backgroundColor: hovered ? colors.panelHover : 'transparent',
        color: colors.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'left',
      }}
    >
      <span style={{ color: colors.textMuted, display: 'flex' }}>{icon}</span>
      {children}
    </button>
  )
}

function MenuDivider() {
  return (
    <div style={{
      height: '1px',
      backgroundColor: colors.border,
      margin: '4px 8px',
    }} />
  )
}

// Icons
function NewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  )
}

function FolderOpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
