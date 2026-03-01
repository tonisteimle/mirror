/**
 * Starter Project Templates
 *
 * Pre-filled project content for new users to get started quickly.
 * Includes example pages, data definitions, and layouts.
 */

import { defaultTokensCode, defaultComponentsCode } from '../hooks/useEditor'
import type { PageData } from '../components/PageSidebar'

// =============================================================================
// EXAMPLE DATA
// =============================================================================

export const exampleDataCode = `--- Tasks ---

Task:
  title: text
  done: boolean
  priority: text

- Task "Design Review", false, "high"
- Task "Code Refactoring", true, "medium"
- Task "Write Tests", false, "medium"
- Task "Update Docs", false, "low"

--- Users ---

User:
  name: text
  email: text
  role: text
  avatar: text

- User "Anna Schmidt", "anna@example.com", "Admin", "https://i.pravatar.cc/150?u=anna"
- User "Max Müller", "max@example.com", "Developer", "https://i.pravatar.cc/150?u=max"
- User "Lisa Weber", "lisa@example.com", "Designer", "https://i.pravatar.cc/150?u=lisa"

--- Projects ---

Project:
  name: text
  status: text
  progress: number

- Project "Website Redesign", "active", 75
- Project "Mobile App", "planning", 20
- Project "API Integration", "completed", 100
`

// =============================================================================
// EXAMPLE PAGES
// =============================================================================

export const exampleDashboardLayout = `App
  Header
    Logo "Dashboard"
    Nav
      NavItem NavIcon "home"; NavLabel "Home"
      NavItem NavIcon "folder"; NavLabel "Projekte"
      NavItem NavIcon "users"; NavLabel "Team"
      NavItem NavIcon "settings"; NavLabel "Einstellungen"
  Main
    Title "Willkommen"
    Text col $muted.col, "Hier ist dein Dashboard mit einer Übersicht."

    Box hor, gap $l, wrap
      Card width 300
        CardTitle "Aufgaben"
        List data Tasks
          ListItem
            ItemIcon if $item.done then "check-circle" else "circle"
            ItemLabel $item.title
            Badge $item.priority

      Card width 300
        CardTitle "Team"
        List data Users
          ListItem
            Avatar
              Image $item.avatar, width 32, height 32, radius 16
            ItemLabel $item.name
            Badge $item.role

      Card width 300
        CardTitle "Projekte"
        List data Projects
          ListItem
            ItemLabel $item.name
            Badge $item.status
`

export const exampleSettingsLayout = `App
  Header
    Logo "Einstellungen"
    SecondaryButton ButtonIcon "arrow-left"; ButtonLabel "Zurück", onclick page Dashboard
  Main
    Card
      CardTitle "Profil"
      FormField
        FieldLabel "Name"
        FieldInput placeholder "Dein Name"
      FormField
        FieldLabel "E-Mail"
        FieldInput placeholder "deine@email.com"
      Box hor, gap $s, right
        SecondaryButton "Abbrechen"
        Button "Speichern"

    Card
      CardTitle "Benachrichtigungen"
      ListItem
        ItemLabel "E-Mail Benachrichtigungen"
        Icon "toggle-right", col $primary.col
      ListItem
        ItemLabel "Push Benachrichtigungen"
        Icon "toggle-left", col $muted.col
`

export const exampleFormLayout = `App
  Header
    Logo "Neue Aufgabe"
  Main center
    Card width 400
      CardTitle "Aufgabe erstellen"

      FormField
        FieldLabel "Titel"
        FieldInput placeholder "Was muss erledigt werden?"

      FormField
        FieldLabel "Priorität"
        Box hor, gap $s
          Badge "Hoch"
          Badge "Mittel"
          Badge "Niedrig"

      FormField
        FieldLabel "Beschreibung"
        Textarea placeholder "Optionale Details..."

      Box hor, gap $s, spread
        SecondaryButton "Abbrechen"
        Button ButtonIcon "plus"; ButtonLabel "Erstellen"
`

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

export interface StarterTemplate {
  id: 'example' | 'empty'
  name: string
  description: string
  icon: string
}

export const starterTemplates: StarterTemplate[] = [
  {
    id: 'empty',
    name: 'Leeres Projekt',
    description: 'Komplett leer starten',
    icon: 'file',
  },
  {
    id: 'example',
    name: 'Mit Beispieldaten',
    description: 'Tokens, Komponenten und Daten vordefiniert',
    icon: 'layout-dashboard',
  },
]

// =============================================================================
// TEMPLATE GENERATORS
// =============================================================================

export interface ProjectTemplate {
  tokensCode: string
  componentsCode: string
  dataCode: string
  pages: PageData[]
  currentPageId: string
}

/**
 * Generate a project from the example template
 *
 * Only Data, Tokens, and Components have example content.
 * Pages start empty - the user builds their own layouts.
 */
export function generateExampleProject(): ProjectTemplate {
  const pages: PageData[] = [
    {
      id: 'page-1',
      name: 'Page 1',
      layoutCode: '',
    },
  ]

  return {
    tokensCode: defaultTokensCode,
    componentsCode: defaultComponentsCode,
    dataCode: exampleDataCode,
    pages,
    currentPageId: 'page-1',
  }
}

/**
 * Generate an empty project (truly empty - no tokens, no components)
 */
export function generateEmptyProject(): ProjectTemplate {
  const pages: PageData[] = [
    {
      id: 'page-1',
      name: 'Page 1',
      layoutCode: '',
    },
  ]

  return {
    tokensCode: '',
    componentsCode: '',
    dataCode: '',
    pages,
    currentPageId: 'page-1',
  }
}

/**
 * Get project template by ID
 */
export function getProjectTemplate(templateId: 'example' | 'empty'): ProjectTemplate {
  switch (templateId) {
    case 'example':
      return generateExampleProject()
    case 'empty':
    default:
      return generateEmptyProject()
  }
}
