/**
 * Test Helpers - Central Export
 *
 * All test helper functions for studio testing.
 */

// Sync helpers
export {
  resetStudioState,
  setupStateWithSource,
  waitForDebounce,
  advanceTimersAndFlush,
  simulateSelection,
  simulateRapidSelections,
  assertEditorScrolledTo,
  assertPreviewHighlighted,
  assertEditorNotScrolled,
  assertPreviewNotHighlighted,
  assertSelection,
  setupCoordinatorWithMocks,
  cleanupCoordinator,
  buildSyncScenario,
  delay,
  measureTime,
  type SyncTestScenario,
} from './sync-helpers'

// Property Panel helpers
export {
  getPropertyInput,
  getAllPropertyInputs,
  getAllPropertyFields,
  getColorSwatch,
  getPresetButton,
  getCategorySection,
  isEmptyState,
  isNotFoundState,
  hasContent,
  simulateInputChange,
  simulatePropertyEdit,
  simulatePresetClick,
  simulateColorSwatchClick,
  simulateSelectChange,
  assertPropertyValue,
  assertPropertyInherited,
  assertPropertyInstance,
  assertPropertyInvalid,
  assertPropertyValid,
  assertPropertyUpdated,
  assertNoPropertyUpdates,
  waitForPanelUpdate,
  createTestContainer,
  removeTestContainer,
  setupPropertyPanelScenario,
  triggerTokenAutocomplete,
  getTokenAutocomplete,
  selectToken,
  type PropertyPanelTestScenario,
} from './property-panel-helpers'
