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
  // High-level: change the text content of an element. Mirror text content
  // is the quoted string right after the element name on its line. This
  // action finds and replaces it in source — equivalent to inline-edit
  // with a new value.
  // ---------------------------------------------------------------------------
  | { do: 'editText'; target: string; text: string }

  // ---------------------------------------------------------------------------
  // Hover state — triggers/clears the :hover pseudo-class on a node.
  // The element's source `hover:` block (if any) becomes the active state.
  // ---------------------------------------------------------------------------
  | { do: 'hover'; target: string }
  | { do: 'unhover'; target: string }

  // ---------------------------------------------------------------------------
  // Multi-select — click the first node, then shift-click the rest.
  // Equivalent to the user's Cmd-click / Shift-click selection flow.
  // ---------------------------------------------------------------------------
  | { do: 'multiSelect'; nodeIds: readonly string[] }

  // ---------------------------------------------------------------------------
  // Project files — switch the editor's active file. The compile target
  // changes accordingly; readers thereafter resolve against the new file.
  // ---------------------------------------------------------------------------
  | { do: 'switchFile'; filename: string }

  // ---------------------------------------------------------------------------
  // Replace a project file's content directly through the panel.files
  // API (delete + create). Useful for non-active files (data/yaml/tokens)
  // where the editor-edit + switchFile path doesn't reliably commit
  // updates to the desktopFiles cache.
  // ---------------------------------------------------------------------------
  | { do: 'replaceFile'; filename: string; content: string }

  // ---------------------------------------------------------------------------
  // `::` Extract triggers — emulate the user typing the second `:` after
  // either a property+token name (token-extract) or a component name
  // (component-extract). The action locates the matching line via
  // `target` (node id) or `searchFor` (verbatim substring), reshapes it
  // to `Name::props` / `prop name::value`, and triggers the editor's
  // CodeMirror update listener so the trigger pipeline fires.
  //
  // After the action settles, the source has been rewritten by the
  // trigger (Card:: pad …  →  Card; bg primary::#hex  →  bg $primary)
  // and the side-file (.com / .tok) has the new definition. If the
  // project contains other matching lines the batch-replace dialog
  // appears — assert / accept / cancel via the `batchReplace` action.
  // ---------------------------------------------------------------------------
  | {
      do: 'extractComponent'
      /** Name of the new component (PascalCase). */
      name: string
      /** Properties to attach to the component definition. */
      properties: string
      /**
       * Locate the line to extract from. Either a node id (preferred —
       * stable across positional resolution) or a verbatim substring
       * that occurs once in the editor's current text.
       */
      target: { nodeId: string } | { searchFor: string }
    }
  | {
      do: 'extractToken'
      /** Property the token will replace (e.g. `bg`). */
      property: string
      /** Token name (lowercase). */
      tokenName: string
      /** Verbatim value, no token-prefix (e.g. `#2271C1`). */
      value: string
      target: { nodeId: string } | { searchFor: string }
    }

  // ---------------------------------------------------------------------------
  // Batch-replace dialog interaction. The two extract actions above
  // *may* open the dialog (if other matching lines exist in the
  // project). This action asserts the dialog state and applies an
  // outcome. If `expectMatches` is set, the runner verifies the
  // checkbox count before applying; if `expectNearMatches` is set,
  // ditto for the near-match section.
  //
  //   acceptAll    — click "Anwenden" with all defaults (exact pre-
  //                  checked, near unchecked).
  //   acceptNear   — also opt-in the listed near-match indices, then
  //                  click "Anwenden".
  //   selectOnly   — uncheck all exact matches except the listed
  //                  indices, then "Anwenden".
  //   cancel       — click "Abbrechen". Original extraction stays.
  // ---------------------------------------------------------------------------
  | {
      do: 'batchReplace'
      action: 'acceptAll' | 'cancel'
      expectMatches?: number
      expectNearMatches?: number
    }
  | {
      do: 'batchReplace'
      action: 'acceptNear'
      /** 0-based indices of the near-match checkboxes to opt in. */
      nearIndices: readonly number[]
      expectMatches?: number
      expectNearMatches?: number
    }
  | {
      do: 'batchReplace'
      action: 'selectOnly'
      /** 0-based indices of the exact-match checkboxes to keep checked. */
      exactIndices: readonly number[]
      expectMatches?: number
      expectNearMatches?: number
    }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------
  //
  // `wait { ms }` — fixed delay. Code-smell: a fixed sleep is a bet that
  // the system has settled in N ms. Prefer `waitFor` whenever the success
  // condition is expressible (editor source, file content, panel value,
  // selection). Use `wait` only when nothing observable changes and you
  // genuinely just need the clock to tick (rare).
  | { do: 'wait'; ms: number }
  //
  // `waitFor` — poll until a state predicate holds (or timeout). The
  // `until` block is the same shape as `Expectations`, minus the
  // console / undo side-channels. Polling re-evaluates the predicate
  // every `intervalMs` (default 50) until either all assertions pass
  // or `timeoutMs` (default 2000) elapses, in which case the step
  // fails with the unmatched expectations as the reason.
  //
  // This is the deterministic replacement for `wait { ms: <fixed> }`
  // after operations whose completion produces an observable change
  // (switchFile, editorSet, batchReplace).
  | {
      do: 'waitFor'
      until: WaitForPredicates
      timeoutMs?: number
      intervalMs?: number
    }

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
   * Per-file source assertions. Each filename is matched against the
   * project's in-memory file cache (window.desktopFiles.getFiles()),
   * so this catches `::`-trigger side-effects on `components.com` /
   * `tokens.tok` and edits on non-active screens. Whitespace is
   * canonicalised the same way as `code`.
   *
   * Use `null` to assert a file does NOT exist.
   *
   * @example
   *   files: {
   *     'tokens.tok': 'primary.bg: #2271C1',
   *     'components.com': 'Card: bg #1a1a1a, pad 16, rad 8',
   *     'screens/dashboard.mir': 'Card\nCard',
   *   }
   */
  files?: Record<string, string | null>

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
   * Multi-selection assertion. Order-insensitive — checks the set of
   * selected node ids matches.
   */
  multiSelection?: readonly string[]

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
   * Console hygiene assertion for this step.
   *   - `true` (default) — no new errors AND no new warnings
   *   - `'errors-only'`  — no new errors; warnings tolerated
   *   - `false`          — anything goes (use sparingly; prefer fixing the root cause)
   */
  consoleClean?: boolean | 'errors-only'

  /**
   * Expected delta in undo-stack size after this step. +1 = one new undo
   * entry, 0 = nothing pushed (e.g. session still open, or no-op).
   */
  undoStackDelta?: number
}

