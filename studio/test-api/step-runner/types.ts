/**
 * Step-Runner Types
 *
 * Declarative test scenarios. Each step describes one action plus the full
 * expected state across three dimensions: source code, rendered DOM, and
 * Property Panel. The runner enforces the expectations after every step,
 * so drift between the dimensions (the bidirectional-sync class of bugs)
 * is caught the moment it happens, not at the end.
 *
 * See docs/concepts/step-runner.md for the design rationale.
 */

// =============================================================================
// Actions — three categories matching the three input methods
// =============================================================================

export type StepAction =
  // ---------------------------------------------------------------------------
  // Direct manipulation (preview canvas)
  // ---------------------------------------------------------------------------
  | { do: 'select'; nodeId: string | null }
  | { do: 'click'; nodeId: string }
  | {
      do: 'pressKey'
      key: string
      alt?: boolean
      shift?: boolean
      meta?: boolean
      ctrl?: boolean
    }
  | { do: 'undo' }
  | { do: 'redo' }

  // ---------------------------------------------------------------------------
  // Property Panel (low-level — prefer `setProperty` below)
  // ---------------------------------------------------------------------------
  | { do: 'panelSet'; property: string; value: string }
  | { do: 'panelRemove'; property: string }

  // ---------------------------------------------------------------------------
  // High-level: set a property on a node via one of the three input methods.
  // The writer for the property knows how to do this through code, panel, or
  // a real preview interaction. Tests can re-run the same scenario with
  // `via` swapped to verify cross-modal sync.
  // ---------------------------------------------------------------------------
  | {
      do: 'setProperty'
      via: 'code' | 'panel' | 'preview'
      target: string
      property: string
      value: string
    }

  // ---------------------------------------------------------------------------
  // Code editor (CodeMirror)
  // ---------------------------------------------------------------------------
  | { do: 'editorSet'; code: string }
  | { do: 'editorInsert'; line: number; text: string; indent?: number }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  | { do: 'wait'; ms: number }

// =============================================================================
// Expectations — three readout dimensions plus side-channels
// =============================================================================

export interface Expectations {
  /**
   * Full source code after this step. Exact match (whitespace-canonicalized).
   * This is the strict default — drift detection comes from here.
   */
  code?: string

  /**
   * Regex match against code for cases where exact match is too brittle
   * (e.g. AI-generated content). Prefer `code` whenever possible.
   */
  codeMatches?: RegExp

  /**
   * Selected node id. Use `null` to assert no selection.
   */
  selection?: string | null

  /**
   * Selection MUST NOT equal this id. Useful after insertion when you don't
   * know the new node's id yet.
   */
  selectionNot?: string

  /**
   * Per-node computed-style assertions. Reads via window.getComputedStyle —
   * tests the Mirror→CSS pipeline, not just inline styles.
   *
   * @example { 'node-1': { paddingTop: '24px' } }
   */
  dom?: Record<string, Record<string, string | RegExp>>

  /**
   * Property Panel value assertions. Reads from the panel's state, not from
   * the panel DOM — so this catches "panel doesn't update after manipulation"
   * bugs that DOM-scraping would miss.
   *
   * @example { pad: '24', col: 'white' }
   */
  panel?: Record<string, string | null>

  /**
   * Property assertions across **all three dimensions** at once. For each
   * (nodeId, propertyName, expectedValue), the runner reads the property
   * from the code, the DOM, and the panel — and fails if any of the three
   * disagrees with the expected value (or with each other).
   *
   * This is the recommended way to assert property state. It catches both
   * value bugs ("padding is 16, not 24") and sync bugs ("code says 24, DOM
   * still renders 16, panel shows 24") in one declaration.
   *
   * Currently supported properties: `pad`. Others throw "no reader".
   *
   * @example { 'node-1': { pad: '24' } }
   */
  props?: Record<string, Record<string, string | null>>

  /**
   * Console must be free of new errors since the previous step. Default true.
   * Set to false explicitly for steps where an error is expected.
   */
  consoleClean?: boolean

  /**
   * Expected delta in undo-stack size after this step. +1 = one new undo
   * entry, 0 = nothing pushed (e.g. session still open, or no-op).
   */
  undoStackDelta?: number
}

// =============================================================================
// Step + Scenario
// =============================================================================

export type Step = StepAction & {
  /** Free-form note shown in the step label, useful for narrative tests. */
  comment?: string
  /** What must hold AFTER the action runs. */
  expect?: Expectations
}

export interface Scenario {
  name: string
  category?: string
  /** Initial Mirror source loaded before the first step runs. */
  setup: string
  steps: Step[]
}
