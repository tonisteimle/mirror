/**
 * Behavior Handlers Registry
 *
 * Map of all behavior handlers for quick lookup.
 * Separated from provider to avoid react-refresh issues.
 */

import type { BehaviorHandler } from './index'

// Import available behavior handlers
import { FormFieldBehavior } from './input'
import { DropdownBehavior } from './dropdown'
// Doc-mode behaviors
import { DocTextBehavior } from './doc-text'
import { PlaygroundBehavior } from './playground'
import { DocWrapperBehavior } from './doc-wrapper'

// All behavior handlers
const BEHAVIOR_HANDLERS: BehaviorHandler[] = [
  // Form
  FormFieldBehavior,
  // UI Components
  DropdownBehavior,
  // Doc-mode
  DocTextBehavior,
  PlaygroundBehavior,
  DocWrapperBehavior
]

// Map for quick lookup (lazy initialized to avoid circular dependency issues)
let handlerMap: Map<string, BehaviorHandler> | null = null

function getHandlerMap(): Map<string, BehaviorHandler> {
  if (!handlerMap) {
    handlerMap = new Map<string, BehaviorHandler>()
    for (const handler of BEHAVIOR_HANDLERS) {
      if (handler) {
        handlerMap.set(handler.name, handler)
      }
    }
  }
  return handlerMap
}

// Get handler by component name
export function getBehaviorHandler(name: string): BehaviorHandler | undefined {
  return getHandlerMap().get(name)
}
