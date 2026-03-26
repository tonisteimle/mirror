/**
 * LLM Test Scenarios
 *
 * Test cases for different complexity levels and codebase contexts
 */

import type { TestScenario } from './types'
import { TOKEN_SETS, COMPONENT_SETS } from './types'

// =============================================================================
// SIMPLE: Button
// =============================================================================

export const simpleScenarios: TestScenario[] = [
  {
    id: 'simple-button-empty',
    name: 'Simple Button (No Codebase)',
    complexity: 'simple',
    context: 'empty',
    userPrompt: 'Create a primary button with text "Click me"',
    expectedElements: ['Button'],
    validation: {
      hasComponents: ['Button'],
      minElements: 1,
    },
    editAction: {
      selector: 'Button',
      property: 'bg',
      newValue: '#EF4444',
    },
  },
  {
    id: 'simple-button-with-tokens',
    name: 'Simple Button (With Tokens)',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Create a primary button with text "Submit"',
    existingCode: TOKEN_SETS.minimal,
    expectedElements: ['Button'],
    validation: {
      hasTokens: true,
      hasComponents: ['Button'],
    },
    editAction: {
      selector: 'Button',
      property: 'pad',
      newValue: '16 32',
    },
  },
  {
    id: 'simple-button-reuse',
    name: 'Simple Button (Reuse Component)',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Add a button that says "Cancel"',
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.basic,
    expectedElements: ['Button'],
    validation: {
      hasComponents: ['Button'],
    },
  },
]

// =============================================================================
// MEDIUM: List
// =============================================================================

export const mediumScenarios: TestScenario[] = [
  {
    id: 'medium-list-empty',
    name: 'Task List (No Codebase)',
    complexity: 'medium',
    context: 'empty',
    userPrompt: 'Create a simple task list with 3 items: "Buy groceries", "Walk the dog", "Read a book"',
    expectedElements: ['List', 'ListItem', 'Text'],
    validation: {
      minElements: 4, // List + 3 items
    },
    editAction: {
      selector: 'ListItem',
      property: 'pad',
      newValue: '12',
    },
  },
  {
    id: 'medium-list-with-components',
    name: 'Task List (With Components)',
    complexity: 'medium',
    context: 'with-components',
    userPrompt: 'Create a task list with checkboxes for: "Email client", "Meeting notes", "Code review"',
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.full,
    expectedElements: ['List', 'ListItem'],
    validation: {
      hasComponents: ['List', 'ListItem'],
    },
  },
  {
    id: 'medium-user-list',
    name: 'User List with Avatars',
    complexity: 'medium',
    context: 'mixed',
    userPrompt: 'Create a list of 3 users with avatars and names',
    existingCode: TOKEN_SETS.full + '\n' + `
Avatar as frame:
  w 32, h 32, rad 16, bg $elevated.bg
`,
    expectedElements: ['List', 'Avatar', 'Text'],
    validation: {
      hasComponents: ['Avatar'],
      minElements: 4,
    },
  },
]

// =============================================================================
// HARD: Navigation
// =============================================================================

export const hardScenarios: TestScenario[] = [
  {
    id: 'hard-nav-empty',
    name: 'Sidebar Navigation (No Codebase)',
    complexity: 'hard',
    context: 'empty',
    userPrompt: `Create a sidebar navigation with:
- Logo at top
- 4 nav items: Dashboard, Projects, Team, Settings
- Each item should have an icon placeholder and label
- Active state for Dashboard`,
    expectedElements: ['Sidebar', 'Logo', 'NavItem', 'Icon', 'Label'],
    validation: {
      minElements: 6,
    },
    editAction: {
      selector: 'Sidebar',
      property: 'w',
      newValue: '280',
    },
  },
  {
    id: 'hard-nav-with-components',
    name: 'Sidebar Navigation (With Components)',
    complexity: 'hard',
    context: 'with-components',
    userPrompt: `Create a sidebar navigation using existing components:
- Logo area
- Nav items: Home, Analytics, Users, Settings
- Highlight the active item`,
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.full,
    expectedElements: ['Sidebar', 'NavItem'],
    validation: {
      hasComponents: ['ListItem'], // Should reuse ListItem for NavItem
    },
  },
  {
    id: 'hard-header-nav',
    name: 'Header with Navigation',
    complexity: 'hard',
    context: 'mixed',
    userPrompt: `Create a header bar with:
- Logo on the left
- Navigation links: Features, Pricing, About
- Sign In and Sign Up buttons on the right`,
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.basic,
    expectedElements: ['Header', 'Logo', 'Nav', 'Button'],
    validation: {
      hasComponents: ['Button'],
      minElements: 7,
    },
  },
]

