/**
 * Code Generator
 *
 * Handles parsing, IR generation, and DOM code generation.
 */

import type { AST, IRResult, MirrorLangAPI, CompileResult } from './types'

export interface GeneratorDeps {
  MirrorLang: MirrorLangAPI
}

export class CodeGenerator {
  constructor(private deps: GeneratorDeps) {}

  parse(code: string): AST {
    const ast = this.deps.MirrorLang.parse(code)
    this.validateAst(ast)
    return ast
  }

  private validateAst(ast: AST): void {
    if (ast.errors && ast.errors.length > 0) {
      const message = this.formatErrors(ast.errors)
      throw new Error(message)
    }
  }

  private formatErrors(errors: AST['errors']): string {
    return errors!.map(e => `Line ${e.line}: ${e.message}`).join('\n')
  }

  generateIR(ast: AST): IRResult {
    return this.deps.MirrorLang.toIR(ast, true)
  }

  generateDOM(ast: AST): string {
    return this.deps.MirrorLang.generateDOM(ast)
  }

  compile(resolvedCode: string, preludeOffset: number): CompileResult {
    const ast = this.parse(resolvedCode)
    const irResult = this.generateIR(ast)
    const jsCode = this.generateDOM(ast)

    return {
      ast,
      ir: irResult.ir,
      sourceMap: irResult.sourceMap,
      jsCode,
      resolvedCode,
      preludeOffset,
    }
  }
}
