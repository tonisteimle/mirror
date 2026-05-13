/**
 * Augment-for-preview pipeline step in compile().
 *
 * Wraps the auto-instance augmentation around a single decision: if the
 * user defined components but didn't instance them all, append implicit
 * `Name` lines and re-run parse → DOM-emit → IR so the preview shows
 * those components live. If everything is already instanced, this is a
 * no-op pass-through.
 *
 * Inputs:
 *  - `fullAst`        — AST of the resolved source (prelude + user code)
 *  - `localAst`       — AST of just the user-written code (used to find
 *                       which definitions the user authored)
 *  - `resolvedCode` / `jsCode` / `irResult` — what compile() already
 *                       computed; returned unchanged in the no-augment case
 *  - `parse` / `generateDOM` / `toIR` — compiler-API callbacks (injected
 *                       so the helper stays free of MirrorLang singletons)
 *
 * Output:
 *  - `codeToCompile` — what got fed back into parse (== `resolvedCode`
 *                      in the no-augment case)
 *  - `finalJsCode`   — DOM-emit string the preview ultimately executes
 *  - `ir` / `sourceMap` — possibly-augmented IR + source map. The
 *                      sourceMap is also surfaced separately because
 *                      compile() consumers (SourceMapPort wiring) keep a
 *                      direct reference.
 */

import { findUninstancedComponents, appendImplicitInstances } from './augment-local-components'
import type { Program } from '../../compiler/parser/ast'
import type { IR } from '../../compiler/ir'
import type { SourceMap } from '../../compiler/ir/source-map'

/**
 * Minimal shape this helper consumes/produces. Matches the loose
 * `MirrorLangGlobal.toIR` return in app.ts (warnings field is optional
 * — IR-side compiler/ir/index.ts:IRResult declares it required, but the
 * browser-bundle signature does not).
 */
export interface IrPipelineResult {
  ir: IR
  sourceMap: SourceMap
}

export interface AugmentPipelineInputs {
  fullAst: Program
  localAst: Program
  resolvedCode: string
  jsCode: string
  irResult: IrPipelineResult
  parse: (code: string) => Program
  generateDOM: (ast: Program) => string
  /** Always called with `withSourceMap: true` — caller wires that in. */
  toIR: (ast: Program) => IrPipelineResult
}

export interface AugmentPipelineResult {
  codeToCompile: string
  finalJsCode: string
  ir: IR
  sourceMap: SourceMap
}

export function augmentForPreview(inputs: AugmentPipelineInputs): AugmentPipelineResult {
  const { fullAst, localAst, resolvedCode, jsCode, irResult, parse, generateDOM, toIR } = inputs

  const uninstanced = findUninstancedComponents(fullAst, localAst)
  if (uninstanced.length === 0) {
    return {
      codeToCompile: resolvedCode,
      finalJsCode: jsCode,
      ir: irResult.ir,
      sourceMap: irResult.sourceMap,
    }
  }

  // Append implicit instances and re-run the compiler pipeline so slot
  // node IDs match between the preview render and the source map.
  const codeToCompile = appendImplicitInstances(resolvedCode, uninstanced)
  const augmentedAst = parse(codeToCompile)
  const finalJsCode = generateDOM(augmentedAst)
  const augmentedIr = toIR(augmentedAst)

  return {
    codeToCompile,
    finalJsCode,
    ir: augmentedIr.ir,
    sourceMap: augmentedIr.sourceMap,
  }
}
