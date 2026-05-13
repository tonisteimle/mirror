/**
 * Preview CDP — shared Mirror-source fixtures.
 *
 * Each fixture is the literal editor source for a test. Keep them
 * minimal and self-explanatory. Tests start from these fixtures via
 * `testWithSetup(name, fixture, ...)`.
 */

export const FIXTURES = {
  /** Empty editor — first drop into a blank canvas. */
  empty: '',

  /** Single Frame, no children. */
  oneFrame: 'Frame w 200, h 120, bg #1a1a1a',

  /** Single Frame, a clear background colour and size for click verification. */
  oneFrameVisible: 'Frame w 240, h 160, bg #2271C1, rad 8',

  /** Two top-level Frames for reorder tests. */
  twoFramesStacked: `Frame w 200, h 80, bg #2271C1
Frame w 200, h 80, bg #ef4444`,

  /** Three siblings stacked — for index-based drops. */
  threeFramesStacked: `Frame w 200, h 60, bg #2271C1
Frame w 200, h 60, bg #ef4444
Frame w 200, h 60, bg #10b981`,

  /** Container with one child — used for nesting/move tests. */
  containerWithChild: `Frame w 320, h 200, bg #1a1a1a, pad 16
  Frame w 80, h 60, bg #2271C1`,

  /** Two containers — moving an element from one to the other. */
  twoContainersOneChild: `Frame w 200, h 200, bg #1a1a1a, pad 16
  Frame w 60, h 60, bg #2271C1
Frame w 200, h 200, bg #27272a, pad 16`,

  /** Frame with explicit padding — for padding-handle tests. */
  framePadding: 'Frame w 240, h 160, bg #2271C1, pad 24',

  /** Frame with explicit margin — for margin-handle tests. */
  frameMargin: 'Frame w 240, h 160, bg #2271C1, mar 24',

  /** Horizontal flex with two children — for gap tests. */
  twoChildrenHorizontal: `Frame hor, gap 16, w 320, h 80, bg #1a1a1a, pad 12
  Frame w 60, h 56, bg #2271C1
  Frame w 60, h 56, bg #ef4444`,

  /** Vertical flex with two children — for gap tests. */
  twoChildrenVertical: `Frame ver, gap 16, w 200, h 240, bg #1a1a1a, pad 12
  Frame w 176, h 60, bg #2271C1
  Frame w 176, h 60, bg #ef4444`,

  /** Text element — for inline-edit tests. */
  oneText: 'Text "Hello"',

  /** Frame with a Text child — for nested inline-edit and selection tests. */
  frameWithText: `Frame w 240, h 80, bg #1a1a1a, pad 16
  Text "Hello", col white`,

  /**
   * Two siblings + an inner empty Frame inside one of them — for
   * drag-nesting tests. Drag the orange sibling INTO the empty inner
   * container to verify a one-level nest works end-to-end with
   * Trusted Events.
   *
   *   outerDark (#1a1a1a)
   *     innerLight (#27272a)  ← drop target
   *     orangeSibling (#f59e0b)  ← drag source
   */
  twoSiblingsWithInnerTarget: `Frame w 320, h 200, bg #1a1a1a, pad 16, gap 12
  Frame w 120, h 80, bg #27272a
  Frame w 60, h 60, bg #f59e0b`,

  /**
   * Outer container with an inner container, inner contains the
   * orange. Outer also has an empty drop area (its own padding) so
   * the un-nest target is the outer itself. Tests dragging the
   * orange OUT of the inner up to the outer.
   *
   *   outerDark (#1a1a1a)
   *     innerLight (#27272a)
   *       orange (#f59e0b)  ← drag source; will become child of
   *                            outer at the outer's level
   */
  orangeInsideInnerContainer: `Frame w 320, h 240, bg #1a1a1a, pad 16, gap 12
  Frame w 200, h 160, bg #27272a, pad 12
    Frame w 60, h 60, bg #f59e0b`,

  /**
   * Three-level deep starting position with three potential drop
   * targets at different depths. Drag the orange INTO the deepest
   * empty container to verify multi-level reparenting works.
   *
   *   outerDark (#1a1a1a)
   *     midLight (#27272a)
   *       deepGray (#3f3f46)  ← drop target (deepest, empty)
   *     orange (#f59e0b)  ← drag source (sibling of midLight, will
   *                          end up nested 2 levels deeper)
   */
  threeLevelWithDeepEmptyTarget: `Frame w 360, h 280, bg #1a1a1a, pad 16, gap 12
  Frame w 240, h 200, bg #27272a, pad 12
    Frame w 180, h 140, bg #3f3f46
  Frame w 60, h 60, bg #f59e0b`,

  /**
   * Top-level Text + an empty Frame as drop target.
   * Drag the Text INTO the Frame so it becomes a child Text.
   *
   *   text  ← drag source (top-level)
   *   targetFrame (#27272a)  ← drop target (empty)
   *
   * After drag:
   *
   *   targetFrame
   *     text
   */
  topLevelTextPlusEmptyFrame: `Text "Drag me", col #f59e0b
Frame w 240, h 120, bg #27272a`,

  /**
   * Two-level container target — outer with an inner empty container,
   * orange sibling at outer level. Tests the intermediate-depth nest
   * (drop into the inner, ending at 2-level depth — distinct from the
   * 3-level test by NOT having a third container layer).
   *
   *   outerDark (#1a1a1a)
   *     innerLight (#27272a)  ← drop target (empty, level 1)
   *   orange (#f59e0b)  ← drag source (top-level sibling of outer)
   *
   * After drag:
   *
   *   outerDark
   *     innerLight
   *       orange  ← level 2
   */
  twoLevelContainerTarget: `Frame w 280, h 200, bg #1a1a1a, pad 16
  Frame w 200, h 140, bg #27272a
Frame w 60, h 60, bg #f59e0b`,
} as const

export type FixtureName = keyof typeof FIXTURES
