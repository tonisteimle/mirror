/**
 * Layout Inference Module
 *
 * Detects aligned absolutely positioned elements and offers
 * visual indicators to convert them to layout containers.
 */

export {
  LayoutInferenceManager,
  createLayoutInferenceManager,
} from './manager'

export {
  AlignmentDetector,
  createAlignmentDetector,
} from './alignment-detector'

export {
  InferenceIndicator,
  createInferenceIndicator,
} from './inference-indicator'

export {
  LayoutConverter,
  createLayoutConverter,
  type ConversionResult,
} from './layout-converter'

export type {
  AlignmentType,
  ElementBounds,
  AlignmentGroup,
  AlignmentDetectionResult,
  AlignmentDetectorConfig,
  InferenceIndicatorConfig,
  LayoutConverterConfig,
  LayoutInferenceManagerConfig,
} from './types'