// =============================================================================
// COMPLEX: Dashboard
// =============================================================================

export const complexScenarios: TestScenario[] = [
  {
    id: 'complex-dashboard-empty',
    name: 'Analytics Dashboard (No Codebase)',
    complexity: 'complex',
    context: 'empty',
    userPrompt: `Create an analytics dashboard with:
- Header with title "Analytics" and date range selector
- Row of 4 stat cards: Users (1,234), Revenue ($12,345), Orders (567), Conversion (12.3%)
- Each card should have a label, value, and trend indicator`,
    expectedElements: ['Dashboard', 'Header', 'StatCard', 'Label', 'Value'],
    validation: {
      minElements: 10,
    },
    editAction: {
      selector: 'StatCard',
      property: 'bg',
      newValue: '#27272A',
    },
  },
  {
    id: 'complex-dashboard-with-components',
    name: 'Analytics Dashboard (With Components)',
    complexity: 'complex',
    context: 'with-components',
    userPrompt: `Create a dashboard using existing components:
- Header section with title
- 3 stat cards showing KPIs
- A recent activity list below`,
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.full,
    expectedElements: ['Dashboard', 'Card', 'List', 'ListItem'],
    validation: {
      hasComponents: ['Card', 'Title', 'List', 'ListItem'],
    },
  },
  {
    id: 'complex-settings-page',
    name: 'Settings Page',
    complexity: 'complex',
    context: 'mixed',
    userPrompt: `Create a settings page with:
- Sidebar with settings categories: Profile, Account, Notifications, Security
- Main content area with form fields
- Save and Cancel buttons at the bottom`,
    existingCode: TOKEN_SETS.full + '\n' + COMPONENT_SETS.full,
    expectedElements: ['Settings', 'Sidebar', 'Form', 'Input', 'Button'],
    validation: {
      hasComponents: ['Button', 'Input'],
      minElements: 8,
    },
  },
  {
    id: 'complex-kanban-board',
    name: 'Kanban Board',
    complexity: 'complex',
    context: 'empty',
    userPrompt: `Create a simple Kanban board with 3 columns:
- To Do (2 cards)
- In Progress (1 card)
- Done (2 cards)
Each card should have a title and assignee avatar`,
    expectedElements: ['Board', 'Column', 'Card', 'Avatar'],
    validation: {
      minElements: 12,
    },
  },
]

// =============================================================================
// CONTEXTUAL: Editor Context Scenarios
// =============================================================================

