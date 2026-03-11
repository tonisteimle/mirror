/**
 * Mirror Studio Module
 *
 * Provides bidirectional editing support for Mirror Studio:
 * - SourceMap: Maps IR nodes to source positions
 * - SelectionManager: Manages element selection state
 * - PropertyExtractor: Extracts properties from AST
 * - CodeModifier: Modifies source code
 * - PropertyPanel: Dynamic property panel UI
 * - DropZoneCalculator: Calculates drop zones for drag-and-drop
 * - DragDropManager: Coordinates drag-and-drop operations
 *
 * Note: PreviewInteraction and EditorSyncManager have been replaced by
 * studio/preview/PreviewController and studio/sync/SyncCoordinator
 */

export {
  SourceMap,
  SourceMapBuilder,
  calculateSourcePosition,
  calculatePropertyPosition,
  type NodeMapping,
} from './source-map'

/**
 * @deprecated Use StateSelectionAdapter from studio/core instead.
 * These exports are kept for backwards compatibility.
 */
export {
  SelectionManager,
  getSelectionManager,
  resetSelectionManager,
  type SelectionListener,
  type BreadcrumbItem,
  type BreadcrumbListener,
} from './selection-manager'

export {
  PropertyExtractor,
  createPropertyExtractor,
  type ExtractedProperty,
  type ExtractedElement,
  type PropertyCategory,
  type PropertyType,
} from './property-extractor'

export {
  CodeModifier,
  createCodeModifier,
  applyChange,
  type CodeChange,
  type ModificationResult,
  type ModifyPropertyOptions,
  type AddChildOptions,
  type FilesAccess,
  type ExtractToComponentResult,
} from './code-modifier'

// PropertyPanel re-exported from new location (studio/panels/)
export {
  PropertyPanel,
  createPropertyPanel,
  type OnCodeChangeCallback,
  type PropertyPanelOptions,
} from '../../studio/panels/property-panel'

export { PROPERTY_ICON_PATHS } from './icons'

export {
  DropZoneCalculator,
  createDropZoneCalculator,
  type DropZone,
  type DropPlacement,
  type DropZoneCalculatorOptions,
} from './drop-zone-calculator'

export {
  DragDropManager,
  createDragDropManager,
  makeDraggable,
  makeCanvasElementDraggable,
  type DragData,
  type DropResult,
  type DropCallback,
  type DragDropManagerOptions,
} from './drag-drop-manager'

export {
  findIconForComponent,
  findIconsForComponents,
  extractKeywords,
  getIconPath,
  generateIconSVG,
  ICON_PATHS,
} from './component-icon-matcher'

export {
  extractStudioContext,
  buildReactSystemPrompt,
  generateFromPrompt,
  prepareCodeForInsertion,
  callLLM,
  extractReactFromResponse,
  type StudioContext,
  type GenerationResult,
  type LLMConfig,
} from './llm-integration'

export {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
  isBooleanProperty,
  isMultiValueProperty,
  type ParsedProperty,
  type ParsedLine,
} from './line-property-parser'
