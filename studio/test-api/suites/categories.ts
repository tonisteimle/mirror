/**
 * Consolidated Test Categories
 *
 * 17 main categories for browser tests, replacing the fragmented structure.
 * Each category combines related test suites for easier execution and understanding.
 *
 * Usage:
 *   npm run test:browser -- --category=layout
 *   npm run test:browser -- --category=components
 */

import type { TestCase } from '../types'

// =============================================================================
// Imports from existing test suites
// =============================================================================

// Core (Primitives)
import { allPrimitivesTests } from './primitives'
import { inlineMarkdownTests } from './core/inline-markdown.test'

// Layout
import { allLayoutTests } from './layout'
import { allLayoutShortcutTests, allWrapLayoutTests } from './interactions'
import { allLayoutVerificationTests } from './layout-verification'

// Styling
import { allStylingTests } from './styling'
import { allGradientTests } from './gradients'

// Visuals (Animations + Transforms)
import { allAnimationTests } from './animations'
import { allTransformTests } from './transforms'

// States
import { allStateTests } from './states'

// Components (Pure Mirror UI Patterns + DatePicker)
import {
  selectTests,
  datePickerTests,
  allAccordionTests,
  allAccordionDropTests,
  allPanelDragTests,
  // DSL component-system tests (definition, inheritance, slots, variants, states)
  allComponentTests,
} from './components'

// Drag & Drop
import {
  allComprehensiveDragTests,
  allStackedDragTests,
  allFlexReorderTests,
  allAlignmentZoneTests,
  allAlignmentFromEmptyTests,
  allAlignmentFromMoveTests,
  eachTemplateGuardTests,
} from './drag'

// Handles (Visual Manipulation)
import {
  allPaddingHandlerTests,
  allMarginHandlerTests,
  allGapHandlerTests,
  allResizeHandleDblClickTests,
  resizeHandleDragTests,
  allPaddingTests,
  allMarginTests,
  allSnappingTests,
  tokenExtractTests,
  componentExtractTests,
  batchReplaceTests,
  allKeyboardEditingTests,
} from './interactions'

// Selection
import {
  allMultiselectTests,
  allEditorMultiselectTests,
  allUngroupTests,
  allSpreadToggleTests,
  allValidationTests,
} from './interactions'

// Property Panel
import {
  allPropertyPanelTests,
  allComprehensivePropertyTests,
  colorPickerTests,
  iconPickerTests,
  allEventsTests,
  allTokenDropdownTests,
  allPrimitiveSectionTests,
} from './property-panel'
import { allPropertyRobustnessTests } from './property-robustness'

// Editor
import { allBidirectionalTests } from './bidirectional'
import { allSyncTests } from './sync'
import { allUndoRedoTests } from './undo-redo'
import { allAutocompleteTests } from './autocomplete'
import { allIndentationTests } from './editor/indentation.test'
import { allEditorDropTests } from './editor/editor-drop.test'
import { allLinterTests } from './editor/linter.test'

// Data (Data Binding, Actions, Events, Responsive, Charts)
import { allDataBindingTests } from './data-binding'
import { allActionTests } from './actions'
import { allEventTests } from './events'
import { allResponsiveTests } from './responsive'
import { allChartTests } from './charts'

// Project
import { allProjectTests } from './project'
import { allWorkflowTests } from './workflow'
import { allUIBuilderTests } from './ui-builder'
import { demoProjectTests } from './demo-project.test'

// Compiler
import { allCompilerVerificationTests, allPreludeTests } from './compiler-verification'
import { allCompilerTests } from './compiler'

// AI (LLM-Edit-Flow browser tests — populated in Phase 4)
import { allAITests } from './ai'

// Tutorial
import { allTutorialTests } from './tutorial'

// Stress & Integration
import { stressTests as stressTestsFromStress } from './stress'
import { allIntegrationTests } from './integration'
import { allPlayModeTests } from './playmode'
import { allTestSystemTests } from './test-system'

// Step-Runner Examples (new declarative test framework)
import { allStepRunnerExampleTests } from './step-runner-examples'

// =============================================================================
// Consolidated Categories
// =============================================================================

/**
 * 1. CORE - Basic primitives (Frame, Text, Button, Icon, etc.)
 */
export const coreTests: TestCase[] = [...allPrimitivesTests, ...inlineMarkdownTests]

/**
 * 2. LAYOUT - All layout properties (direction, gap, grid, stacked, wrap, flex)
 */
export const layoutTests: TestCase[] = [
  ...allLayoutTests,
  ...allLayoutShortcutTests,
  ...allLayoutVerificationTests,
  ...allWrapLayoutTests,
]

/**
 * 3. STYLING - Colors, sizing, spacing, borders, typography, effects, gradients
 */