export const contextualScenarios: TestScenario[] = [
  // User has selected an element and wants to add something inside
  {
    id: 'context-add-inside-card',
    name: 'Add Button Inside Selected Card',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Füge hier einen Button hinzu',
    existingCode: `Card as frame:
  pad 16, bg #1A1A23, rad 8

App
  Header
    Title "Dashboard"
  Content
    Card
      Text "Welcome"`,
    editorContext: {
      cursorLine: 8,
      selectedNodeId: 'node-5',
      selectedNodeName: 'Card',
      ancestors: ['App', 'Content'],
      insideComponent: 'Card',
      surroundingCode: {
        before: `  Content
    Card`,
        after: `      Text "Welcome"`,
      },
    },
    expectedAction: 'insert',
    expectedElements: ['Button'],
    validation: {
      insertsAt: 'inside-selected',
      hasComponents: ['Button'],
    },
  },

  // User has selected a ListItem and wants to modify it
  {
    id: 'context-modify-selected',
    name: 'Modify Selected ListItem',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Mach das größer',
    existingCode: TOKEN_SETS.full + `
List
  ListItem pad 8
    Text "Item 1"
  ListItem pad 8
    Text "Item 2"`,
    editorContext: {
      cursorLine: 4,
      selectedNodeId: 'node-3',
      selectedNodeName: 'ListItem',
      ancestors: ['List'],
      insideComponent: 'ListItem',
    },
    expectedAction: 'modify',
    validation: {
      hasProperties: {
        'ListItem': ['pad'],  // Should have larger padding
      },
    },
  },

  // User wants to add element after current position
  {
    id: 'context-add-after',
    name: 'Add Navigation After Header',
    complexity: 'medium',
    context: 'mixed',
    userPrompt: 'Füge eine Navigation mit Home, About, Contact hinzu',
    existingCode: `App
  Header
    Logo "MyApp"
  Content
    Text "Welcome"`,
    editorContext: {
      cursorLine: 3,
      selectedNodeName: 'Header',
      ancestors: ['App'],
      insideComponent: 'App',
      surroundingCode: {
        before: `App
  Header
    Logo "MyApp"`,
        after: `  Content
    Text "Welcome"`,
      },
    },
    expectedAction: 'insert',
    expectedElements: ['Nav', 'NavItem'],
    validation: {
      insertsAt: 'after-selected',
      minElements: 4,
    },
  },

  // User selects element and wants to change color
  {
    id: 'context-change-color',
    name: 'Change Color of Selected Button',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Mach den rot',
    existingCode: TOKEN_SETS.full + `
Card
  Title "Settings"
  Button bg $accent.bg, "Save"
  Button bg $elevated.bg, "Cancel"`,
    editorContext: {
      cursorLine: 4,
      selectedNodeId: 'node-3',
      selectedNodeName: 'Button',
      ancestors: ['Card'],
      surroundingCode: {
        before: `  Title "Settings"`,
        after: `  Button bg $elevated.bg, "Cancel"`,
      },
    },
    expectedAction: 'modify',
    validation: {
      hasProperties: {
        'Button': ['bg'],  // Should have red background
      },
    },
  },

  // User wants to wrap selected element
  {
    id: 'context-wrap-element',
    name: 'Wrap Selected in Container',
    complexity: 'medium',
    context: 'with-components',
    userPrompt: 'Packe das in eine Card',
    existingCode: `App
  Header
    Title "App"
  Button "Click me"
  Button "Cancel"`,
    editorContext: {
      cursorLine: 4,
      selectedNodeId: 'node-3',
      selectedNodeName: 'Button',
      ancestors: ['App'],
    },
    expectedAction: 'wrap',
    expectedElements: ['Card', 'Button'],
  },

  // User is in a List and wants to add more items
  {
    id: 'context-add-list-items',
    name: 'Add Items to List',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Füge noch zwei Items hinzu: Settings und Profile',
    existingCode: TOKEN_SETS.full + `
Sidebar
  List gap 8
    ListItem "Home"
    ListItem "Dashboard"`,
    editorContext: {
      cursorLine: 5,
      insideComponent: 'List',
      ancestors: ['Sidebar', 'List'],
      surroundingCode: {
        before: `  List gap 8
    ListItem "Home"
    ListItem "Dashboard"`,
        after: '',
      },
    },
    expectedAction: 'insert',
    validation: {
      insertsAt: 'inside-selected',
      minElements: 2,
    },
  },

  // User selected element from preview click
  {
    id: 'context-preview-selection',
    name: 'Modify Element Selected in Preview',
    complexity: 'simple',
    context: 'with-components',
    userPrompt: 'Runde die Ecken ab',
    existingCode: `Card
  Image src "/hero.jpg", w 300, h 200
  Title "Welcome"
  Text "Description"`,
    editorContext: {
      cursorLine: 2,
      selectedNodeId: 'node-2',
      selectedNodeName: 'Image',
      ancestors: ['Card'],
    },
    expectedAction: 'modify',
    validation: {
      hasProperties: {
        'Image': ['rad'],
      },
    },
  },

  // Deep nesting context
  {
    id: 'context-deep-nesting',
    name: 'Add in Deeply Nested Context',
    complexity: 'medium',
    context: 'mixed',
    userPrompt: 'Füge einen Icon vor dem Text hinzu',
    existingCode: `Dashboard
  Sidebar
    Nav
      Section
        NavItem
          Text "Home"`,
    editorContext: {
      cursorLine: 6,
      selectedNodeName: 'NavItem',
      ancestors: ['Dashboard', 'Sidebar', 'Nav', 'Section'],
      insideComponent: 'NavItem',
    },
    expectedAction: 'insert',
    expectedElements: ['Icon'],
    validation: {
      insertsAt: 'inside-selected',
    },
  },
]

// All scenarios combined
export const allScenarios: TestScenario[] = [
  ...simpleScenarios,
  ...mediumScenarios,
  ...hardScenarios,
  ...complexScenarios,
  ...contextualScenarios,
]

// Get scenarios by complexity
export function getScenariosByComplexity(complexity: TestScenario['complexity']): TestScenario[] {
  return allScenarios.filter(s => s.complexity === complexity)
}

// Get scenarios by context
export function getScenariosByContext(context: TestScenario['context']): TestScenario[] {
  return allScenarios.filter(s => s.context === context)
}

// Get contextual scenarios (with editor context)
export function getContextualScenarios(): TestScenario[] {
  return allScenarios.filter(s => s.editorContext !== undefined)
}

// Get scenarios by expected action
export function getScenariosByAction(action: TestScenario['expectedAction']): TestScenario[] {
  return allScenarios.filter(s => s.expectedAction === action)
}
