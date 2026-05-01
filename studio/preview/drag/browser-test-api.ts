/**
 * Browser Test API for Drag & Drop — public entry point
 *
 * Simulates real user drag & drop interactions in the browser.
 * Runs inside the Studio and triggers actual DOM updates.
 *
 * Usage in browser console:
 *   __dragTest.fromPalette('Button').toContainer('node-1').atIndex(0).execute()
 *   __dragTest.moveElement('node-3').toContainer('node-1').atIndex(0).execute()
 *   __dragTest.runAllTests()
 *
 * Implementation is split into sibling modules:
 *   - test-api-types.ts    — public type surface
 *   - test-api-helpers.ts  — palette lookup
 *   - test-runner.ts       — BrowserTestRunner + drag builders
 *   - test-runner-built-in.ts — built-in test cases + runAllTests
 *   - studio-control.ts    — MirrorStudioControl
 *   - mirror-test-runner.ts — runMirrorTest
 */

import { BrowserTestRunner } from './test-runner'
import { runAllTests } from './test-runner-built-in'
import { MirrorStudioControl } from './studio-control'
import { runMirrorTest } from './mirror-test-runner'
import type { AnimationConfig, MirrorTestCase } from './test-api-types'
import type { Point } from './types'

// Re-exports for downstream consumers
export { BrowserTestRunner } from './test-runner'
export { MirrorStudioControl } from './studio-control'
export { runAllTests } from './test-runner-built-in'
export { runMirrorTest } from './mirror-test-runner'
export type {
  BrowserTestResult,
  AnimationConfig,
  TestCase,
  MirrorTestCase,
  MirrorTestAPI,
  ExtractedPropertyInfo,
  PropertyCategoryInfo,
  ExtractedElementInfo,
  PropertyModificationResult,
  TokenInfo,
} from './test-api-types'

// =============================================================================
// Global Setup
// =============================================================================

let globalRunner: BrowserTestRunner | null = null

