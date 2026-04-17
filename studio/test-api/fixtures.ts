/**
 * Mirror Test Framework - Fixtures API
 *
 * Load and manage test fixtures (.mirror files) for reusable test scenarios.
 * Supports loading from virtual file system or pre-defined fixtures.
 */

import type { TestCase, TestAPI } from './types'

// =============================================================================
// Types
// =============================================================================

export interface Fixture {
  /** Fixture name */
  name: string
  /** Fixture category (e.g., 'layout', 'components', 'zag') */
  category: string
  /** Mirror code content */
  code: string
  /** Optional description */
  description?: string
  /** Expected node count after compile */
  expectedNodes?: number
}

export interface FixtureSpec {
  /** Unique name */
  name: string
  /** Fixture to load */
  fixture: string
  /** Test expectations */
  expectations: FixtureExpectation[]
  /** Tags for filtering */
  tags?: string[]
}

export interface FixtureExpectation {
  /** Node ID to verify */
  nodeId: string
  /** Expected properties (Mirror DSL style) */
  expect: Record<string, unknown>
}

export interface FixturesAPI {
  /** Register a fixture */
  register(fixture: Fixture): void
  /** Get a fixture by name */
  get(name: string): Fixture | undefined
  /** Get all fixtures in a category */
  getByCategory(category: string): Fixture[]
  /** List all fixture names */
  list(): string[]
  /** Load fixture into editor and compile */
  load(name: string): Promise<void>
  /** Load fixture code directly (without registry) */
  loadCode(code: string): Promise<void>
  /** Get fixture path for file-based fixtures */
  getPath(category: string, name: string): string
  /** Load from file system (if available) */
  loadFromFile(path: string): Promise<string | null>
  /** Create test cases from fixture spec */
  createTests(spec: FixtureSpec): TestCase[]
}

// =============================================================================
// Built-in Fixtures
// =============================================================================

