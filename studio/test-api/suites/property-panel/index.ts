/**
 * Property Panel Test Suite Index
 */

import type { TestCase } from '../../test-runner'
import { tokenDisplayTests } from './tokens-display.test'
import { tokenValueTests } from './tokens-values.test'
import { tokenInteractionTests } from './tokens-interaction.test'
import { projectTokenTests } from './tokens-project.test'
import { radiusChangeTests } from './radius-changes.test'
import { sectionExpandTests } from './section-expand.test'

export {
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
  radiusChangeTests,
  sectionExpandTests,
}

export const allPropertyPanelTests: TestCase[] = [
  ...tokenDisplayTests,
  ...tokenValueTests,
  ...tokenInteractionTests,
  ...projectTokenTests,
  ...radiusChangeTests,
  ...sectionExpandTests,
]

export {
  allComprehensivePropertyTests,
  sizingPropertyTests,
  spacingPropertyTests,
  colorPropertyTests,
  borderPropertyTests,
  typographyPropertyTests,
  visualPropertyTests,
  layoutPropertyTests,
  iconPropertyTests,
  complexPropertyTests,
} from './comprehensive.test'

export { colorPickerTests, allColorPickerTests } from './color-picker.test'

export { iconPickerTests, allIconPickerTests } from './icon-picker.test'

export {
  allEventsTests,
  addEventTests,
  existingEventTests,
  editEventTests,
  deleteEventTests,
  eventIntegrationTests,
} from './events.test'

// Error Handling Tests (B2.2)
export {
  allPanelErrorTests,
  invalidColorTests,
  invalidSizeTests,
  invalidTokenReferenceTests,
  spacingErrorTests,
  borderErrorTests,
  typographyErrorTests,
  panelEdgeCaseTests,
} from './errors.test'

// Token Dropdown Tests
export {
  allTokenDropdownTests,
  tokenDropdownVisibilityTests,
  tokenDropdownHoverTests,
  tokenDropdownSelectionTests,
  gapTokenDropdownTests,
  radiusTokenDropdownTests,
  fontSizeTokenDropdownTests,
} from './token-dropdown.test'

// Primitive-specific Sections Tests
export {
  allPrimitiveSectionTests,
  iconPanelTests,
  textPanelTests,
  imagePanelTests,
  buttonPanelTests,
  framePanelTests,
  inputPanelTests,
  interactionTests,
  headingPanelTests,
} from './primitive-sections.test'
