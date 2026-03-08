/**
 * Mirror Studio Module
 *
 * Provides bidirectional editing support for Mirror Studio:
 * - SourceMap: Maps IR nodes to source positions
 * - SelectionManager: Manages element selection state
 * - PreviewInteraction: Handles preview click/hover
 * - PropertyExtractor: Extracts properties from AST
 * - CodeModifier: Modifies source code
 * - PropertyPanel: Dynamic property panel UI
 * - DropZoneCalculator: Calculates drop zones for drag-and-drop
 * - DragDropManager: Coordinates drag-and-drop operations
 */

export {
  SourceMap,
  SourceMapBuilder,
  calculateSourcePosition,
  calculatePropertyPosition,
  type NodeMapping,
} from './source-map'

export {
  SelectionManager,
  getSelectionManager,
  resetSelectionManager,
  type SelectionListener,
  type BreadcrumbItem,
  type BreadcrumbListener,
} from './selection-manager'

export {
  PreviewInteraction,
  createPreviewInteraction,
  type PreviewInteractionOptions,
} from './preview-interaction'

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

export {
  PropertyPanel,
  createPropertyPanel,
  type OnCodeChangeCallback,
  type PropertyPanelOptions,
} from './property-panel'

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
  EditorSyncManager,
  createEditorSyncManager,
  type SyncOrigin,
  type EditorSyncManagerOptions,
} from './editor-sync-manager'

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
