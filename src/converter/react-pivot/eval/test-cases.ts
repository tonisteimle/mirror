/**
 * @module converter/react-pivot/eval/test-cases
 * @description Test cases for evaluating LLM generation quality
 *
 * Each test case defines:
 * - prompt: What the user asks for
 * - expectedPatterns: Regex patterns that MUST be in the output
 * - forbiddenPatterns: Regex patterns that must NOT be in the output
 * - minComponents: Minimum number of components expected
 * - category: Test category for grouping
 */

// =============================================================================
// Types
// =============================================================================

export interface EvalTestCase {
  id: string
  prompt: string
  category: TestCategory
  expectedPatterns: RegExp[]
  forbiddenPatterns: RegExp[]
  minComponents?: number
  description?: string
}

export type TestCategory =
  | 'basic'          // Simple single-component tests
  | 'layout'         // Layout and alignment tests
  | 'tokens'         // Token usage tests
  | 'states'         // State handling tests
  | 'events'         // Event and action tests
  | 'forms'          // Form components
  | 'lists'          // Lists and iterations
  | 'modals'         // Modals and overlays
  | 'complex'        // Complex multi-component tests

// =============================================================================
// Forbidden Patterns (should never appear)
// =============================================================================

export const UNIVERSAL_FORBIDDEN_PATTERNS: RegExp[] = [
  // No hardcoded hex colors
  /#[0-9a-fA-F]{3,6}\b/,

  // No className usage
  /\bclassName\b/,

  // No raw HTML elements
  /\bdiv\b/i,
  /\bspan\b/i,

  // No React hooks
  /\buseState\b/,
  /\buseEffect\b/,
  /\buseRef\b/,
  /\buseMemo\b/,
  /\buseCallback\b/,

  // No color names (except transparent)
  /\bcol\s+white\b/i,
  /\bcol\s+black\b/i,
  /\bbg\s+white\b/i,
  /\bbg\s+black\b/i,
  /\bcol\s+red\b/i,
  /\bcol\s+blue\b/i,
  /\bbg\s+red\b/i,
  /\bbg\s+blue\b/i,

  // No rgba/rgb colors
  /\brgba?\s*\(/i,
]

// =============================================================================
// Test Cases
// =============================================================================

export const EVAL_TEST_CASES: EvalTestCase[] = [
  // ====================== BASIC ======================
  {
    id: 'basic-1',
    category: 'basic',
    prompt: 'A simple button',
    expectedPatterns: [
      /\bButton\b/,
      /\$\w+\.bg/,        // Must use token for bg
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'basic-2',
    category: 'basic',
    prompt: 'A card with a title',
    expectedPatterns: [
      /\bCard\b/i,
      /\bTitle\b|\bText\b/,
      /\$\w+\.bg/,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'basic-3',
    category: 'basic',
    prompt: 'An icon button with a plus sign',
    expectedPatterns: [
      /\bButton\b/,
      /\bIcon\b/,
      /\bplus\b|add\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'basic-4',
    category: 'basic',
    prompt: 'A text input with placeholder',
    expectedPatterns: [
      /\bInput\b/,
      /placeholder/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'basic-5',
    category: 'basic',
    prompt: 'An avatar image',
    expectedPatterns: [
      /\bAvatar\b|\bImage\b/,
      /\brad\b|\bborderRadius\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== LAYOUT ======================
  {
    id: 'layout-1',
    category: 'layout',
    prompt: 'A horizontal row of 3 buttons',
    expectedPatterns: [
      /\bRow\b|\bhor\b/i,
      /\bButton\b/,
      /\bgap\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 4, // Row + 3 Buttons
  },
  {
    id: 'layout-2',
    category: 'layout',
    prompt: 'A centered card',
    expectedPatterns: [
      /\bCard\b/i,
      /\bcenter\b|\bcen\b|\balignItems.*center/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'layout-3',
    category: 'layout',
    prompt: 'A header with title on left and button on right',
    expectedPatterns: [
      /\bRow\b|\bhor\b/i,
      /\bspread\b|\bjustifyContent.*between/i,
      /\bTitle\b|\bText\b/,
      /\bButton\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 3,
  },
  {
    id: 'layout-4',
    category: 'layout',
    prompt: 'A grid of 3 cards',
    expectedPatterns: [
      /\bgrid\b|\bRow\b/i,
      /\bCard\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
  {
    id: 'layout-5',
    category: 'layout',
    prompt: 'A sidebar with full height',
    expectedPatterns: [
      /\bCol\b|\bver\b|\bSidebar\b/i,
      /\bheight\b.*\bfull\b|\bh\s+full\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== TOKENS ======================
  {
    id: 'tokens-1',
    category: 'tokens',
    prompt: 'A primary colored button',
    expectedPatterns: [
      /\bButton\b/,
      /\$primary\.bg/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'tokens-2',
    category: 'tokens',
    prompt: 'A muted text label',
    expectedPatterns: [
      /\bText\b|\bLabel\b/,
      /\$muted\.col/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'tokens-3',
    category: 'tokens',
    prompt: 'A danger button for delete action',
    expectedPatterns: [
      /\bButton\b/,
      /\$danger\.bg/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'tokens-4',
    category: 'tokens',
    prompt: 'A success message card',
    expectedPatterns: [
      /\bCard\b|\bAlert\b/i,
      /\$success/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'tokens-5',
    category: 'tokens',
    prompt: 'An elevated card with surface background',
    expectedPatterns: [
      /\bCard\b/i,
      /\$elevated\.bg|\$surface\.bg/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== STATES ======================
  {
    id: 'states-1',
    category: 'states',
    prompt: 'A button with hover effect',
    expectedPatterns: [
      /\bButton\b/,
      /\bhover\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'states-2',
    category: 'states',
    prompt: 'A nav item that can be selected',
    expectedPatterns: [
      /\bNav\b|\bItem\b/i,
      /\bselected\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'states-3',
    category: 'states',
    prompt: 'A toggle switch',
    expectedPatterns: [
      /\bToggle\b|\bSwitch\b|\bButton\b/i,
      /\bon\b|\boff\b|\bactive\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'states-4',
    category: 'states',
    prompt: 'A disabled input field',
    expectedPatterns: [
      /\bInput\b/,
      /\bdisabled\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'states-5',
    category: 'states',
    prompt: 'An expandable accordion section',
    expectedPatterns: [
      /\bAccordion\b|\bSection\b|\bPanel\b/i,
      /\bexpanded\b|\bcollapsed\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== EVENTS ======================
  {
    id: 'events-1',
    category: 'events',
    prompt: 'A button that shows a panel when clicked',
    expectedPatterns: [
      /\bButton\b/,
      /\bonclick\b|\bonClick\b/,
      /\bshow\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'events-2',
    category: 'events',
    prompt: 'A close button that hides something',
    expectedPatterns: [
      /\bButton\b/,
      /\bonclick\b|\bonClick\b/,
      /\bhide\b|\bclose\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'events-3',
    category: 'events',
    prompt: 'A tab that activates when clicked',
    expectedPatterns: [
      /\bTab\b|\bItem\b/i,
      /\bonclick\b|\bonClick\b/,
      /\bactivate\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'events-4',
    category: 'events',
    prompt: 'A button that toggles visibility',
    expectedPatterns: [
      /\bButton\b/,
      /\bonclick\b|\bonClick\b/,
      /\btoggle\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'events-5',
    category: 'events',
    prompt: 'A link that navigates to another page',
    expectedPatterns: [
      /\bLink\b|\bButton\b/,
      /\bonclick\b|\bonClick\b|href/i,
      /\bpage\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== FORMS ======================
  {
    id: 'forms-1',
    category: 'forms',
    prompt: 'A login form with email and password',
    expectedPatterns: [
      /\bForm\b/i,
      /\bInput\b/,
      /\bemail\b/i,
      /\bpassword\b/i,
      /\bButton\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
  {
    id: 'forms-2',
    category: 'forms',
    prompt: 'A search bar with icon',
    expectedPatterns: [
      /\bInput\b/,
      /\bIcon\b/,
      /\bsearch\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'forms-3',
    category: 'forms',
    prompt: 'A contact form with name, email, and message',
    expectedPatterns: [
      /\bForm\b/i,
      /\bInput\b/,
      /\bTextarea\b/i,
      /\bname\b/i,
      /\bemail\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
  {
    id: 'forms-4',
    category: 'forms',
    prompt: 'A form field with label and input',
    expectedPatterns: [
      /\bLabel\b|\bText\b/,
      /\bInput\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'forms-5',
    category: 'forms',
    prompt: 'A checkbox with label',
    expectedPatterns: [
      /\bCheckbox\b|\bInput\b/i,
      /\bLabel\b|\bText\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },

  // ====================== LISTS ======================
  {
    id: 'lists-1',
    category: 'lists',
    prompt: 'A navigation menu with 4 items',
    expectedPatterns: [
      /\bNav\b|\bMenu\b|\bCol\b/i,
      /\bItem\b|\bNavItem\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 5,
  },
  {
    id: 'lists-2',
    category: 'lists',
    prompt: 'A user list with avatars',
    expectedPatterns: [
      /\bList\b|\bCol\b/i,
      /\bAvatar\b|\bImage\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'lists-3',
    category: 'lists',
    prompt: 'A dynamic list using each iterator',
    expectedPatterns: [
      /\beach\b/i,
      /\$\w+/,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'lists-4',
    category: 'lists',
    prompt: 'A selectable list with highlight',
    expectedPatterns: [
      /\bList\b|\bCol\b/i,
      /\bselect\b|\bhighlight\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'lists-5',
    category: 'lists',
    prompt: 'A master-detail list',
    expectedPatterns: [
      /\bRow\b|\bCol\b/i,
      /\$selected\b/i,
      /\bassign\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 3,
  },

  // ====================== MODALS ======================
  {
    id: 'modals-1',
    category: 'modals',
    prompt: 'A confirmation dialog',
    expectedPatterns: [
      /\bModal\b|\bDialog\b/i,
      /\bButton\b/,
      /\bhidden\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 3,
  },
  {
    id: 'modals-2',
    category: 'modals',
    prompt: 'A tooltip on hover',
    expectedPatterns: [
      /\bTooltip\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },
  {
    id: 'modals-3',
    category: 'modals',
    prompt: 'A dropdown menu',
    expectedPatterns: [
      /\bDropdown\b|\bMenu\b/i,
      /\bhidden\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'modals-4',
    category: 'modals',
    prompt: 'A popup that opens below a button',
    expectedPatterns: [
      /\bPopup\b|\bPanel\b|\bBox\b/i,
      /\bbelow\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 2,
  },
  {
    id: 'modals-5',
    category: 'modals',
    prompt: 'A toast notification',
    expectedPatterns: [
      /\bToast\b|\bAlert\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 1,
  },

  // ====================== COMPLEX ======================
  {
    id: 'complex-1',
    category: 'complex',
    prompt: 'A dashboard header with logo, navigation, and user menu',
    expectedPatterns: [
      /\bRow\b|\bHeader\b/i,
      /\bNav\b|\bMenu\b/i,
      /\bAvatar\b|\bUser\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 5,
  },
  {
    id: 'complex-2',
    category: 'complex',
    prompt: 'A stats dashboard with 4 metric cards',
    expectedPatterns: [
      /\bRow\b|\bgrid\b/i,
      /\bCard\b/i,
      /\$\w+\.bg/,
    ],
    forbiddenPatterns: [],
    minComponents: 5,
  },
  {
    id: 'complex-3',
    category: 'complex',
    prompt: 'A settings page with sections and toggles',
    expectedPatterns: [
      /\bCol\b|\bSection\b/i,
      /\bToggle\b|\bSwitch\b/i,
      /\bRow\b/i,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
  {
    id: 'complex-4',
    category: 'complex',
    prompt: 'A chat message with avatar, name, time, and content',
    expectedPatterns: [
      /\bRow\b|\bCol\b/i,
      /\bAvatar\b|\bImage\b/i,
      /\bText\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
  {
    id: 'complex-5',
    category: 'complex',
    prompt: 'A product card with image, title, price, and add to cart button',
    expectedPatterns: [
      /\bCard\b/i,
      /\bImage\b/,
      /\bTitle\b|\bText\b/,
      /\bButton\b/,
    ],
    forbiddenPatterns: [],
    minComponents: 4,
  },
]

// =============================================================================
// Helpers
// =============================================================================

export function getTestCasesByCategory(category: TestCategory): EvalTestCase[] {
  return EVAL_TEST_CASES.filter((tc) => tc.category === category)
}

export function getTestCaseById(id: string): EvalTestCase | undefined {
  return EVAL_TEST_CASES.find((tc) => tc.id === id)
}

export function getAllCategories(): TestCategory[] {
  return ['basic', 'layout', 'tokens', 'states', 'events', 'forms', 'lists', 'modals', 'complex']
}