const BUILTIN_FIXTURES: Fixture[] = [
  // Layout Fixtures
  {
    name: 'horizontal-layout',
    category: 'layout',
    code: `Frame hor, gap 12, pad 16
  Text "A"
  Text "B"
  Text "C"`,
    description: 'Horizontal flexbox with gap',
    expectedNodes: 4,
  },
  {
    name: 'vertical-layout',
    category: 'layout',
    code: `Frame gap 12, pad 16
  Text "A"
  Text "B"
  Text "C"`,
    description: 'Vertical flexbox with gap',
    expectedNodes: 4,
  },
  {
    name: 'nested-layout',
    category: 'layout',
    code: `Frame gap 16, pad 16
  Frame hor, gap 8
    Text "Row 1 A"
    Text "Row 1 B"
  Frame hor, gap 8
    Text "Row 2 A"
    Text "Row 2 B"`,
    description: 'Nested horizontal rows in vertical container',
    expectedNodes: 7,
  },
  {
    name: 'centered-layout',
    category: 'layout',
    code: `Frame w 300, h 200, center
  Text "Centered"`,
    description: 'Centered content',
    expectedNodes: 2,
  },
  {
    name: 'spread-layout',
    category: 'layout',
    code: `Frame hor, spread, w 300, pad 16
  Text "Left"
  Text "Right"`,
    description: 'Space-between layout',
    expectedNodes: 3,
  },
  {
    name: 'grid-layout',
    category: 'layout',
    code: `Frame grid 12, gap 8, row-height 40
  Frame w 6, bg #2271C1
  Frame w 6, bg #10b981
  Frame w 4, bg #f59e0b
  Frame w 4, bg #ef4444
  Frame w 4, bg #8b5cf6`,
    description: '12-column grid layout',
    expectedNodes: 6,
  },
  {
    name: 'stacked-layout',
    category: 'layout',
    code: `Frame stacked, w 200, h 200
  Frame w full, h full, bg #1a1a1a
  Frame x 20, y 20, w 100, h 100, bg #2271C1
  Frame x 80, y 80, w 60, h 60, bg #10b981`,
    description: 'Stacked/absolute positioning',
    expectedNodes: 4,
  },

  // Component Fixtures
  {
    name: 'button-variants',
    category: 'components',
    code: `Frame gap 8
  Button "Primary", bg #2271C1, col white, pad 12 24, rad 6
  Button "Secondary", bg #333, col white, pad 12 24, rad 6
  Button "Danger", bg #ef4444, col white, pad 12 24, rad 6
  Button "Ghost", bg transparent, col #888, pad 12 24, rad 6`,
    description: 'Button variants',
    expectedNodes: 5,
  },
  {
    name: 'card',
    category: 'components',
    code: `Frame bg #1a1a1a, pad 16, rad 8, gap 8, w 300
  Text "Card Title", col white, fs 18, weight bold
  Text "Card description text here.", col #888, fs 14
  Frame hor, gap 8
    Button "Action", bg #2271C1, col white, pad 8 16, rad 4`,
    description: 'Card component',
    expectedNodes: 5,
  },
  {
    name: 'input-form',
    category: 'components',
    code: `Frame gap 12, w 300
  Label "Email"
  Input placeholder "Enter email...", pad 8, rad 4, bor 1, boc #333
  Label "Password"
  Input type password, placeholder "Enter password...", pad 8, rad 4, bor 1, boc #333
  Button "Submit", bg #2271C1, col white, pad 12, rad 4, w full`,
    description: 'Form with inputs',
    expectedNodes: 6,
  },

  // Zag Component Fixtures
  {
    name: 'dialog',
    category: 'zag',
    code: `Dialog
  Trigger: Button "Open Dialog", bg #2271C1, col white, pad 10 20, rad 6
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 24, bg #1a1a1a, rad 12, gap 16, w 400
    Text "Dialog Title", fs 18, weight bold, col white
    Text "Dialog content goes here.", col #888
    Frame hor, gap 8
      CloseTrigger: Button "Cancel", bg #333, col white, pad 10 20, rad 6
      Button "Confirm", bg #2271C1, col white, pad 10 20, rad 6`,
    description: 'Dialog component',
    expectedNodes: 1, // Dialog wrapper
  },
  {
    name: 'tabs',
    category: 'zag',
    code: `Tabs defaultValue "tab1"
  Tab "Tab 1", value "tab1"
    Frame pad 16
      Text "Content for Tab 1"
  Tab "Tab 2", value "tab2"
    Frame pad 16
      Text "Content for Tab 2"
  Tab "Tab 3", value "tab3"
    Frame pad 16
      Text "Content for Tab 3"`,
    description: 'Tabs component',
    expectedNodes: 1,
  },
  {
    name: 'select',
    category: 'zag',
    code: `Select placeholder "Choose option..."
  Option "Option 1"
  Option "Option 2"
  Option "Option 3"`,
    description: 'Select dropdown',
    expectedNodes: 1,
  },
  {
    name: 'checkbox-group',
    category: 'zag',
    code: `Frame gap 8
  Checkbox "Option A"
  Checkbox "Option B", checked
  Checkbox "Option C"`,
    description: 'Checkbox group',
    expectedNodes: 4,
  },
  {
    name: 'switch-toggle',
    category: 'zag',
    code: `Frame gap 12
  Switch "Dark Mode"
  Switch "Notifications", checked
  Switch "Auto-save", checked`,
    description: 'Switch toggles',
    expectedNodes: 4,
  },

  // Styling Fixtures
  {
    name: 'colors',
    category: 'styling',
    code: `Frame gap 8
  Frame w 100, h 40, bg #2271C1, rad 4
  Frame w 100, h 40, bg #10b981, rad 4
  Frame w 100, h 40, bg #f59e0b, rad 4
  Frame w 100, h 40, bg #ef4444, rad 4
  Frame w 100, h 40, bg #8b5cf6, rad 4`,
    description: 'Color palette',
    expectedNodes: 6,
  },
  {
    name: 'typography',
    category: 'styling',
    code: `Frame gap 8
  Text "Heading 1", fs 32, weight bold
  Text "Heading 2", fs 24, weight 600
  Text "Body text", fs 16
  Text "Small text", fs 12, col #888
  Text "Uppercase", fs 14, uppercase, weight 500
  Text "Italic text", fs 16, italic`,
    description: 'Typography styles',
    expectedNodes: 7,
  },
  {
    name: 'shadows-effects',
    category: 'styling',
    code: `Frame hor, gap 16, pad 24
  Frame w 80, h 80, bg white, rad 8, shadow sm
  Frame w 80, h 80, bg white, rad 8, shadow md
  Frame w 80, h 80, bg white, rad 8, shadow lg
  Frame w 80, h 80, bg white, rad 8, opacity 0.5`,
    description: 'Shadows and effects',
    expectedNodes: 5,
  },

  // State Fixtures
  {
    name: 'toggle-state',
    category: 'states',
    code: `Button "Toggle Me", bg #333, col white, pad 12 24, rad 6, toggle()
  on:
    bg #2271C1`,
    description: 'Toggle state button',
    expectedNodes: 1,
  },
  {
    name: 'hover-state',
    category: 'states',
    code: `Button "Hover Me", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444
    scale 1.02`,
    description: 'Hover state button',
    expectedNodes: 1,
  },
  {
    name: 'exclusive-tabs',
    category: 'states',
    code: `Frame hor, gap 0
  Button "Tab 1", pad 12 20, col #888, exclusive(), selected
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 2", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1
  Button "Tab 3", pad 12 20, col #888, exclusive()
    selected:
      col white
      bor 0 0 2 0, boc #2271C1`,
    description: 'Exclusive selection tabs',
    expectedNodes: 4,
  },
]

