/**
 * Fixer Test Scenarios
 *
 * Comprehensive test scenarios covering all aspects of the Mirror DSL Fixer.
 * Each scenario defines:
 * - Initial files state
 * - User prompt
 * - Expected mock response
 * - Validation criteria
 *
 * Categories:
 * 1. Basic Elements
 * 2. Styling
 * 3. Layout
 * 4. Components
 * 5. Tokens
 * 6. Events & Actions
 * 7. States
 * 8. Multi-File Operations
 * 9. Edge Cases
 * 10. Complex Scenarios
 */

import { createMockFixerResponse } from './fixer-harness'
import type { FixerResponse } from '../types'

// ============================================
// TYPES
// ============================================

export interface TestScenario {
  /** Unique scenario ID */
  id: string
  /** Human-readable name */
  name: string
  /** Category for grouping */
  category: ScenarioCategory
  /** Description of what this tests */
  description: string
  /** Initial project files */
  files: Record<string, string>
  /** Current file (optional, defaults to first file) */
  currentFile?: string
  /** Cursor position (optional) */
  cursor?: { line: number; column: number }
  /** User prompt */
  prompt: string
  /** Mock response for testing */
  mockResponse: FixerResponse
  /** Validation criteria */
  validate: ValidationCriteria
  /** Tags for filtering */
  tags?: string[]
  /** Skip this scenario */
  skip?: boolean
  /** Only run this scenario */
  only?: boolean
}

export type ScenarioCategory =
  | 'basic'
  | 'styling'
  | 'layout'
  | 'components'
  | 'tokens'
  | 'events'
  | 'states'
  | 'multi-file'
  | 'edge-cases'
  | 'complex'

export interface ValidationCriteria {
  /** Files that should be changed */
  filesChanged?: string[]
  /** Files that should be created */
  filesCreated?: string[]
  /** Content checks */
  fileContains?: { file: string; contains: string | string[] }[]
  /** Content should NOT contain */
  fileNotContains?: { file: string; notContains: string | string[] }[]
  /** Exact file content match */
  fileEquals?: { file: string; equals: string }[]
  /** Should succeed */
  shouldSucceed?: boolean
  /** Should fail with error */
  shouldFailWith?: string
}

// ============================================
// 1. BASIC ELEMENTS
// ============================================

export const basicScenarios: TestScenario[] = [
  {
    id: 'basic-001',
    name: 'Simple Button',
    category: 'basic',
    description: 'Create a simple button',
    files: { 'app.mir': 'Box' },
    prompt: '/Button hinzufügen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Button "Click"' }
    ], 'Button hinzugefügt'),
    validate: {
      filesChanged: ['app.mir'],
      fileContains: [{ file: 'app.mir', contains: 'Button' }]
    },
    tags: ['button', 'simple']
  },
  {
    id: 'basic-002',
    name: 'Button with Text',
    category: 'basic',
    description: 'Create a button with custom text',
    files: { 'app.mir': 'Box' },
    prompt: '/Button mit Text "Absenden"',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Button "Absenden"' }
    ], 'Button mit Text erstellt'),
    validate: {
      fileContains: [{ file: 'app.mir', contains: '"Absenden"' }]
    },
    tags: ['button', 'text']
  },
  {
    id: 'basic-003',
    name: 'Text Element',
    category: 'basic',
    description: 'Add a text element',
    files: { 'app.mir': 'Box' },
    prompt: '/Text "Willkommen"',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Willkommen"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Text "Willkommen"' }]
    },
    tags: ['text']
  },
  {
    id: 'basic-004',
    name: 'Input Field',
    category: 'basic',
    description: 'Add an input field',
    files: { 'app.mir': 'Box' },
    prompt: '/Eingabefeld für Email',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Input placeholder "Email eingeben"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['Input', 'placeholder'] }]
    },
    tags: ['input', 'form']
  },
  {
    id: 'basic-005',
    name: 'Image Element',
    category: 'basic',
    description: 'Add an image',
    files: { 'app.mir': 'Box' },
    prompt: '/Bild mit Platzhalter',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Image src "https://via.placeholder.com/300x200"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Image' }]
    },
    tags: ['image']
  },
  {
    id: 'basic-006',
    name: 'Icon Element',
    category: 'basic',
    description: 'Add an icon',
    files: { 'app.mir': 'Box' },
    prompt: '/Herz Icon',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Icon "heart"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Icon "heart"' }]
    },
    tags: ['icon']
  },
  {
    id: 'basic-007',
    name: 'Link Element',
    category: 'basic',
    description: 'Add a link',
    files: { 'app.mir': 'Box' },
    prompt: '/Link zu Google',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Link "Google" href "https://google.com"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['Link', 'href'] }]
    },
    tags: ['link']
  },
  {
    id: 'basic-008',
    name: 'Multiple Elements',
    category: 'basic',
    description: 'Add multiple elements at once',
    files: { 'app.mir': 'Box' },
    prompt: '/Überschrift, Text und Button',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  H1 "Titel"\n  Text "Beschreibung"\n  Button "Aktion"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['H1', 'Text', 'Button'] }]
    },
    tags: ['multiple']
  }
]

// ============================================
// 2. STYLING
// ============================================

