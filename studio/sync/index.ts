/**
 * Sync Module
 */

export { SyncCoordinator, createSyncCoordinator, getSyncCoordinator, setSyncCoordinator, type SyncTargets, type SyncCoordinatorOptions } from './sync-coordinator'

export {
  extractComponentFromLine,
  findParentDefinition,
  getNodeIdForLine,
  getDefinitionName,
  isInsideDefinition,
  type ComponentInfo,
  type ParentContext,
} from './component-line-parser'
