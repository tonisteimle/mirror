/**
 * Mirror Studio Module
 *
 * Provides bidirectional editing support for Mirror Studio:
 * - SourceMap: Maps IR nodes to source positions
 * - SelectionManager: Manages element selection state
 * - PropertyExtractor: Extracts properties from AST
 * - CodeModifier: Modifies source code
 * - PropertyPanel: Dynamic property panel UI
 *
 * Note: Drag & Drop has been moved to studio/drag-drop module (v2.2)
 */

export {
  SourceMap,
  SourceMapBuilder,
  calculateSourcePosition,
  calculatePropertyPosition,
  type NodeMapping,
} from '../ir/source-map'

/**
 * @deprecated Since v2.0. Use StateSelectionAdapter from studio/core instead.
 * Will be removed in v3.0.
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

/**
 * @deprecated Since v2.0. Use CodeModifierV2 from './code-modifier-v2' instead.
 * Will be removed in v3.0.
 */
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

// CodeModifierV2 - Hexagonal Architecture (recommended)
export {
  CodeModifierV2,
  createCodeModifierV2,
  // Ports
  type SourceMapPort,
  type LineParserPort,
  type TemplatePort,
  type DocumentPort,
  type CodeModifierPorts,
  // Adapters
  createCodeModifierPorts,
  type CreateCodeModifierPortsConfig,
} from './code-modifier-index'

// PropertyPanel moved to studio/panels/ - import directly from there
// This re-export was removed to break circular dependency (compiler/ should not import from studio/)
// If you need PropertyPanel, import from 'studio/panels' instead

export { PROPERTY_ICON_PATHS } from './icons'

// DropZoneCalculator removed in v2.2 - use studio/drag-drop instead

export {
  createSmartSizingService,
  type SmartSizingService,
  type SizingResult,
  type ResidualSpace,
} from './services/smart-sizing'

export {
  findIconForComponent,
  findIconsForComponents,
  extractKeywords,
  getIconPath,
  generateIconSVG,
  ICON_PATHS,
} from './component-icon-matcher'

// LLM integration temporarily disabled - needs __tests__/llm module
// export {
//   extractStudioContext,
//   buildReactSystemPrompt,
//   generateFromPrompt,
//   prepareCodeForInsertion,
//   callLLM,
//   extractReactFromResponse,
//   type StudioContext,
//   type GenerationResult,
//   type LLMConfig,
// } from './llm-integration'

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

// Drop indicator rendering - removed in v2.2, use studio/drag-drop/visual instead
// Drop Strategies - removed in v2.2, use studio/drag-drop/strategies instead

// Coordinate transformation (centralized coordinate handling)
export {
  CoordinateTransformer,
  createCoordinateTransformer,
  setGridSettingsProvider,
  type Point,
  type Size,
  type Bounds,
  type TransformResult,
  type TransformOptions,
  type GridSettingsProvider,
} from './coordinate-transformer'

// Z-Index management for absolute containers
export {
  ZIndexManager,
  createZIndexManager,
  type ZIndexResult,
  type ElementZInfo,
} from './z-index-manager'

// Robust modification layer (atomic updates, validation, rollback)
export {
  RobustModifier,
  createRobustModifier,
  DebouncedModifier,
  createDebouncedModifier,
  type PropertyUpdate,
  type RobustResult,
  type RobustOptions,
} from './robust-modifier'