export const stylingScenarios: TestScenario[] = [
  {
    id: 'style-001',
    name: 'Background Color',
    category: 'styling',
    description: 'Set background color',
    files: { 'app.mir': 'Button "Click"' },
    prompt: '/roter Hintergrund',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Click" bg #ef4444' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'bg' }]
    },
    tags: ['color', 'background']
  },
  {
    id: 'style-002',
    name: 'Text Color',
    category: 'styling',
    description: 'Set text color',
    files: { 'app.mir': 'Text "Hello"' },
    prompt: '/weiße Textfarbe',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Text "Hello" col white' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'col' }]
    },
    tags: ['color', 'text']
  },
  {
    id: 'style-003',
    name: 'Padding',
    category: 'styling',
    description: 'Add padding',
    files: { 'app.mir': 'Box\n  Text "Content"' },
    prompt: '/Padding 20',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box pad 20\n  Text "Content"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'pad 20' }]
    },
    tags: ['spacing', 'padding']
  },
  {
    id: 'style-004',
    name: 'Border Radius',
    category: 'styling',
    description: 'Add border radius',
    files: { 'app.mir': 'Button "Click"' },
    prompt: '/abgerundete Ecken',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Click" rad 8' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'rad' }]
    },
    tags: ['border', 'radius']
  },
  {
    id: 'style-005',
    name: 'Border',
    category: 'styling',
    description: 'Add border',
    files: { 'app.mir': 'Box' },
    prompt: '/1px grauer Rahmen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box bor 1 #666' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'bor' }]
    },
    tags: ['border']
  },
  {
    id: 'style-006',
    name: 'Shadow',
    category: 'styling',
    description: 'Add shadow',
    files: { 'app.mir': 'Box' },
    prompt: '/Schatten',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box shadow md' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'shadow' }]
    },
    tags: ['shadow']
  },
  {
    id: 'style-007',
    name: 'Font Size',
    category: 'styling',
    description: 'Set font size',
    files: { 'app.mir': 'Text "Big"' },
    prompt: '/größere Schrift',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Text "Big" fs 24' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'fs' }]
    },
    tags: ['font', 'size']
  },
  {
    id: 'style-008',
    name: 'Font Weight',
    category: 'styling',
    description: 'Set font weight',
    files: { 'app.mir': 'Text "Bold"' },
    prompt: '/fett',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Text "Bold" weight bold' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'weight bold' }]
    },
    tags: ['font', 'weight']
  },
  {
    id: 'style-009',
    name: 'Combined Styling',
    category: 'styling',
    description: 'Apply multiple styles',
    files: { 'app.mir': 'Button "Submit"' },
    prompt: '/blauer Button mit weißem Text und abgerundeten Ecken',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Submit" bg #3b82f6 col white rad 8' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['bg', 'col', 'rad'] }]
    },
    tags: ['combined', 'button']
  },
  {
    id: 'style-010',
    name: 'Opacity',
    category: 'styling',
    description: 'Set opacity',
    files: { 'app.mir': 'Box bg black' },
    prompt: '/50% transparent',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box bg black opa 0.5' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'opa' }]
    },
    tags: ['opacity']
  }
]

// ============================================
// 3. LAYOUT
// ============================================

export const layoutScenarios: TestScenario[] = [
  {
    id: 'layout-001',
    name: 'Horizontal Layout',
    category: 'layout',
    description: 'Create horizontal layout',
    files: { 'app.mir': 'Box\n  Button "A"\n  Button "B"' },
    prompt: '/horizontal anordnen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box hor\n  Button "A"\n  Button "B"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'hor' }]
    },
    tags: ['horizontal', 'flexbox']
  },
  {
    id: 'layout-002',
    name: 'Vertical Layout with Gap',
    category: 'layout',
    description: 'Vertical layout with gap',
    files: { 'app.mir': 'Box\n  Text "A"\n  Text "B"' },
    prompt: '/vertikal mit 16px Abstand',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box ver gap 16\n  Text "A"\n  Text "B"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['ver', 'gap'] }]
    },
    tags: ['vertical', 'gap']
  },
  {
    id: 'layout-003',
    name: 'Center Content',
    category: 'layout',
    description: 'Center content',
    files: { 'app.mir': 'Box\n  Text "Centered"' },
    prompt: '/zentrieren',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box center\n  Text "Centered"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'center' }]
    },
    tags: ['center']
  },
  {
    id: 'layout-004',
    name: 'Spread Items',
    category: 'layout',
    description: 'Spread items apart',
    files: { 'app.mir': 'Box hor\n  Text "Left"\n  Text "Right"' },
    prompt: '/Links und Rechts verteilen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box hor spread\n  Text "Left"\n  Text "Right"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'spread' }]
    },
    tags: ['spread', 'justify']
  },
  {
    id: 'layout-005',
    name: 'Grid Layout',
    category: 'layout',
    description: 'Create grid layout',
    files: { 'app.mir': 'Box\n  Box "1"\n  Box "2"\n  Box "3"\n  Box "4"' },
    prompt: '/2-Spalten Grid',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box grid 2 gap 16\n  Box "1"\n  Box "2"\n  Box "3"\n  Box "4"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'grid 2' }]
    },
    tags: ['grid']
  },
  {
    id: 'layout-006',
    name: 'Full Width',
    category: 'layout',
    description: 'Set full width',
    files: { 'app.mir': 'Box\n  Button "Click"' },
    prompt: '/volle Breite',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Button "Click" w full' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'w full' }]
    },
    tags: ['width', 'full']
  },
  {
    id: 'layout-007',
    name: 'Fixed Dimensions',
    category: 'layout',
    description: 'Set fixed width and height',
    files: { 'app.mir': 'Box' },
    prompt: '/200x100 Pixel',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box w 200 h 100' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['w 200', 'h 100'] }]
    },
    tags: ['dimensions']
  },
  {
    id: 'layout-008',
    name: 'Wrap Layout',
    category: 'layout',
    description: 'Enable wrapping',
    files: { 'app.mir': 'Box hor\n  Button "1"\n  Button "2"\n  Button "3"' },
    prompt: '/umbrechen wenn nötig',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box hor wrap\n  Button "1"\n  Button "2"\n  Button "3"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'wrap' }]
    },
    tags: ['wrap']
  },
  {
    id: 'layout-009',
    name: 'Stacked Layout',
    category: 'layout',
    description: 'Create stacked (absolute) layout',
    files: { 'app.mir': 'Box\n  Image src "bg.jpg"\n  Text "Overlay"' },
    prompt: '/übereinander stapeln',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box stacked\n  Image src "bg.jpg"\n  Text "Overlay"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'stacked' }]
    },
    tags: ['stacked', 'absolute']
  },
  {
    id: 'layout-010',
    name: 'Scroll Container',
    category: 'layout',
    description: 'Add vertical scroll',
    files: { 'app.mir': 'Box h 300\n  Text "Long content..."' },
    prompt: '/scrollbar',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box h 300 scroll\n  Text "Long content..."' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'scroll' }]
    },
    tags: ['scroll']
  }
]

