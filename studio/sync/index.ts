/**
 * Sync Module
 */

export { SyncCoordinator, createSyncCoordinator, type SyncTargets, type SyncCoordinatorOptions } from './sync-coordinator'

export { LineOffsetService, createLineOffsetService } from './line-offset-service'

export {
  extractComponentFromLine,
  findParentDefinition,
  getNodeIdForLine,
  getDefinitionName,
  isInsideDefinition,
  type ComponentInfo,
  type ParentContext,
} from './component-line-parser'
