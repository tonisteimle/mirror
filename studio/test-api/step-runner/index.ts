/**
 * Step-Runner — declarative scenarios with per-step 3-dimension validation.
 *
 * Public API:
 *   import { scenario, scenariosToTestCases } from '../step-runner'
 *
 * See ./types.ts for Step/Scenario shape, ./runner.ts for execution.
 */

export type { Scenario, Step, StepAction, Expectations } from './types'
export { scenarioToTestCase, scenariosToTestCases } from './runner'
export { codeDiff, canonicalizeCode } from './diff'
export { installConsoleCollector, type ConsoleCollector } from './console-collector'
export { panelSet, codeSet, styleViaPanel } from './fragments'