// ============================================
// 4. COMPONENTS
// ============================================

export const componentScenarios: TestScenario[] = [
  {
    id: 'comp-001',
    name: 'Create Simple Component',
    category: 'components',
    description: 'Create a simple component definition',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Card Komponente erstellen',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Card as Box:\n  pad 20\n  rad 12\n  bg #1a1a1a' }
    ], 'Card Komponente erstellt'),
    validate: {
      filesChanged: ['components.com'],
      fileContains: [{ file: 'components.com', contains: 'Card as Box' }]
    },
    tags: ['component', 'create']
  },
  {
    id: 'comp-002',
    name: 'Create and Use Component',
    category: 'components',
    description: 'Create component and use it',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Card Komponente erstellen und verwenden',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Card as Box:\n  pad 20\n  rad 12' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  Card' }
    ]),
    validate: {
      filesChanged: ['app.mir', 'components.com'],
      fileContains: [
        { file: 'components.com', contains: 'Card as Box' },
        { file: 'app.mir', contains: 'Card' }
      ]
    },
    tags: ['component', 'create', 'use']
  },
  {
    id: 'comp-003',
    name: 'Button Component',
    category: 'components',
    description: 'Create a styled button component',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/PrimaryButton Komponente mit blauem Hintergrund',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'PrimaryButton as Button:\n  bg #3b82f6\n  col white\n  pad 12 24\n  rad 8' }
    ]),
    validate: {
      fileContains: [{ file: 'components.com', contains: ['PrimaryButton as Button', 'bg'] }]
    },
    tags: ['component', 'button']
  },
  {
    id: 'comp-004',
    name: 'Component with Children',
    category: 'components',
    description: 'Create component with child elements',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Avatar Komponente mit Bild und Name',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Avatar as Box:\n  hor gap 12\n  Image src "$src" w 40 h 40 rad 20\n  Text "$name"' }
    ]),
    validate: {
      fileContains: [{ file: 'components.com', contains: ['Avatar as Box', 'Image', 'Text'] }]
    },
    tags: ['component', 'children']
  },
  {
    id: 'comp-005',
    name: 'Use Existing Component',
    category: 'components',
    description: 'Use an already defined component',
    files: {
      'app.mir': 'Box',
      'components.com': 'Card as Box:\n  pad 20\n  rad 12'
    },
    prompt: '/Card verwenden',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Card' }
    ]),
    validate: {
      filesChanged: ['app.mir'],
      fileContains: [{ file: 'app.mir', contains: 'Card' }]
    },
    tags: ['component', 'use']
  },
  {
    id: 'comp-006',
    name: 'Component with Slot',
    category: 'components',
    description: 'Create component with Slot for children',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Panel Komponente mit Slot für Inhalt',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Panel as Box:\n  pad 20\n  bg #1a1a1a\n  rad 12\n  Slot' }
    ]),
    validate: {
      fileContains: [{ file: 'components.com', contains: 'Slot' }]
    },
    tags: ['component', 'slot']
  },
  {
    id: 'comp-007',
    name: 'Extend Component',
    category: 'components',
    description: 'Create component that extends another',
    files: {
      'app.mir': 'Box',
      'components.com': 'Card as Box:\n  pad 20\n  rad 12'
    },
    prompt: '/DangerCard Komponente basierend auf Card mit rotem Rand',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'append', code: '\n\nDangerCard as Card:\n  bor 2 #ef4444' }
    ]),
    validate: {
      fileContains: [{ file: 'components.com', contains: 'DangerCard as Card' }]
    },
    tags: ['component', 'extend', 'inheritance']
  },
  {
    id: 'comp-008',
    name: 'Multiple Component Instances',
    category: 'components',
    description: 'Use component multiple times',
    files: {
      'app.mir': 'Box',
      'components.com': 'Card as Box:\n  pad 20'
    },
    prompt: '/3 Cards nebeneinander',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box hor gap 16\n  Card\n  Card\n  Card' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['hor', 'Card'] }]
    },
    tags: ['component', 'multiple']
  }
]

// ============================================
// 5. TOKENS
// ============================================

