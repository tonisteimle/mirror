/**
 * App Adapter
 *
 * Bridges the new DropService with the existing app.js code.
 * This allows incremental migration without breaking existing functionality.
 */

import { getDropService, DropResultApplier } from './index'
import type { DropResult, DropContext, ApplierDependencies } from './index'

/**
 * Create a drop context from app.js globals
 */
export function createDropContext(globals: AppGlobals): DropContext {
  return {
    codeModifier: globals.studioCodeModifier as DropContext['codeModifier'],
    robustModifier: globals.studioRobustModifier as DropContext['robustModifier'],
    previewContainer: document.getElementById('preview')!,
    currentFile: globals.currentFile,
    zoomScale: globals.getZoomScale(),
    isComponentsFile: globals.isComponentsFile,
    findExistingZagDefinition: globals.findExistingZagDefinition,
    generateZagComponentName: globals.generateZagComponentName,
    generateZagDefinitionCode: globals.generateZagDefinitionCode,
    generateZagInstanceCode: globals.generateZagInstanceCode,
    addZagDefinitionToCode: globals.addZagDefinitionToCode,
    findOrCreateComponentsFile: globals.findOrCreateComponentsFile,
    addZagDefinitionToComponentsFile: globals.addZagDefinitionToComponentsFile,
    isZagComponent: globals.isZagComponent,
    emitNotification: (type, message) => {
      ;(globals.studio.events as { emit: (e: string, d: unknown) => void }).emit(
        `notification:${type}`,
        { message, duration: 2000 }
      )
    },
  }
}

/**
 * Create applier dependencies from app.js globals
 */
export function createApplierDeps(globals: AppGlobals): ApplierDependencies {
  return {
    editor: globals.editor as ApplierDependencies['editor'],
    preludeOffset: globals.currentPreludeOffset,
    preludeLineOffset: globals.currentPreludeLineOffset ?? 0,
    resolvedSource: globals.resolvedSource ?? '',
    isWrappedWithApp: globals.isWrappedWithApp ?? false,
    executor: globals.executor as ApplierDependencies['executor'],
    events: globals.events as ApplierDependencies['events'],
    compile: globals.compile,
    save: globals.debouncedSave,
    setPendingSelection: globals.studioActions.setPendingSelection,
  }
}

/**
 * Handle studio drop using new architecture
 */
export async function handleStudioDropNew(result: DropResult, globals: AppGlobals): Promise<void> {
  hideDropVisuals(globals)

  if (!globals.studioCodeModifier) {
    console.warn('[DropAdapter] CodeModifier not available')
    return
  }

  const context = createDropContext(globals)
  const dropService = getDropService()
  const modResult = await dropService.handleDrop(result, context)

  if (!modResult?.success) {
    console.warn('[DropAdapter] Drop failed:', modResult?.error)
    return
  }

  const applierDeps = createApplierDeps(globals)
  const applier = new DropResultApplier(applierDeps)
  const componentName = getComponentName(result)

  applier.apply(modResult, componentName)
}

function hideDropVisuals(globals: AppGlobals): void {
  globals.studio.preview?.hideDropZone()
  const preview = document.getElementById('preview')
  preview?.querySelectorAll('.studio-drop-target').forEach(el => {
    el.classList.remove('studio-drop-target')
  })
}

function getComponentName(result: DropResult): string {
  if (result.source.type === 'element') {
    return result.isDuplicate ? 'Duplicate' : 'Element'
  }
  return result.source.componentName || 'Component'
}

// Type for app.js globals that we depend on
export interface AppGlobals {
  studioCodeModifier: unknown
  studioRobustModifier: unknown
  currentFile: string
  editor: unknown
  currentPreludeOffset: number
  currentPreludeLineOffset?: number
  resolvedSource?: string
  isWrappedWithApp?: boolean
  executor: unknown
  events: unknown
  studio: { preview?: { hideDropZone: () => void }; events: unknown }
  studioActions: { setPendingSelection: (sel: unknown) => void }
  compile: (code: string) => void
  debouncedSave: (code: string) => void
  getZoomScale: () => number
  isComponentsFile: (file: string) => boolean
  findExistingZagDefinition: (name: string) => { exists: boolean; definitionName?: string }
  generateZagComponentName: (name: string) => string
  generateZagDefinitionCode: (name: string, component: string, children: unknown[]) => string
  generateZagInstanceCode: (name: string, props: string, children: unknown[]) => string
  addZagDefinitionToCode: (code: string) => void
  findOrCreateComponentsFile: () => Promise<string | null>
  addZagDefinitionToComponentsFile: (code: string, file: string) => Promise<boolean>
  isZagComponent: (children: unknown[]) => boolean
}