// =============================================================================
// Fixtures API Implementation
// =============================================================================

export class FixturesAPIImpl implements FixturesAPI {
  private fixtures: Map<string, Fixture> = new Map()

  constructor() {
    // Register built-in fixtures
    for (const fixture of BUILTIN_FIXTURES) {
      this.fixtures.set(fixture.name, fixture)
    }
  }

  private get editor(): any {
    return (window as any).editor
  }

  private get compileTestCode(): any {
    return (window as any).__compileTestCode
  }

  register(fixture: Fixture): void {
    this.fixtures.set(fixture.name, fixture)
  }

  get(name: string): Fixture | undefined {
    return this.fixtures.get(name)
  }

  getByCategory(category: string): Fixture[] {
    return Array.from(this.fixtures.values()).filter(f => f.category === category)
  }

  list(): string[] {
    return Array.from(this.fixtures.keys())
  }

  async load(name: string): Promise<void> {
    const fixture = this.fixtures.get(name)
    if (!fixture) {
      throw new Error(`Fixture "${name}" not found. Available: ${this.list().join(', ')}`)
    }
    await this.loadCode(fixture.code)
  }

  async loadCode(code: string): Promise<void> {
    if (!this.editor) {
      throw new Error('Editor not available')
    }

    // Set editor content
    const doc = this.editor.state.doc
    this.editor.dispatch({
      changes: { from: 0, to: doc.length, insert: code },
    })

    // Compile
    if (this.compileTestCode) {
      this.compileTestCode(code)
    }

    // Wait for DOM updates
    await this.waitForCompile()
  }

  getPath(category: string, name: string): string {
    return `tests/fixtures/${category}/${name}.mirror`
  }

  async loadFromFile(path: string): Promise<string | null> {
    // Try window.files (virtual file system)
    const files = (window as any).files
    if (files && files[path]) {
      return files[path]
    }

    // Try fetch for actual files
    try {
      const response = await fetch(path)
      if (response.ok) {
        return await response.text()
      }
    } catch {
      // Ignore fetch errors
    }

    return null
  }

  createTests(spec: FixtureSpec): TestCase[] {
    const tests: TestCase[] = []

    for (const expectation of spec.expectations) {
      tests.push({
        name: `${spec.name}: ${expectation.nodeId}`,
        tags: spec.tags,
        setup: this.fixtures.get(spec.fixture)?.code,
        run: async (api: TestAPI) => {
          // Use DOM bridge for verification
          const result = api.dom.verify(expectation.nodeId, expectation.expect as any)
          if (!result.passed) {
            const failures = result.failures
              .map(f => `${f.property}: expected ${f.expected}, got ${f.actual}`)
              .join('; ')
            throw new Error(`Verification failed: ${failures}`)
          }
        },
      })
    }

    return tests
  }

  private async waitForCompile(timeout = 2000): Promise<void> {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const check = () => {
        const preview = document.getElementById('preview')
        const hasNodes = preview?.querySelectorAll('[data-mirror-id]').length ?? 0

        if (hasNodes > 0) {
          setTimeout(resolve, 100)
          return
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Compile timeout'))
          return
        }

        setTimeout(check, 50)
      }

      setTimeout(check, 50)
    })
  }
}

// =============================================================================
// Factory
// =============================================================================

let fixturesInstance: FixturesAPIImpl | null = null

export function createFixturesAPI(): FixturesAPI {
  if (!fixturesInstance) {
    fixturesInstance = new FixturesAPIImpl()
  }
  return fixturesInstance
}

export function getFixtures(): FixturesAPI {
  return createFixturesAPI()
}