export const tokenScenarios: TestScenario[] = [
  {
    id: 'token-001',
    name: 'Create Color Token',
    category: 'tokens',
    description: 'Create a color token',
    files: {
      'app.mir': 'Button bg #3b82f6',
      'tokens.tok': ''
    },
    prompt: '/primary Token für die Farbe erstellen',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6' },
      { file: 'app.mir', action: 'replace', code: 'Button bg $primary' }
    ]),
    validate: {
      fileContains: [
        { file: 'tokens.tok', contains: '$primary' },
        { file: 'app.mir', contains: '$primary' }
      ]
    },
    tags: ['token', 'color']
  },
  {
    id: 'token-002',
    name: 'Create Spacing Token',
    category: 'tokens',
    description: 'Create a spacing token',
    files: {
      'app.mir': 'Box pad 16',
      'tokens.tok': ''
    },
    prompt: '/spacing Token für Padding',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$spacing: 16' },
      { file: 'app.mir', action: 'replace', code: 'Box pad $spacing' }
    ]),
    validate: {
      fileContains: [
        { file: 'tokens.tok', contains: '$spacing' },
        { file: 'app.mir', contains: '$spacing' }
      ]
    },
    tags: ['token', 'spacing']
  },
  {
    id: 'token-003',
    name: 'Use Existing Token',
    category: 'tokens',
    description: 'Use an already defined token',
    files: {
      'app.mir': 'Button bg blue',
      'tokens.tok': '$primary: #3b82f6'
    },
    prompt: '/primary Token verwenden',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button bg $primary' }
    ]),
    validate: {
      filesChanged: ['app.mir'],
      fileContains: [{ file: 'app.mir', contains: '$primary' }]
    },
    tags: ['token', 'use']
  },
  {
    id: 'token-004',
    name: 'Add Multiple Tokens',
    category: 'tokens',
    description: 'Create multiple related tokens',
    files: {
      'app.mir': 'Box',
      'tokens.tok': ''
    },
    prompt: '/Farbpalette: primary, secondary, accent',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6\n$secondary: #22c55e\n$accent: #f59e0b' }
    ]),
    validate: {
      fileContains: [{ file: 'tokens.tok', contains: ['$primary', '$secondary', '$accent'] }]
    },
    tags: ['token', 'multiple', 'palette']
  },
  {
    id: 'token-005',
    name: 'Update Token Value',
    category: 'tokens',
    description: 'Change an existing token value',
    files: {
      'app.mir': 'Button bg $primary',
      'tokens.tok': '$primary: #3b82f6'
    },
    prompt: '/primary zu rot ändern',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #ef4444' }
    ]),
    validate: {
      fileContains: [{ file: 'tokens.tok', contains: '#ef4444' }]
    },
    tags: ['token', 'update']
  },
  {
    id: 'token-006',
    name: 'Semantic Tokens',
    category: 'tokens',
    description: 'Create semantic color tokens',
    files: {
      'app.mir': 'Box',
      'tokens.tok': ''
    },
    prompt: '/success, warning, error Farben',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$success: #22c55e\n$warning: #f59e0b\n$error: #ef4444' }
    ]),
    validate: {
      fileContains: [{ file: 'tokens.tok', contains: ['$success', '$warning', '$error'] }]
    },
    tags: ['token', 'semantic']
  },
  {
    id: 'token-007',
    name: 'Token with Dot Notation',
    category: 'tokens',
    description: 'Create namespaced token',
    files: {
      'app.mir': 'Box',
      'tokens.tok': ''
    },
    prompt: '/color.primary und color.secondary Tokens',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$color.primary: #3b82f6\n$color.secondary: #64748b' }
    ]),
    validate: {
      fileContains: [{ file: 'tokens.tok', contains: ['$color.primary', '$color.secondary'] }]
    },
    tags: ['token', 'namespace']
  }
]

// ============================================
// 6. EVENTS & ACTIONS
// ============================================

export const eventScenarios: TestScenario[] = [
  {
    id: 'event-001',
    name: 'Click Event',
    category: 'events',
    description: 'Add click event',
    files: { 'app.mir': 'Button "Click me"' },
    prompt: '/Bei Klick etwas anzeigen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Click me"\n  onclick: show Modal' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'onclick' }]
    },
    tags: ['event', 'click']
  },
  {
    id: 'event-002',
    name: 'Hover Event',
    category: 'events',
    description: 'Add hover event',
    files: { 'app.mir': 'Box' },
    prompt: '/Bei Hover hervorheben',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  onhover: highlight' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'onhover' }]
    },
    tags: ['event', 'hover']
  },
  {
    id: 'event-003',
    name: 'Toggle Action',
    category: 'events',
    description: 'Add toggle action',
    files: { 'app.mir': 'Button "Toggle"\nBox = Panel' },
    prompt: '/Button soll Panel ein/ausblenden',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Toggle"\n  onclick: toggle Panel\nBox = Panel' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'toggle Panel' }]
    },
    tags: ['event', 'toggle']
  },
  {
    id: 'event-004',
    name: 'Keyboard Event',
    category: 'events',
    description: 'Add keyboard event',
    files: { 'app.mir': 'Input placeholder "Search"' },
    prompt: '/Bei Enter Suche ausführen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Input placeholder "Search"\n  onkeydown enter: call search' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'onkeydown enter' }]
    },
    tags: ['event', 'keyboard']
  },
  {
    id: 'event-005',
    name: 'Navigation Action',
    category: 'events',
    description: 'Navigate to page',
    files: { 'app.mir': 'Button "Go to Settings"' },
    prompt: '/Zu Settings Seite navigieren',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Go to Settings"\n  onclick: page Settings' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'page Settings' }]
    },
    tags: ['event', 'navigation']
  },
  {
    id: 'event-006',
    name: 'Multiple Events',
    category: 'events',
    description: 'Add multiple events to element',
    files: { 'app.mir': 'Button "Interactive"' },
    prompt: '/Hover-Effekt und Klick-Aktion',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Interactive"\n  onhover: highlight\n  onclick: show Modal' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['onhover', 'onclick'] }]
    },
    tags: ['event', 'multiple']
  },
  {
    id: 'event-007',
    name: 'Focus/Blur Events',
    category: 'events',
    description: 'Add focus and blur events',
    files: { 'app.mir': 'Input' },
    prompt: '/Fokus-Indikator',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Input\n  onfocus: highlight\n  onblur: deactivate' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['onfocus', 'onblur'] }]
    },
    tags: ['event', 'focus']
  }
]

