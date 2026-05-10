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

  /** Roomy 2-level hierarchy for nested drop tests. */
  twoLevelHierarchy: `Frame w 360, h 280, bg #1a1a1a, pad 24
  Frame w 240, h 160, bg #27272a, pad 16`,

  /** Roomy 3-level hierarchy. */
  threeLevelHierarchy: `Frame w 400, h 320, bg #1a1a1a, pad 24
  Frame w 320, h 240, bg #27272a, pad 16
    Frame w 240, h 160, bg #3f3f46, pad 12`,
} as const

export type FixtureName = keyof typeof FIXTURES
