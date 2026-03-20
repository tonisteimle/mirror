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
 * - StudioDragDropService: Coordinates drag-and-drop operations (testable)
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
  type SemanticZone,
} from './drop-zone-calculator'

// New testable drag-drop system (replaces legacy DragDropManager)
export {
  StudioDragDropService,
  createStudioDragDropService,
  makePaletteDraggable,
  makeCanvasElementDraggable,
  makeCanvasElementDraggable as makeCanvasElementDraggableV2,
  type StudioDragDropConfig,
  type StudioDragDropCallbacks,
  type StudioDropResult,
  type DragOverState,
} from '../../studio/visual/services/studio-drag-drop-service'

export {
  createSmartSizingService,
  type SmartSizingService,
  type SizingResult,
  type ResidualSpace,
} from './services/smart-sizing'

// Drop preview utilities
export {
  calculateNewComponentSize,
  getDefaultSize,
  type DragContext,
  type Size as PreviewSize,
} from './drop-preview'

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

// Spatial indexing for performance
export {
  SpatialCache,
  createSpatialCache,
  type SpatialItem,
} from './spatial-cache'

// Drop indicator rendering
export {
  DropIndicatorRenderer,
  createDropIndicatorRenderer,
  type LineIndicatorConfig,
  type CrosshairIndicatorConfig,
  type HighlightConfig,
  type ZoneIndicatorConfig,
  type RendererIndicatorConfig,
} from './drop-indicator-renderer'

// Drop Strategies (layout-specific drop behavior)
export {
  // Types
  type LayoutType,
  type DropContext,
  type LayoutDropResult,
  type FlexDropResult,
  type AbsoluteDropResult,
  type IndicatorConfig,
  type LayoutDropStrategy,
  type DropStrategyRegistry,
  // Strategies
  FlexDropStrategy,
  createFlexDropStrategy,
  AbsoluteDropStrategy,
  createAbsoluteDropStrategy,
  type AbsoluteStrategyOptions,
  // Registry
  createDefaultRegistry,
  createRegistry,
  getDefaultRegistry,
} from './drop-strategies'

// Coordinate transformation (centralized coordinate handling)
export {
  CoordinateTransformer,
  createCoordinateTransformer,
  type Point,
  type Size,
  type Bounds,
  type TransformResult,
  type TransformOptions,
} from './coordinate-transformer'

// Z-Index management for absolute containers
export {
  ZIndexManager,
  createZIndexManager,
  type ZIndexResult,
  type ElementZInfo,
} from './z-index-manager'
