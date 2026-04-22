/**
 * Property Panel Test Suite Index
 *
 * Re-exports from the existing property-panel-tests.ts file.
 */

export {
  allPropertyPanelTests,
  tokenDisplayTests,
  tokenValueTests,
  tokenInteractionTests,
  projectTokenTests,
  radiusChangeTests,
} from '../property-panel-tests'

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