export function setupBrowserDragTestAPI(): void {
  if ((window as any).__dragTest) return

  globalRunner = new BrowserTestRunner()
  const studioControl = new MirrorStudioControl()
  studioControl.setRunner(globalRunner)

  const api = {
    // Drag operations
    fromPalette: (name: string) => globalRunner!.fromPalette(name),
    moveElement: (nodeId: string) => globalRunner!.moveElement(nodeId),
    runAllTests: () => runAllTests(globalRunner!),
    setAnimation: (config: Partial<AnimationConfig>) => globalRunner!.setAnimation(config),

    // Editor control
    getCode: () => studioControl.getCode(),
    setCode: (code: string) => studioControl.setCode(code),
    setTestCode: (code: string) => studioControl.setTestCode(code),
    reset: (code?: string) => studioControl.reset(code),
    resetPreludeOffset: () => studioControl.resetPreludeOffset(),

    // Compilation
    waitForCompile: (timeout?: number) => studioControl.waitForCompile(timeout),

    // Panel control
    showPanel: (panel: string) => studioControl.setPanelVisibility(panel, true),
    hidePanel: (panel: string) => studioControl.setPanelVisibility(panel, false),
    togglePanel: (panel: string) => studioControl.togglePanel(panel),
    focusMode: () => studioControl.focusMode(),
    normalMode: () => studioControl.normalMode(),
    testMode: () => studioControl.testMode(),

    // Selection
    selectNode: (nodeId: string) => studioControl.selectNode(nodeId),
    getSelection: () => studioControl.getSelection(),
    clearSelection: () => studioControl.clearSelection(),

    // Inspection
    getNodeIds: () => studioControl.getNodeIds(),
    getSourceMap: () => studioControl.getSourceMap(),
    snapshot: () => studioControl.snapshot(),

    // Direct code manipulation (bypasses drop system for reliable testing)
    insertCodeAt: (code: string, line: number, indent?: number) =>
      studioControl.insertCodeAt(code, line, indent),
    simulateDropByInsertion: (params: {
      componentCode: string
      afterLine: number
      indent: number
    }) => studioControl.simulateDropByInsertion(params),
    recompile: () => studioControl.recompile(),

    // Advanced test running
    runTest: (testCase: MirrorTestCase) =>
      runMirrorTest(testCase, { drag: globalRunner!, studio: studioControl }),

    // Real drag testing with verification
    executeRealDrag: (params: {
      componentName: string
      targetNodeId: string
      insertionIndex: number
      expectedPattern: string
    }) => studioControl.executeRealDrag(params),
    executeRealCanvasMove: (params: {
      sourceNodeId: string
      targetNodeId: string
      insertionIndex: number
      expectedPattern: string
    }) => studioControl.executeRealCanvasMove(params),
    executeRealStackedDrag: (params: {
      componentName: string
      targetNodeId: string
      position: Point
      expectedXRange: [number, number]
      expectedYRange: [number, number]
    }) => studioControl.executeRealStackedDrag(params),
    verifyCodeChange: (params: {
      codeBefore: string
      codeAfter: string
      expectedPattern: string | RegExp
    }) => studioControl.verifyCodeChange(params),
    verifyPositionInCode: (params: {
      codeAfter: string
      expectedX: number
      expectedY: number
      tolerance?: number
    }) => studioControl.verifyPositionInCode(params),
    getPreludeOffset: () => studioControl.getPreludeOffset(),

    // Legacy: Comprehensive drag tests are now in studio/test-api/suites/drag/comprehensive-drag-tests.ts
    // Use __mirrorTestSuites.runCategory('comprehensiveDrag') instead

    // ==========================================================================
    // Property Panel Control
    // ==========================================================================

    // Element inspection
    getElement: (nodeId: string) => studioControl.getElement(nodeId),
    getPropertyValue: (nodeId: string, propName: string) =>
      studioControl.getPropertyValue(nodeId, propName),
    hasProperty: (nodeId: string, propName: string) => studioControl.hasProperty(nodeId, propName),
    getPropertiesMap: (nodeId: string) => studioControl.getPropertiesMap(nodeId),
    getPrimitiveType: (nodeId: string) => studioControl.getPrimitiveType(nodeId),
    isComponentInstance: (nodeId: string) => studioControl.isComponentInstance(nodeId),
    isComponentDefinition: (nodeId: string) => studioControl.isComponentDefinition(nodeId),

    // Property modification
    setProperty: (nodeId: string, propName: string, value: string) =>
      studioControl.setProperty(nodeId, propName, value),
    removeProperty: (nodeId: string, propName: string) =>
      studioControl.removeProperty(nodeId, propName),
    toggleProperty: (nodeId: string, propName: string, enabled: boolean) =>
      studioControl.toggleProperty(nodeId, propName, enabled),
    batchUpdateProperties: (
      nodeId: string,
      changes: Array<{ name: string; value: string; action: 'set' | 'remove' | 'toggle' }>
    ) => studioControl.batchUpdateProperties(nodeId, changes),

    // Tokens
    getColorTokens: () => studioControl.getColorTokens(),
    getSpacingTokens: () => studioControl.getSpacingTokens(),

    // Panel control
    refreshPropertyPanel: () => studioControl.refreshPropertyPanel(),
    getCurrentPanelElement: () => studioControl.getCurrentPanelElement(),
    selectAndInspect: (nodeId: string) => studioControl.selectAndInspect(nodeId),

    // Internal references
    runner: globalRunner,
    studio: studioControl,
  }

  ;(window as any).__dragTest = api

  console.log('🪞 Mirror Studio Test API ready. Usage:')
  console.log('')
  console.log('  // 🧪 Run All Drag Tests')
  console.log('  __dragTest.runDragTests()  // Comprehensive test suite (flex + stacked)')
  console.log('')
  console.log('  // Single Drag Test with Verification')
  console.log('  __dragTest.executeRealDrag({')
  console.log('    componentName: "Button",')
  console.log('    targetNodeId: "node-1",')
  console.log('    insertionIndex: 0,')
  console.log('    expectedPattern: "Button"')
  console.log('  })')
  console.log('')
  console.log('  // 🎨 Property Panel Control')
  console.log('  __dragTest.getElement("node-1")           // Get all element properties')
  console.log('  __dragTest.getPropertyValue("node-1", "bg")  // Get specific property')
  console.log('  __dragTest.getPropertiesMap("node-1")     // Get all props as {key: value}')
  console.log('  __dragTest.setProperty("node-1", "bg", "#ff0000")  // Set property')
  console.log('  __dragTest.removeProperty("node-1", "pad")  // Remove property')
  console.log('  __dragTest.toggleProperty("node-1", "hor", true)  // Toggle boolean')
  console.log('  __dragTest.batchUpdateProperties("node-1", [')
  console.log('    { name: "bg", value: "#333", action: "set" },')
  console.log('    { name: "pad", value: "16", action: "set" }')
  console.log('  ])')
  console.log('  __dragTest.selectAndInspect("node-1")     // Select + get properties')
  console.log('  __dragTest.getColorTokens()   // Get all color tokens')
  console.log('  __dragTest.getSpacingTokens() // Get all spacing tokens')
  console.log('')
  console.log('  // Stacked/Absolute Position Drag')
  console.log(
    '  __dragTest.fromPalette("Button").toContainer("node-1").atPosition(100, 50).execute()'
  )
  console.log('  __dragTest.executeRealStackedDrag({')
  console.log('    componentName: "Button",')
  console.log('    targetNodeId: "node-1",')
  console.log('    position: { x: 100, y: 50 },')
  console.log('    expectedXRange: [90, 110],')
  console.log('    expectedYRange: [40, 60]')
  console.log('  })')
  console.log('')
  console.log('  // Drag & Drop (Manual)')
  console.log('  __dragTest.fromPalette("Button").toContainer("node-1").atIndex(0).execute()')
  console.log('  __dragTest.moveElement("node-2").toContainer("node-1").atIndex(0).execute()')
  console.log('')
  console.log('  // Editor Control')
  console.log('  __dragTest.setCode("Frame gap 12\\n  Button \\"Test\\"")')
  console.log('  __dragTest.getCode()')
  console.log('  __dragTest.waitForCompile()')
  console.log('')
  console.log('  // Panel Control')
  console.log('  __dragTest.testMode()     // Editor + Preview only')
  console.log('  __dragTest.focusMode()    // Preview only')
  console.log('  __dragTest.normalMode()   // All panels')
  console.log('')
  console.log('  // Debugging')
  console.log('  __dragTest.getPreludeOffset()  // Check prelude offset')
  console.log('  __dragTest.getNodeIds()        // Get all node IDs')
  console.log('  __dragTest.snapshot()          // Full state snapshot')
}
