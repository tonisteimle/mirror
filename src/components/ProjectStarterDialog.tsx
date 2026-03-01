/**
 * Project Starter Dialog
 *
 * Shows when creating a new project or when no project exists.
 * Lets users choose between a pre-filled example project or an empty project.
 */

import { starterTemplates, type StarterTemplate } from '../templates/starter-project'
import {
  LayoutDashboard,
  File,
  Check,
} from 'lucide-react'
import { colors } from '../theme'

interface ProjectStarterDialogProps {
  onSelect: (templateId: 'example' | 'empty') => void
  projectName?: string
}

const iconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  'layout-dashboard': LayoutDashboard,
  'file': File,
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: StarterTemplate
  onSelect: () => void
}) {
  const IconComponent = iconMap[template.icon] || File

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.hover
        e.currentTarget.style.borderColor = colors.accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.panel
        e.currentTarget.style.borderColor = colors.border
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        backgroundColor: colors.tabActive,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <IconComponent size={20} style={{ color: colors.textMuted }} />
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 500,
          color: colors.text,
          marginBottom: '4px',
        }}>
          {template.name}
        </h3>
        <p style={{
          fontSize: '12px',
          color: colors.textMuted,
          margin: 0,
        }}>
          {template.description}
        </p>
      </div>

      <div style={{
        width: '100%',
        paddingTop: '12px',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: colors.textMuted,
      }}>
        <Check size={14} />
        <span>Auswählen</span>
      </div>
    </button>
  )
}

export function ProjectStarterDialog({ onSelect, projectName }: ProjectStarterDialogProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        margin: '0 16px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: colors.text,
            margin: 0,
          }}>
            Neues Projekt starten
          </h2>
          {projectName && projectName !== 'default' && (
            <p style={{
              fontSize: '13px',
              color: colors.textMuted,
              margin: '4px 0 0 0',
            }}>
              Projekt: {projectName}
            </p>
          )}
          <p style={{
            fontSize: '13px',
            color: colors.textMuted,
            margin: '8px 0 0 0',
          }}>
            Wähle eine Vorlage für dein neues Projekt
          </p>
        </div>

        {/* Template Options */}
        <div style={{
          padding: '16px',
          display: 'grid',
          gap: '12px',
        }}>
          {starterTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => onSelect(template.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderTop: `1px solid ${colors.border}`,
        }}>
          <p style={{
            fontSize: '12px',
            color: colors.textMuted,
            textAlign: 'center',
            margin: 0,
          }}>
            Du kannst jederzeit alles anpassen und erweitern
          </p>
        </div>
      </div>
    </div>
  )
}