export const stylingTests: TestCase[] = [...allStylingTests, ...allGradientTests]

/**
 * 4. VISUALS - Animations and transforms (motion effects)
 */
export const visualsTests: TestCase[] = [...allAnimationTests, ...allTransformTests]

/**
 * 5. STATES - State management (toggle, exclusive, hover, cross-element)
 */
export const statesTests: TestCase[] = [...allStateTests]

/**
 * 6. COMPONENTS - Pure Mirror UI patterns + DatePicker (the only remaining
 * Zag component). Former Zag components (checkbox/switch/slider/dialog/etc.)
 * are now Pure Mirror templates and tested via the DSL component-system tests.
 */
export const componentsTests: TestCase[] = [
  ...selectTests,
  ...datePickerTests,
  ...allAccordionTests,
  ...allAccordionDropTests,
  ...allPanelDragTests,
  ...allComponentTests,
]

/**
 * 7. DRAG - All drag & drop operations (palette drops, canvas moves, reordering)
 */
export const dragTests: TestCase[] = [
  ...allComprehensiveDragTests,
  ...allStackedDragTests,
  ...allFlexReorderTests,
  ...allAlignmentZoneTests,
  ...allAlignmentFromEmptyTests,
  ...allAlignmentFromMoveTests,
  ...eachTemplateGuardTests,
]

/**
 * 8. HANDLES - Visual manipulation (padding, margin, gap, resize handlers, snapping)
 */
export const handlesTests: TestCase[] = [
  ...allPaddingHandlerTests,
  ...allMarginHandlerTests,
  ...allGapHandlerTests,
  ...allResizeHandleDblClickTests,
  ...resizeHandleDragTests,
  ...allPaddingTests,
  ...allMarginTests,
  ...allSnappingTests,
  ...tokenExtractTests,
  ...componentExtractTests,
  ...batchReplaceTests,
  ...allKeyboardEditingTests,
]

/**
 * 8b. STEP-RUNNER - New declarative test framework (separate category so
 * iteration on step-runner scenarios doesn't have to wait for the full
 * handles suite to enumerate).
 */
export const stepRunnerTests: TestCase[] = [...allStepRunnerExampleTests]

/**
 * 9. SELECTION - Multi-select, editor multiselect, ungroup, spread toggle,
 * plus DOM/visual validation (spread CSS, ungroup DOM, undo/redo with selection).
 */
export const selectionTests: TestCase[] = [
  ...allMultiselectTests,
  ...allEditorMultiselectTests,
  ...allUngroupTests,
  ...allSpreadToggleTests,
  ...allValidationTests,
]

/**
 * 10. PROPERTY PANEL - Property panel UI, pickers, settings, robustness
 */
export const propertyPanelTests: TestCase[] = [
  ...allPropertyPanelTests,
  ...allComprehensivePropertyTests,
  ...colorPickerTests,
  ...iconPickerTests,
  ...allEventsTests,
  ...allPropertyRobustnessTests,
  ...allTokenDropdownTests,
  ...allPrimitiveSectionTests,
]

/**
 * 11. EDITOR - Bidirectional sync, undo/redo, autocomplete, indentation, editor drops, linter
 */
export const editorTests: TestCase[] = [
  ...allBidirectionalTests,
  ...allSyncTests,
  ...allUndoRedoTests,
  ...allAutocompleteTests,
  ...allIndentationTests,
  ...allEditorDropTests,
  ...allLinterTests,
]

/**
 * 12. DATA - Data binding, actions, events, responsive, charts.
 */
export const dataTests: TestCase[] = [
  ...allDataBindingTests,
  ...allActionTests,
  ...allEventTests,
  ...allResponsiveTests,
  ...allChartTests,
]

/**
 * 13. PROJECT - Multi-file projects, workflows, UI builder
 */
export const projectTests: TestCase[] = [
  ...allProjectTests,
  ...allWorkflowTests,
  ...allUIBuilderTests,
  ...demoProjectTests,
]

/**
 * 14. COMPILER - Compiler verification, prelude tests
 */
export const compilerTests: TestCase[] = [
  ...allCompilerVerificationTests,
  ...allPreludeTests,
  ...allCompilerTests,
]

/**
 * 15. AI - LLM-Edit-Flow browser tests (Cmd+Enter, Cmd+Shift+Enter, Tab/Esc)
 *
 * The bulk of AI logic is unit-tested in tests/studio/ via Vitest+jsdom.
 * Browser-integration tests get added here in Phase 4.
 */
export const aiTests: TestCase[] = [...allAITests]

/**
 * 16. TUTORIAL - Tutorial verification tests
 */
export const tutorialTests: TestCase[] = [...allTutorialTests]

/**
 * 17. STRESS - Stress tests, integration tests, play mode, test system
 * NOTE: stressTestsFromStress removed - causes test runner to hang in headless mode
 * These tests are unstable and need to be run manually with --headed flag
 */