// ============================================
// 7. STATES
// ============================================

export const stateScenarios: TestScenario[] = [
  {
    id: 'state-001',
    name: 'Hover State',
    category: 'states',
    description: 'Add hover state styling',
    files: { 'app.mir': 'Button "Hover me" bg blue' },
    prompt: '/Bei Hover dunkler',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Hover me" bg blue\n  hover:\n    bg #1e40af' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'hover:' }]
    },
    tags: ['state', 'hover']
  },
  {
    id: 'state-002',
    name: 'Active State',
    category: 'states',
    description: 'Add active state styling',
    files: { 'app.mir': 'Button "Press me"' },
    prompt: '/Gedrückter Zustand',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Press me"\n  active:\n    scale 0.95' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'active:' }]
    },
    tags: ['state', 'active']
  },
  {
    id: 'state-003',
    name: 'Disabled State',
    category: 'states',
    description: 'Add disabled state',
    files: { 'app.mir': 'Button "Submit"' },
    prompt: '/Deaktivierter Zustand',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Submit"\n  disabled:\n    opa 0.5\n    cursor not-allowed' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'disabled:' }]
    },
    tags: ['state', 'disabled']
  },
  {
    id: 'state-004',
    name: 'Focus State',
    category: 'states',
    description: 'Add focus state styling',
    files: { 'app.mir': 'Input' },
    prompt: '/Focus-Ring',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Input\n  focus:\n    bor 2 #3b82f6' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'focus:' }]
    },
    tags: ['state', 'focus']
  },
  {
    id: 'state-005',
    name: 'Custom Selected State',
    category: 'states',
    description: 'Add custom selected state',
    files: { 'app.mir': 'Box = Item' },
    prompt: '/Ausgewählter Zustand',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box = Item\n  state selected\n  selected:\n    bg #3b82f6\n    col white' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['state selected', 'selected:'] }]
    },
    tags: ['state', 'custom', 'selected']
  },
  {
    id: 'state-006',
    name: 'Toggle State',
    category: 'states',
    description: 'Add on/off toggle state',
    files: { 'app.mir': 'Box = Switch' },
    prompt: '/Ein/Aus Zustand',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box = Switch\n  state on\n  on:\n    bg #22c55e\n  off:\n    bg #64748b' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['state on', 'on:', 'off:'] }]
    },
    tags: ['state', 'toggle']
  },
  {
    id: 'state-007',
    name: 'Combined States',
    category: 'states',
    description: 'Add multiple state styles',
    files: { 'app.mir': 'Button "Interactive"' },
    prompt: '/Hover, Active und Disabled States',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Interactive"\n  hover:\n    bg #1e40af\n  active:\n    scale 0.95\n  disabled:\n    opa 0.5' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['hover:', 'active:', 'disabled:'] }]
    },
    tags: ['state', 'multiple']
  }
]

// ============================================
// 8. MULTI-FILE OPERATIONS
// ============================================