/**
 * Subset of `Expectations` usable as a predicate for the `waitFor` step.
 * Excludes console / undo state — those are point-in-time deltas, not
 * predicates that converge over time.
 */
export type WaitForPredicates = Pick<
  Expectations,
  'code' | 'codeMatches' | 'files' | 'selection' | 'multiSelection' | 'dom' | 'panel' | 'props'
>

// =============================================================================
// Step + Scenario
// =============================================================================

export type Step = StepAction & {
  /** Free-form note shown in the step label, useful for narrative tests. */
  comment?: string
  /** What must hold AFTER the action runs. */
  expect?: Expectations
}

/**
 * Multi-file project setup. Each entry maps a filename (e.g.
 * `tokens.tok`, `components.com`, `screens/overview.mir`) to its
 * source. `entry` names the file the editor should be focused on
 * after setup — typically the main app file or the screen being
 * exercised.
 */
export interface SetupProject {
  entry: string
  files: Record<string, string>
}

export interface Scenario {
  name: string
  category?: string
  /**
   * Initial source loaded before the first step. Either a single string
   * (treated as a one-file project), or a SetupProject for cross-file
   * scenarios (tokens + components + screens).
   */
  setup: string | SetupProject
  steps: Step[]
  /**
   * Skip this scenario (don't run any steps). The reason is reported
   * back as a passing-but-skipped result so the test never silently
   * disappears. Used to park scenarios that document a known Studio
   * gap in the test suite — better than block-comment graveyards
   * which rot when surrounding code renames.
   */
  skip?: { reason: string }
}
