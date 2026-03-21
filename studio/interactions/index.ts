/**
 * Interactions Module
 *
 * Provides a unified API for handling user interactions in the preview:
 * - Drag and drop operations
 * - Selection management
 * - Multi-selection
 *
 * Usage:
 * ```typescript
 * import { createInteractionCoordinator } from './interactions'
 *
 * const coordinator = createInteractionCoordinator(previewContainer)
 * coordinator.startDrag(element, event)
 * coordinator.select(nodeId, 'preview')
 * ```
 */

export {
  InteractionCoordinator,
  createInteractionCoordinator,
  type InteractionCoordinatorConfig,
  type InteractionCallbacks,
} from './coordinator'
