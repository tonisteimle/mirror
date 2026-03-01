/**
 * ProjectsDialog - Dialog for managing cloud projects
 *
 * Features:
 * - List all projects from server
 * - Create new project with name
 * - Delete project
 * - Switch to project
 */

import { useState, useEffect, useCallback } from 'react'
import { defaultComponentsCode, defaultTokensCode } from '../hooks/useEditor'

const LIBRARY_ENDPOINT = 'https://ux-strategy.ch/mirror/save-library.php'

// Consistent with picker panels
const COLORS = {
  bg: '#0a0a0a',
  buttonBg: '#222222',
  buttonBgSelected: '#3a3a3a',
  text: '#ccc',
  textMuted: '#666',
  border: '#222',
  danger: '#EF4444',
  primary: '#3B82F6',
}

// Use bound token format from central defaults
const DEFAULT_TOKENS = defaultTokensCode

interface ProjectInfo {
  id: string
  savedAt: string | null
  size: number
}

interface ProjectsDialogProps {
  isOpen: boolean
  onClose: () => void
  currentProjectId: string
  onSelectProject: (projectId: string) => void
  onOpenNewProject?: () => void
}

export function ProjectsDialog({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  onOpenNewProject,
}: ProjectsDialogProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [useTemplate, setUseTemplate] = useState(true) // true = from _template, false = empty
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Load projects from server
  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}?list=1`)
      if (!response.ok) throw new Error('Laden fehlgeschlagen')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on open
  useEffect(() => {
    if (isOpen) {
      loadProjects()
      setNewProjectName('')
      setDeleteConfirm(null)
    }
  }, [isOpen, loadProjects])

  // Create new project (empty or from _template)
  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name) return

    // Sanitize: only allow alphanumeric and dash (preserve case)
    const sanitized = name.trim().replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
    if (!sanitized) return

    try {
      let projectContent: string

      if (useTemplate) {
        // Load from _template project
        try {
          const templateResponse = await fetch(`${LIBRARY_ENDPOINT}?id=_template`)
          if (templateResponse.ok) {
            const templateText = await templateResponse.text()
            if (templateText && templateText.trim() && !templateText.trim().startsWith('//')) {
              const templateData = JSON.parse(templateText)
              templateData.savedAt = new Date().toISOString()
              projectContent = JSON.stringify(templateData, null, 2)
              console.log('[Projects] Neues Projekt von _template erstellt')
            } else {
              throw new Error('Template leer')
            }
          } else {
            throw new Error('Template nicht gefunden')
          }
        } catch {
          // Fallback to empty if template not found
          console.log('[Projects] _template nicht gefunden, erstelle leeres Projekt')
          const emptyProject = {
            version: 2,
            tokensCode: '',
            componentsCode: '',
            dataCode: '',
            pages: [{ id: 'page-1', name: 'Page 1', layoutCode: '' }],
            currentPageId: 'page-1',
            savedAt: new Date().toISOString(),
          }
          projectContent = JSON.stringify(emptyProject, null, 2)
        }
      } else {
        // Create empty project
        console.log('[Projects] Leeres Projekt erstellt')
        const emptyProject = {
          version: 2,
          tokensCode: '',
          componentsCode: '',
          dataCode: '',
          pages: [{ id: 'page-1', name: 'Page 1', layoutCode: '' }],
          currentPageId: 'page-1',
          savedAt: new Date().toISOString(),
        }
        projectContent = JSON.stringify(emptyProject, null, 2)
      }

      // Save to server
      const response = await fetch(`${LIBRARY_ENDPOINT}?id=${sanitized}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: projectContent,
      })

      if (!response.ok) {
        throw new Error('Projekt konnte nicht erstellt werden')
      }

      // Navigate to new project
      onSelectProject(sanitized)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    }
  }, [newProjectName, useTemplate, onSelectProject, onClose])

  // Rename project
  const handleRename = useCallback(async (oldId: string, newName: string) => {
    const sanitized = newName.trim().replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
    if (!sanitized || sanitized === oldId) {
      setEditingProject(null)
      return
    }

    try {
      // Load project data
      const loadResponse = await fetch(`${LIBRARY_ENDPOINT}?id=${oldId}`)
      if (!loadResponse.ok) throw new Error('Projekt konnte nicht geladen werden')
      const projectData = await loadResponse.text()

      // Save with new ID
      const saveResponse = await fetch(`${LIBRARY_ENDPOINT}?id=${sanitized}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: projectData,
      })
      if (!saveResponse.ok) throw new Error('Projekt konnte nicht umbenannt werden')

      // Delete old project
      await fetch(`${LIBRARY_ENDPOINT}?delete=${oldId}`, { method: 'DELETE' })

      // Reload list
      loadProjects()
      setEditingProject(null)

      // If renamed current project, navigate to new one
      if (oldId === currentProjectId) {
        onSelectProject(sanitized)
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Umbenennen')
    }
  }, [currentProjectId, loadProjects, onSelectProject, onClose])

  // Delete project
  const handleDelete = useCallback(async (projectId: string) => {
    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}?delete=${projectId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Löschen fehlgeschlagen')

      // Reload list
      loadProjects()
      setDeleteConfirm(null)

      // If deleted current project, go to no project
      if (projectId === currentProjectId) {
        onSelectProject('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }, [currentProjectId, loadProjects, onSelectProject])

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <>
      {/* Invisible backdrop for click-outside */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Picker-style panel */}
      <div
        style={{
          position: 'fixed',
          top: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: COLORS.bg,
          borderRadius: '4px',
          border: `1px solid ${COLORS.border}`,
          width: '320px',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          overflow: 'hidden',
          fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${COLORS.border}`,
            fontSize: '11px',
            fontWeight: 600,
            color: COLORS.text,
          }}
        >
          Cloud-Projekte
        </div>

        {/* New Project Button */}
        {onOpenNewProject && (
          <div
            style={{
              padding: '8px',
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              onClick={onOpenNewProject}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: COLORS.buttonBg,
                color: COLORS.text,
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span>
              Neues Projekt
            </button>
          </div>
        )}

        {/* Projects List */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 0',
          }}
        >
          {loading && (
            <div style={{ padding: '12px', textAlign: 'center', color: COLORS.textMuted, fontSize: '11px' }}>
              Laden...
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', textAlign: 'center', color: COLORS.danger, fontSize: '11px' }}>
              {error}
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', color: COLORS.textMuted, fontSize: '11px' }}>
              Keine Projekte
            </div>
          )}

          {!loading && projects.map(project => (
            <div
              key={project.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                backgroundColor: project.id === currentProjectId ? COLORS.buttonBgSelected : 'transparent',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (project.id !== currentProjectId) {
                  onSelectProject(project.id)
                  onClose()
                }
              }}
            >
              {/* Project Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingProject === project.id ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(project.id, editName)
                        if (e.key === 'Escape') setEditingProject(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '3px 6px',
                        backgroundColor: COLORS.buttonBg,
                        border: 'none',
                        borderRadius: '3px',
                        color: COLORS.text,
                        fontSize: '11px',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRename(project.id, editName)
                      }}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: COLORS.buttonBgSelected,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: project.id === currentProjectId ? 500 : 400,
                        color: COLORS.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {project.id}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: COLORS.textMuted,
                        marginTop: '1px',
                      }}
                    >
                      {formatDate(project.savedAt)}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {editingProject !== project.id && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  {deleteConfirm === project.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(project.id)
                        }}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: COLORS.danger,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Ja
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(null)
                        }}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: COLORS.buttonBg,
                          color: COLORS.text,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Nein
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProject(project.id)
                          setEditName(project.id)
                        }}
                        style={{
                          padding: '4px',
                          backgroundColor: 'transparent',
                          color: COLORS.textMuted,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          display: 'flex',
                          opacity: 0.7,
                        }}
                        title="Umbenennen"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(project.id)
                        }}
                        style={{
                          padding: '4px',
                          backgroundColor: 'transparent',
                          color: COLORS.textMuted,
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          display: 'flex',
                          opacity: 0.7,
                        }}
                        title="Löschen"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: '10px',
            color: COLORS.textMuted,
          }}
        >
          {currentProjectId ? (
            <>Aktiv: {currentProjectId}</>
          ) : (
            <>Lokal (kein Cloud-Projekt)</>
          )}
        </div>
      </div>
    </>
  )
}
