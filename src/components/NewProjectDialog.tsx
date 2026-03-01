/**
 * New Project Dialog
 *
 * Allows users to create a new project with a custom name
 * and choose from demo templates with preview images.
 */

import { useState } from 'react'
import { starterTemplates, type StarterTemplate } from '../templates/starter-project'
import { colors } from '../theme'

interface NewProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (projectName: string, templateId: 'example' | 'empty') => void
  existingProjectNames?: string[]
}

/**
 * Generate a unique project name that doesn't exist yet
 */
function generateUniqueProjectName(existingNames: string[]): string {
  const nameSet = new Set(existingNames.map(n => n.toLowerCase()))
  let counter = 1
  while (nameSet.has(`projekt-${counter}`)) {
    counter++
  }
  return `projekt-${counter}`
}

// Preview images for templates (stored in public folder)
const templatePreviews: Record<string, string> = {
  'example': `${import.meta.env.BASE_URL}previews/demo-dashboard.svg`,
  'empty': `${import.meta.env.BASE_URL}previews/empty-project.svg`,
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onDoubleClick,
}: {
  template: StarterTemplate
  selected: boolean
  onSelect: () => void
  onDoubleClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const previewUrl = templatePreviews[template.id]

  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '0',
        backgroundColor: '#181818',
        border: selected ? '1px solid #3B82F6' : '1px solid transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        transition: 'all 0.15s',
        outline: hovered && !selected ? `1px solid ${colors.border}` : 'none',
      }}
    >
      {/* Preview Image */}
      <div style={{
        width: '100%',
        height: '120px',
        backgroundColor: '#0c0c0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={template.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.9,
            }}
            onError={(e) => {
              // Fallback if image doesn't exist
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '4px',
            backgroundColor: colors.tabActive,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {template.id === 'example' ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </>
              ) : (
                <>
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px' }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 500,
          color: selected ? colors.text : '#A1A1AA',
          margin: '0 0 4px 0',
        }}>
          {template.name}
        </h3>
        <p style={{
          fontSize: '11px',
          color: colors.textMuted,
          margin: 0,
          lineHeight: 1.4,
        }}>
          {template.description}
        </p>
      </div>
    </button>
  )
}

export function NewProjectDialog({ isOpen, onClose, onCreateProject, existingProjectNames = [] }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<'example' | 'empty'>('empty')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Quick create with auto-generated name (double-click)
  const handleQuickCreate = (templateId: 'example' | 'empty') => {
    const uniqueName = generateUniqueProjectName(existingProjectNames)
    onCreateProject(uniqueName, templateId)
    setProjectName('')
    setSelectedTemplate('empty')
    setError(null)
    onClose()
  }

  const handleCreate = () => {
    const trimmedName = projectName.trim()

    // Validate project name
    if (!trimmedName) {
      setError('Bitte gib einen Projektnamen ein')
      return
    }

    // Only allow URL-safe characters
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
      setError('Nur Buchstaben, Zahlen, Bindestrich und Unterstrich erlaubt')
      return
    }

    onCreateProject(trimmedName, selectedTemplate)

    // Reset state
    setProjectName('')
    setSelectedTemplate('empty')
    setError(null)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && projectName.trim()) {
      handleCreate()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          margin: '0 16px',
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px',
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 500,
            color: colors.text,
            margin: 0,
          }}>
            Neues Projekt erstellen
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: '0 28px 24px' }}>
          {/* Project Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label
                htmlFor="project-name"
                style={{
                  fontSize: '11px',
                  color: '#666',
                }}
              >
                Projektname
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value)
                  setError(null)
                }}
                placeholder="mein-projekt"
                autoFocus
                style={{
                  width: '200px',
                  height: '24px',
                  padding: '0 8px',
                  fontSize: '11px',
                  backgroundColor: '#181818',
                  border: 'none',
                  borderRadius: '4px',
                  color: colors.text,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {error && (
              <p style={{
                fontSize: '11px',
                color: '#EF4444',
                margin: '6px 0 0 0',
                marginLeft: '90px',
              }}>
                {error}
              </p>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 400,
                color: colors.textMuted,
                marginBottom: '12px',
              }}
            >
              Vorlage
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}>
              {starterTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate === template.id}
                  onSelect={() => setSelectedTemplate(template.id)}
                  onDoubleClick={() => handleQuickCreate(template.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#181818',
              color: '#555',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim()}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              backgroundColor: '#181818',
              color: projectName.trim() ? '#3B82F6' : '#555',
              border: 'none',
              borderRadius: '4px',
              cursor: projectName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Erstellen
          </button>
        </div>
      </div>
    </div>
  )
}
