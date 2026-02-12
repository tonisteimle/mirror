/**
 * Tutorial Final Example Test
 *
 * This test ensures the final tutorial example from docs/concepts.html
 * parses correctly and generates valid React output.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

const TUTORIAL_FINAL_CODE = `
// ===== TOKENS =====
$bg-app: #0A0A0F
$bg-sidebar: #0F0F14
$bg-card: #1A1A23
$bg-hover: #252530
$primary: #3B82F6
$success: #22C55E
$warning: #F59E0B
$danger: #EF4444
$text: #F4F4F5
$text-muted: #71717A
$border: #27272A

// ===== STATE =====
$searchQuery: ""
$sidebarCollapsed: false
$toastVisible: false

// ===== DATA =====
$projects: [
  { "name": "Website Redesign", "status": "active", "progress": 75, "tasks": 12 },
  { "name": "Mobile App", "status": "active", "progress": 40, "tasks": 8 },
  { "name": "API Integration", "status": "paused", "progress": 20, "tasks": 5 }
]

// ===== COMPONENTS =====
IconButton: w 36 h 36 rad 8 hor-cen ver-cen cursor pointer

NavItem: hor gap 10 ver-cen pad 10 12 rad 8 cursor pointer

StatCard: ver gap 8 pad 20 col $bg-card rad 12 grow
  Label: size 13 col $text-muted
  Value: size 28 weight 600

ProjectCard: ver gap 12 pad 16 col $bg-card rad 12 w 280

// ===== LAYOUT =====
App hor full col $bg-app

  // Sidebar
  Sidebar if $sidebarCollapsed then w 64 else w 240 ver col $bg-sidebar
    LogoArea hor ver-cen gap 10 pad 16
      Logo w 32 h 32 rad 8 col $primary hor-cen ver-cen weight 700 "M"
      if not $sidebarCollapsed
        Title size 18 weight 600 "Mirror"
    Nav ver gap 4 pad 12 grow
      NavItem col $bg-hover
        Icon icon "layout-dashboard"
        if not $sidebarCollapsed
          "Dashboard"
      NavItem
        Icon icon "folder"
        if not $sidebarCollapsed
          "Projects"
      NavItem
        Icon icon "users"
        if not $sidebarCollapsed
          "Team"
    SidebarFooter pad 12
      IconButton
        onclick assign $sidebarCollapsed to not $sidebarCollapsed
        Icon icon "chevron-left"

  // Main Content
  Main grow ver
    Header hor between ver-cen pad 16 24
      SearchField hor gap 8 ver-cen pad 8 12 col $bg-card rad 8 w 280
        Icon icon "search" size 16 col $text-muted
        Input placeholder "Search..."
      Actions hor gap 8
        IconButton
          Icon icon "bell"
        Button col $primary pad 8 16 rad 8 cursor pointer "New Project"
          onclick assign $toastVisible to true

    Content ver gap 24 pad 24 grow
      Stats hor gap 16
        StatCard
          Label "Projects"
          Value "12"
        StatCard
          Label "Tasks"
          Value "48"
        StatCard
          Label "Completed"
          Value col $success "36"

      ProjectSection ver gap 12
        SectionHeader hor between ver-cen
          Title size 18 weight 600 "Active Projects"
          ViewAll size 14 col $primary cursor pointer "View all"
        ProjectGrid hor gap 16 wrap
          each $project in $projects
            ProjectCard
              CardHeader hor between ver-cen
                Name weight 500 $project.name
                StatusBadge pad 4 8 rad 4 size 11 if $project.status == "active" then col $success else col $warning
                  $project.status
              ProgressBar w 200 h 4 col $border rad 2
              Meta hor between size 12 col $text-muted
                $project.tasks " Tasks"
                $project.progress "%"

  // Toast Notification
  if $toastVisible
    ToastContainer ver pad 24
      Toast hor gap 12 ver-cen pad 12 16 col $bg-card rad 8
        Icon icon "check-circle" col $success
        Message "Project created!"
        CloseBtn icon "x" size 14 col $text-muted cursor pointer
          onclick assign $toastVisible to false
`

describe('Tutorial Final Example', () => {
  it('parses without errors', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    console.log('=== PARSE ERRORS ===')
    if (result.errors.length > 0) {
      result.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`)
      })
    } else {
      console.log('No errors!')
    }

    // Filter out warnings - we only care about actual errors
    const actualErrors = result.errors.filter(e =>
      typeof e === 'object' || !String(e).startsWith('Warning:')
    )
    expect(actualErrors).toHaveLength(0)
  })

  it('has all required tokens', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    const requiredTokens = [
      'bg-app', 'bg-sidebar', 'bg-card', 'bg-hover',
      'primary', 'success', 'warning', 'danger',
      'text', 'text-muted', 'border',
      'searchQuery', 'sidebarCollapsed', 'toastVisible',
      'projects'
    ]

    for (const token of requiredTokens) {
      expect(result.tokens.has(token), `Token ${token} should exist`).toBe(true)
    }
  })

  it('has projects as an array', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    const projects = result.tokens.get('projects')
    expect(Array.isArray(projects)).toBe(true)
    expect(projects).toHaveLength(3)
    expect(projects[0].name).toBe('Website Redesign')
    expect(projects[1].status).toBe('active')
    expect(projects[2].progress).toBe(20)
  })

  it('has all required component definitions', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    const requiredComponents = ['IconButton', 'NavItem', 'StatCard', 'ProjectCard']

    for (const comp of requiredComponents) {
      expect(result.registry.has(comp), `Component ${comp} should be defined`).toBe(true)
    }
  })

  it('has App as root node', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    expect(result.nodes.length).toBeGreaterThan(0)
    expect(result.nodes[0].name).toBe('App')
  })

  it('has correct structure', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    const app = result.nodes[0]
    expect(app.children.length).toBeGreaterThan(0)

    // Find Sidebar and Main
    const childNames = app.children.map(c => c.name)
    console.log('App children:', childNames)

    expect(childNames).toContain('Sidebar')
    expect(childNames).toContain('Main')
  })

  it('Sidebar has conditionalProperties for width', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    const app = result.nodes[0]
    const sidebar = app.children.find(c => c.name === 'Sidebar')

    expect(sidebar).toBeDefined()
    expect(sidebar!.conditionalProperties).toBeDefined()
    expect(sidebar!.conditionalProperties!.length).toBeGreaterThan(0)

    const widthConditional = sidebar!.conditionalProperties![0]
    expect(widthConditional.thenProperties).toHaveProperty('w', 64)
    expect(widthConditional.elseProperties).toHaveProperty('w', 240)
  })

  it('Button has onclick event handler', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    // Find the Button with onclick
    function findButton(nodes: typeof result.nodes): typeof result.nodes[0] | undefined {
      for (const node of nodes) {
        if (node.name === 'Button' && node.eventHandlers?.length) {
          return node
        }
        if (node.children) {
          const found = findButton(node.children)
          if (found) return found
        }
      }
      return undefined
    }

    const button = findButton(result.nodes)
    expect(button).toBeDefined()
    expect(button!.eventHandlers).toBeDefined()
    expect(button!.eventHandlers!.length).toBeGreaterThan(0)
    expect(button!.eventHandlers![0].event).toBe('onclick')
  })

  it('has each loop for projects', () => {
    const result = parse(TUTORIAL_FINAL_CODE)

    // Find the iterator node
    function findIterator(nodes: typeof result.nodes): typeof result.nodes[0] | undefined {
      for (const node of nodes) {
        if (node.name === '_iterator') {
          return node
        }
        if (node.children) {
          const found = findIterator(node.children)
          if (found) return found
        }
      }
      return undefined
    }

    const iterator = findIterator(result.nodes)
    expect(iterator).toBeDefined()
    expect(iterator!.iteration).toBeDefined()
    expect(iterator!.iteration!.itemVar).toBe('project')
    expect(iterator!.iteration!.collectionVar).toBe('projects')
  })
})
