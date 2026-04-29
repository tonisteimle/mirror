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

// PropertyPanel moved to studio/panels/ - import directly from there
// This re-export was removed to break circular dependency (compiler/ should not import from studio/)
// If you need PropertyPanel, import from 'studio/panels' instead

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

// Layout detection utilities
export {
  detectLayout,
  isHorizontalLayout,
  getLayoutDirection,
  isAbsoluteLayoutContainer,
  clientToContainer,
  type LayoutType,
  type LayoutInfo,
} from './utils/layout-detection'