export const multiFileScenarios: TestScenario[] = [
  {
    id: 'multi-001',
    name: 'Component with Token',
    category: 'multi-file',
    description: 'Create component using token',
    files: {
      'app.mir': 'Box',
      'tokens.tok': '',
      'components.com': ''
    },
    prompt: '/PrimaryButton mit $primary Farbe',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6' },
      { file: 'components.com', action: 'replace', code: 'PrimaryButton as Button:\n  bg $primary\n  col white' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  PrimaryButton "Click"' }
    ]),
    validate: {
      filesChanged: ['app.mir', 'tokens.tok', 'components.com'],
      fileContains: [
        { file: 'tokens.tok', contains: '$primary' },
        { file: 'components.com', contains: ['PrimaryButton', '$primary'] },
        { file: 'app.mir', contains: 'PrimaryButton' }
      ]
    },
    tags: ['multi-file', 'component', 'token']
  },
  {
    id: 'multi-002',
    name: 'Design System Setup',
    category: 'multi-file',
    description: 'Create basic design system',
    files: {
      'app.mir': 'Box',
      'tokens.tok': '',
      'components.com': ''
    },
    prompt: '/Design System mit Farben und Button Komponente',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '// Colors\n$primary: #3b82f6\n$secondary: #64748b\n$success: #22c55e\n$error: #ef4444\n\n// Spacing\n$spacing-sm: 8\n$spacing-md: 16\n$spacing-lg: 24' },
      { file: 'components.com', action: 'replace', code: 'PrimaryButton as Button:\n  bg $primary\n  col white\n  pad $spacing-sm $spacing-md\n  rad 8\n\nSecondaryButton as Button:\n  bg transparent\n  col $primary\n  bor 1 $primary\n  pad $spacing-sm $spacing-md\n  rad 8' }
    ]),
    validate: {
      filesChanged: ['tokens.tok', 'components.com'],
      fileContains: [
        { file: 'tokens.tok', contains: ['$primary', '$spacing'] },
        { file: 'components.com', contains: ['PrimaryButton', 'SecondaryButton'] }
      ]
    },
    tags: ['multi-file', 'design-system']
  },
  {
    id: 'multi-003',
    name: 'Create New File',
    category: 'multi-file',
    description: 'Create a new .mir file',
    files: {
      'app.mir': 'Box\n  Text "Home"'
    },
    prompt: '/neue Settings Seite erstellen',
    mockResponse: createMockFixerResponse([
      { file: 'settings.mir', action: 'create', code: 'Box pad 20\n  H1 "Settings"\n  Text "Configure your preferences"' }
    ]),
    validate: {
      filesCreated: ['settings.mir'],
      fileContains: [{ file: 'settings.mir', contains: 'Settings' }]
    },
    tags: ['multi-file', 'create']
  },
  {
    id: 'multi-004',
    name: 'Refactor to Component',
    category: 'multi-file',
    description: 'Extract inline code to component',
    files: {
      'app.mir': 'Box\n  Box pad 20 rad 12 bg #1a1a1a\n    Text "Card 1"\n  Box pad 20 rad 12 bg #1a1a1a\n    Text "Card 2"',
      'components.com': ''
    },
    prompt: '/Box zu Card Komponente extrahieren',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Card as Box:\n  pad 20\n  rad 12\n  bg #1a1a1a' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  Card\n    Text "Card 1"\n  Card\n    Text "Card 2"' }
    ]),
    validate: {
      filesChanged: ['app.mir', 'components.com'],
      fileContains: [
        { file: 'components.com', contains: 'Card as Box' },
        { file: 'app.mir', contains: 'Card' }
      ],
      fileNotContains: [{ file: 'app.mir', notContains: 'pad 20 rad 12' }]
    },
    tags: ['multi-file', 'refactor']
  }
]

// ============================================
// 9. EDGE CASES
// ============================================

export const edgeCaseScenarios: TestScenario[] = [
  {
    id: 'edge-001',
    name: 'Empty File',
    category: 'edge-cases',
    description: 'Handle empty file',
    files: { 'app.mir': '' },
    prompt: '/Button hinzufügen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Button "Click"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Button' }]
    },
    tags: ['edge', 'empty']
  },
  {
    id: 'edge-002',
    name: 'Unicode Content',
    category: 'edge-cases',
    description: 'Handle German umlauts',
    files: { 'app.mir': 'Box' },
    prompt: '/Text mit Ümläuten: "Größe ändern"',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Größe ändern"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Größe ändern' }]
    },
    tags: ['edge', 'unicode']
  },
  {
    id: 'edge-003',
    name: 'Deep Nesting',
    category: 'edge-cases',
    description: 'Handle deeply nested structure',
    files: { 'app.mir': 'Box\n  Box\n    Box\n      Box\n        Text "Deep"' },
    prompt: '/Noch eine Ebene hinzufügen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Box\n    Box\n      Box\n        Box\n          Text "Deeper"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Deeper' }]
    },
    tags: ['edge', 'nesting']
  },
  {
    id: 'edge-004',
    name: 'Long Text',
    category: 'edge-cases',
    description: 'Handle long text content',
    files: { 'app.mir': 'Box' },
    prompt: '/langen Absatz Text',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Lorem ipsum' }]
    },
    tags: ['edge', 'long-text']
  },
  {
    id: 'edge-005',
    name: 'Special Characters in String',
    category: 'edge-cases',
    description: 'Handle special characters',
    files: { 'app.mir': 'Box' },
    prompt: '/Text mit Sonderzeichen: <>&"',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Special: <>&\\""' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: 'Special' }]
    },
    tags: ['edge', 'special-chars']
  },
  {
    id: 'edge-006',
    name: 'Preserve Existing Content',
    category: 'edge-cases',
    description: 'Add without removing existing content',
    files: { 'app.mir': 'Box\n  Text "Keep me"\n  Button "Also keep"' },
    prompt: '/Icon hinzufügen',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Keep me"\n  Button "Also keep"\n  Icon "star"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['Keep me', 'Also keep', 'Icon'] }]
    },
    tags: ['edge', 'preserve']
  },
  {
    id: 'edge-007',
    name: 'Whitespace Handling',
    category: 'edge-cases',
    description: 'Handle indentation correctly',
    files: { 'app.mir': 'Box\n  Text "Indented"' },
    prompt: '/korrekte Einrückung beibehalten',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Text "Indented"\n  Button "Also indented"' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: '  Button' }]
    },
    tags: ['edge', 'whitespace']
  },
  {
    id: 'edge-008',
    name: 'Numeric Values',
    category: 'edge-cases',
    description: 'Handle various numeric formats',
    files: { 'app.mir': 'Box' },
    prompt: '/Box 150.5 breit, 0.8 opacity',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box w 150.5 opa 0.8' }
    ]),
    validate: {
      fileContains: [{ file: 'app.mir', contains: ['150.5', '0.8'] }]
    },
    tags: ['edge', 'numeric']
  }
]

// ============================================
// 10. COMPLEX SCENARIOS
// ============================================