export const stressAndIntegrationTests: TestCase[] = [
  // ...stressTestsFromStress, // TODO: Causes hang at ~70% - needs investigation
  ...allIntegrationTests,
  ...allPlayModeTests,
  ...allTestSystemTests,
]

/**
 * 18. HEADED - Tests that require a real browser window (--headed mode)
 *
 * These tests rely on native browser behaviors that don't work in headless mode:
 * - Keyboard events for component navigation (Enter, Space, Arrow keys)
 * - Native focus management
 * - Real window focus state
 *
 * Run with: npm run test:browser -- --headed --category=headed
 */
export const headedOnlyTests: TestCase[] = []

// =============================================================================
// Category Registry
// =============================================================================

export type CategoryName =
  | 'core'
  | 'layout'
  | 'styling'
  | 'visuals'
  | 'states'
  | 'components'
  | 'drag'
  | 'handles'
  | 'selection'
  | 'propertyPanel'
  | 'editor'
  | 'data'
  | 'project'
  | 'compiler'
  | 'ai'
  | 'tutorial'
  | 'stress'
  | 'headed'
  | 'stepRunner'

export interface CategoryInfo {
  name: CategoryName
  description: string
  tests: TestCase[]
}

export const categories: Record<CategoryName, CategoryInfo> = {
  core: {
    name: 'core',
    description: 'Basic primitives (Frame, Text, Button, Icon, etc.)',
    tests: coreTests,
  },
  layout: {
    name: 'layout',
    description: 'Layout properties (direction, gap, grid, stacked, wrap)',
    tests: layoutTests,
  },
  styling: {
    name: 'styling',
    description: 'Styling (colors, sizing, spacing, borders, typography, gradients)',
    tests: stylingTests,
  },
  visuals: {
    name: 'visuals',
    description: 'Animations and transforms (motion effects)',
    tests: visualsTests,
  },
  states: {
    name: 'states',
    description: 'State management (toggle, exclusive, hover, cross-element)',
    tests: statesTests,
  },
  components: {
    name: 'components',
    description: 'Pure Mirror UI patterns (checkbox, dialog, tabs, etc.)',
    tests: componentsTests,
  },
  drag: {
    name: 'drag',
    description: 'Drag & drop (palette drops, canvas moves, reordering)',
    tests: dragTests,
  },
  handles: {
    name: 'handles',
    description: 'Visual manipulation (padding, margin, gap, resize, snapping)',
    tests: handlesTests,
  },
  stepRunner: {
    name: 'stepRunner',
    description: 'Step-runner (declarative scenarios, 3-D validation)',
    tests: stepRunnerTests,
  },
  selection: {
    name: 'selection',
    description: 'Selection (multiselect, ungroup, spread toggle)',
    tests: selectionTests,
  },
  propertyPanel: {
    name: 'propertyPanel',
    description: 'Property panel UI and pickers',
    tests: propertyPanelTests,
  },
  editor: {
    name: 'editor',
    description: 'Editor (bidirectional sync, undo/redo, autocomplete, indentation, linter)',
    tests: editorTests,
  },
  data: {
    name: 'data',
    description: 'Data binding, actions, events, responsive',
    tests: dataTests,
  },
  project: {
    name: 'project',
    description: 'Multi-file projects and workflows',
    tests: projectTests,
  },
  compiler: {
    name: 'compiler',
    description: 'Compiler verification and edge cases',
    tests: compilerTests,
  },
  ai: {
    name: 'ai',
    description: 'AI-assist (LLM-Edit-Flow browser tests)',
    tests: aiTests,
  },
  tutorial: {
    name: 'tutorial',
    description: 'Tutorial verification tests',
    tests: tutorialTests,
  },
  stress: {
    name: 'stress',
    description: 'Stress tests, integration, play mode',
    tests: stressAndIntegrationTests,
  },
  headed: {
    name: 'headed',
    description: 'Tests requiring real browser window (--headed mode)',
    tests: headedOnlyTests,
  },
}

/**
 * Get all tests from all categories
 */
export const allCategoryTests: TestCase[] = Object.values(categories).flatMap(c => c.tests)

/**
 * Get category by name
 */
export function getCategory(name: CategoryName): CategoryInfo {
  return categories[name]
}

/**
 * Get test counts for all categories
 */
export function getCategoryCounts(): Record<CategoryName, number> {
  const counts: Record<string, number> = {}
  for (const [name, info] of Object.entries(categories)) {
    counts[name] = info.tests.length
  }
  return counts as Record<CategoryName, number>
}

/**
 * List all category names
 */
export function listCategories(): CategoryName[] {
  return Object.keys(categories) as CategoryName[]
}
