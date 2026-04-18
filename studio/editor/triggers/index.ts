/**
 * Editor Triggers Module
 *
 * Exports all trigger configurations and utilities.
 */

// Types
export * from './types'

// Icon Trigger
export {
  ICON_TRIGGER_ID,
  createIconTriggerConfig,
  registerIconTrigger,
  unregisterIconTrigger,
  setIconTriggerPrimitives,
  getIconTriggerPrimitives,
} from './icon-trigger'

// Token Trigger
export {
  TOKEN_TRIGGER_ID,
  createTokenTriggerConfig,
  registerTokenTrigger,
  unregisterTokenTrigger,
  extractAllTokens,
  filterTokens,
  getPropertySuffixes,
  getPropertyTypes,
} from './token-trigger'

// Color Trigger
export {
  COLOR_HASH_TRIGGER_ID,
  COLOR_DOUBLECLICK_TRIGGER_ID,
  createColorHashTriggerConfig,
  createColorDoubleClickTriggerConfig,
  registerColorTriggers,
  unregisterColorTriggers,
  navigateColorSwatches,
  getSelectedSwatchIndex,
  setSelectedSwatchIndex,
  isHashTriggerActive,
  getColorContextPattern,
  getHexColorPattern,
} from './color-trigger'

// Animation Trigger
export {
  ANIMATION_TRIGGER_ID,
  createAnimationTriggerConfig,
  registerAnimationTrigger,
  unregisterAnimationTrigger,
  parseAnimationFromLine,
  generateAnimationDSL,
  showAnimationPicker,
  updateAnimationData,
  getAnimationData,
  setAnimationData,
  addAnimationTrack,
  removeAnimationTrack,
  updateAnimationTrack,
  type AnimationData,
  type AnimationTrack,
} from './animation-trigger'

// Component Extract Extension (:: syntax)
export {
  COMPONENT_EXTRACT_TRIGGER_ID,
  createComponentExtractExtension,
  registerComponentExtractTrigger,
  unregisterComponentExtractTrigger,
} from './component-extract-trigger'

// Token Extract Extension (:: syntax for tokens)
export {
  TOKEN_EXTRACT_TRIGGER_ID,
  createTokenExtractExtension,
  unregisterTokenExtractTrigger,
} from './token-extract-trigger'

// ============================================
// Convenience Functions
// ============================================

import { getTriggerManager } from '../trigger-manager'
import { registerIconTrigger, setIconTriggerPrimitives } from './icon-trigger'
import { registerTokenTrigger } from './token-trigger'
import { registerColorTriggers } from './color-trigger'
import { registerAnimationTrigger } from './animation-trigger'
import { createComponentExtractExtension } from './component-extract-trigger'
import { createTokenExtractExtension } from './token-extract-trigger'
import type { ComponentPrimitivesMap } from './types'
import type { Extension } from '@codemirror/state'

/**
 * Configuration for registering all triggers
 */
export interface RegisterAllTriggersConfig {
  /** Function to get current project files (for token extraction) */
  getFiles: () => Record<string, string>
  /** Component primitives map (for icon trigger) */
  componentPrimitives?: ComponentPrimitivesMap
  /** Extended file info for component extraction (optional) */
  getFilesWithType?: () => { name: string; type: string; code: string }[]
  /** Update file content (for component extraction) */
  updateFile?: (filename: string, content: string) => void
  /** Get current file name (for component extraction) */
  getCurrentFile?: () => string
}

/**
 * Register all triggers with the global trigger manager
 */
export function registerAllTriggers(config: RegisterAllTriggersConfig): void {
  // Set component primitives if provided
  if (config.componentPrimitives) {
    setIconTriggerPrimitives(config.componentPrimitives)
  }

  // Register all triggers
  registerIconTrigger()
  registerTokenTrigger(config.getFiles)
  registerColorTriggers()
  registerAnimationTrigger()

  // Note: Component extract is now an extension, not a trigger
  // Use createComponentExtractExtension() and add to editor extensions
}

/**
 * Create the component extract extension if config is provided
 * This should be added to the editor's extensions array
 */
export function createComponentExtractExtensionFromConfig(
  config: RegisterAllTriggersConfig
): Extension | null {
  if (config.getFilesWithType && config.updateFile && config.getCurrentFile) {
    return createComponentExtractExtension({
      getFiles: config.getFilesWithType,
      updateFile: config.updateFile,
      getCurrentFile: config.getCurrentFile,
    })
  }
  return null
}

/**
 * Create the token extract extension if config is provided
 * This should be added to the editor's extensions array
 */
export function createTokenExtractExtensionFromConfig(
  config: RegisterAllTriggersConfig
): Extension | null {
  if (config.getFilesWithType && config.updateFile && config.getCurrentFile) {
    return createTokenExtractExtension({
      getFiles: config.getFilesWithType,
      updateFile: config.updateFile,
      getCurrentFile: config.getCurrentFile,
    })
  }
  return null
}

/**
 * Unregister all triggers
 */
export function unregisterAllTriggers(): void {
  const manager = getTriggerManager()
  manager.dispose()
}

/**
 * Get CodeMirror extensions for all registered triggers
 */
export function createTriggerExtensions(): import('@codemirror/state').Extension[] {
  return getTriggerManager().createExtensions()
}