export const complexScenarios: TestScenario[] = [
  {
    id: 'complex-001',
    name: 'Login Form',
    category: 'complex',
    description: 'Create complete login form',
    files: {
      'app.mir': 'Box',
      'tokens.tok': '',
      'components.com': ''
    },
    prompt: '/Login Formular mit Email, Passwort und Submit Button',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6\n$bg-input: #1a1a1a\n$border: #333' },
      { file: 'components.com', action: 'replace', code: 'FormInput as Box:\n  ver gap 4\n  Label\n  Input bg $bg-input bor 1 $border rad 8 pad 12\n\nPrimaryButton as Button:\n  bg $primary\n  col white\n  pad 12 24\n  rad 8\n  w full' },
      { file: 'app.mir', action: 'replace', code: 'Box ver gap 20 pad 40 maxw 400 center\n  H2 "Login"\n  FormInput\n    Label "Email"\n    Input placeholder "email@example.com"\n  FormInput\n    Label "Passwort"\n    Input type "password" placeholder "••••••••"\n  PrimaryButton "Anmelden"' }
    ], 'Login Formular erstellt'),
    validate: {
      filesChanged: ['app.mir', 'tokens.tok', 'components.com'],
      fileContains: [
        { file: 'app.mir', contains: ['Login', 'Email', 'Passwort', 'Anmelden'] },
        { file: 'components.com', contains: ['FormInput', 'PrimaryButton'] }
      ]
    },
    tags: ['complex', 'form', 'login']
  },
  {
    id: 'complex-002',
    name: 'Card Grid',
    category: 'complex',
    description: 'Create responsive card grid',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/3-Spalten Grid mit Cards die Bild, Titel und Beschreibung haben',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'ProductCard as Box:\n  ver gap 12\n  bg #1a1a1a\n  rad 12\n  clip\n  Image src "$image" w full h 200\n  Box pad 16 ver gap 8\n    H3 "$title"\n    Text "$description" col #888' },
      { file: 'app.mir', action: 'replace', code: 'Box grid 3 gap 24 pad 24\n  ProductCard image "https://via.placeholder.com/300" title "Produkt 1" description "Beschreibung..."\n  ProductCard image "https://via.placeholder.com/300" title "Produkt 2" description "Beschreibung..."\n  ProductCard image "https://via.placeholder.com/300" title "Produkt 3" description "Beschreibung..."' }
    ]),
    validate: {
      fileContains: [
        { file: 'app.mir', contains: ['grid 3', 'ProductCard'] },
        { file: 'components.com', contains: ['ProductCard', 'Image', 'H3', 'Text'] }
      ]
    },
    tags: ['complex', 'grid', 'cards']
  },
  {
    id: 'complex-003',
    name: 'Navigation Header',
    category: 'complex',
    description: 'Create navigation header with logo and links',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Navigation Header mit Logo, Links und Call-to-Action Button',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'NavLink as Link:\n  col #888\n  hover:\n    col white\n\nNavHeader as Header:\n  hor spread pad 16 24\n  bg #0a0a0a\n  bor 0 0 1 #222' },
      { file: 'app.mir', action: 'replace', code: 'NavHeader\n  Box hor gap 8\n    Icon "logo"\n    Text "Brand" weight bold\n  Box hor gap 24\n    NavLink "Home" href "/"\n    NavLink "Products" href "/products"\n    NavLink "About" href "/about"\n  Button "Get Started" bg #3b82f6 col white rad 8 pad 8 16' }
    ]),
    validate: {
      fileContains: [
        { file: 'app.mir', contains: ['NavHeader', 'Home', 'Products', 'Get Started'] },
        { file: 'components.com', contains: ['NavLink', 'NavHeader'] }
      ]
    },
    tags: ['complex', 'navigation', 'header']
  },
  {
    id: 'complex-004',
    name: 'Modal Dialog',
    category: 'complex',
    description: 'Create modal with overlay',
    files: {
      'app.mir': 'Box\n  Button "Open Modal"',
      'components.com': ''
    },
    prompt: '/Modal Dialog mit Overlay, Header und Schließen Button',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'ModalOverlay as Box:\n  stacked\n  w full h full\n  bg rgba(0,0,0,0.5)\n  center\n  hidden\n\nModalDialog as Box:\n  bg #1a1a1a\n  rad 16\n  w 500\n  maxh 80%\n  scroll\n  ver\n\nModalHeader as Box:\n  hor spread pad 16 20\n  bor 0 0 1 #333' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  Button "Open Modal"\n    onclick: show Modal\n  ModalOverlay = Modal\n    onclick: hide Modal\n    ModalDialog\n      onclick-outside: hide Modal\n      ModalHeader\n        H3 "Modal Title"\n        Button "✕" bg transparent\n          onclick: hide Modal\n      Box pad 20\n        Text "Modal content goes here..."' }
    ]),
    validate: {
      fileContains: [
        { file: 'app.mir', contains: ['Modal', 'onclick', 'hide Modal'] },
        { file: 'components.com', contains: ['ModalOverlay', 'ModalDialog'] }
      ]
    },
    tags: ['complex', 'modal', 'overlay']
  },
  {
    id: 'complex-005',
    name: 'Sidebar Navigation',
    category: 'complex',
    description: 'Create collapsible sidebar',
    files: {
      'app.mir': 'Box',
      'components.com': '',
      'tokens.tok': ''
    },
    prompt: '/Sidebar mit Icons und ausklappbaren Menüpunkten',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$sidebar-bg: #0f0f0f\n$sidebar-width: 260\n$sidebar-item-hover: #1a1a1a' },
      { file: 'components.com', action: 'replace', code: 'SidebarItem as Box:\n  hor gap 12 pad 12 16\n  rad 8\n  cursor pointer\n  hover:\n    bg $sidebar-item-hover\n  Icon "$icon" w 20\n  Text "$label"\n\nSidebar as Aside:\n  ver\n  w $sidebar-width\n  h full\n  bg $sidebar-bg\n  pad 16\n  bor 0 1 0 0 #222' },
      { file: 'app.mir', action: 'replace', code: 'Box hor h full\n  Sidebar\n    Box pad 16\n      Text "MENU" fs 12 col #666 weight semibold\n    SidebarItem icon "home" label "Dashboard"\n    SidebarItem icon "users" label "Users"\n    SidebarItem icon "settings" label "Settings"\n  Main pad 24 grow\n    H1 "Dashboard"\n    Text "Content area"' }
    ]),
    validate: {
      filesChanged: ['app.mir', 'tokens.tok', 'components.com'],
      fileContains: [
        { file: 'app.mir', contains: ['Sidebar', 'SidebarItem', 'Dashboard'] },
        { file: 'components.com', contains: ['SidebarItem', 'Sidebar'] },
        { file: 'tokens.tok', contains: '$sidebar' }
      ]
    },
    tags: ['complex', 'sidebar', 'navigation']
  }
]

// ============================================
// ALL SCENARIOS
// ============================================

export const allScenarios: TestScenario[] = [
  ...basicScenarios,
  ...stylingScenarios,
  ...layoutScenarios,
  ...componentScenarios,
  ...tokenScenarios,
  ...eventScenarios,
  ...stateScenarios,
  ...multiFileScenarios,
  ...edgeCaseScenarios,
  ...complexScenarios
]

// ============================================
// HELPERS
// ============================================

/**
 * Get scenarios by category
 */
export function getScenariosByCategory(category: ScenarioCategory): TestScenario[] {
  return allScenarios.filter(s => s.category === category)
}

/**
 * Get scenarios by tag
 */
export function getScenariosByTag(tag: string): TestScenario[] {
  return allScenarios.filter(s => s.tags?.includes(tag))
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): TestScenario | undefined {
  return allScenarios.find(s => s.id === id)
}

/**
 * Get runnable scenarios (excluding skipped, respecting only)
 */
export function getRunnableScenarios(): TestScenario[] {
  const onlyScenarios = allScenarios.filter(s => s.only)
  if (onlyScenarios.length > 0) {
    return onlyScenarios
  }
  return allScenarios.filter(s => !s.skip)
}

/**
 * Validate a result against criteria
 */
export function validateResult(
  result: { success: boolean; files: Record<string, string>; filesChanged: string[]; filesCreated: string[]; error?: string },
  criteria: ValidationCriteria
): { passed: boolean; errors: string[] } {
  const errors: string[] = []

  // Check success/failure
  if (criteria.shouldSucceed !== undefined) {
    if (criteria.shouldSucceed && !result.success) {
      errors.push(`Expected success but got failure: ${result.error}`)
    }
    if (!criteria.shouldSucceed && result.success) {
      errors.push('Expected failure but got success')
    }
  }

  if (criteria.shouldFailWith && result.success) {
    errors.push(`Expected failure with "${criteria.shouldFailWith}" but succeeded`)
  }

  // Check files changed
  if (criteria.filesChanged) {
    for (const file of criteria.filesChanged) {
      if (!result.filesChanged.includes(file)) {
        errors.push(`Expected ${file} to be changed but it wasn't`)
      }
    }
  }

  // Check files created
  if (criteria.filesCreated) {
    for (const file of criteria.filesCreated) {
      if (!result.filesCreated.includes(file)) {
        errors.push(`Expected ${file} to be created but it wasn't`)
      }
    }
  }

  // Check file contains
  if (criteria.fileContains) {
    for (const { file, contains } of criteria.fileContains) {
      const content = result.files[file]
      if (!content) {
        errors.push(`File ${file} not found`)
        continue
      }
      const patterns = Array.isArray(contains) ? contains : [contains]
      for (const pattern of patterns) {
        if (!content.includes(pattern)) {
          errors.push(`Expected ${file} to contain "${pattern}"`)
        }
      }
    }
  }

  // Check file not contains
  if (criteria.fileNotContains) {
    for (const { file, notContains } of criteria.fileNotContains) {
      const content = result.files[file]
      if (!content) continue
      const patterns = Array.isArray(notContains) ? notContains : [notContains]
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          errors.push(`Expected ${file} to NOT contain "${pattern}"`)
        }
      }
    }
  }

  // Check file equals
  if (criteria.fileEquals) {
    for (const { file, equals } of criteria.fileEquals) {
      const content = result.files[file]
      if (content !== equals) {
        errors.push(`Expected ${file} to equal:\n${equals}\n\nBut got:\n${content}`)
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors
  }
}

// ============================================
// SCENARIO COUNT
// ============================================

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Test Scenarios Loaded                           ║
╠═══════════════════════════════════════════════════════════╣
║  Basic:      ${basicScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Styling:    ${stylingScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Layout:     ${layoutScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Components: ${componentScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Tokens:     ${tokenScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Events:     ${eventScenarios.length.toString().padEnd(3)} scenarios                            ║
║  States:     ${stateScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Multi-File: ${multiFileScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Edge Cases: ${edgeCaseScenarios.length.toString().padEnd(3)} scenarios                            ║
║  Complex:    ${complexScenarios.length.toString().padEnd(3)} scenarios                            ║
╠═══════════════════════════════════════════════════════════╣
║  TOTAL:      ${allScenarios.length.toString().padEnd(3)} scenarios                            ║
╚═══════════════════════════════════════════════════════════╝
`)
