/**
 * LLM Test Runner
 *
 * Orchestrates the full workflow:
 * User Prompt → LLM (React) → Mirror → Edit → React
 */

import type {
  TestScenario,
  TestResult,
  ConversionResult,
  EditResult,
} from './types'
import { LLMClient, createMockClient } from './llm-client'
import { ReactToMirrorConverter, reactToMirror } from './react-to-mirror'
import { parse, generateDOM, toIR, SourceMapBuilder } from '../../index'
import { PropertyExtractor } from '../../studio/property-extractor'
import { CodeModifier } from '../../studio/code-modifier'

export interface TestRunnerConfig {
  llmClient: LLMClient
  verbose?: boolean
  stopOnError?: boolean
}

export class LLMTestRunner {
  private llmClient: LLMClient
  private converter: ReactToMirrorConverter
  private verbose: boolean
  private stopOnError: boolean

  constructor(config: TestRunnerConfig) {
    this.llmClient = config.llmClient
    this.converter = new ReactToMirrorConverter()
    this.verbose = config.verbose ?? false
    this.stopOnError = config.stopOnError ?? false
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now()
    const errors: string[] = []

    this.log(`\n${'='.repeat(60)}`)
    this.log(`Running: ${scenario.name}`)
    this.log(`Complexity: ${scenario.complexity} | Context: ${scenario.context}`)
    this.log(`${'='.repeat(60)}`)

    // Step 1: Generate React code from LLM
    this.log('\n[1] Generating React code...')
    const llmResponse = await this.llmClient.generate(scenario)
    this.log(`Generated ${llmResponse.react.split('\n').length} lines of React`)

    // Step 2: Convert React to Mirror
    this.log('\n[2] Converting React to Mirror...')
    const mirrorResult = this.converter.convert(llmResponse.react)

    if (mirrorResult.errors && mirrorResult.errors.length > 0) {
      errors.push(...mirrorResult.errors.map(e => `Conversion: ${e}`))
    }

    this.log(`Mirror code:\n${mirrorResult.mirror}`)

    // Step 3: Validate Mirror code can be parsed
    this.log('\n[3] Validating Mirror code...')
    const validationErrors = this.validateMirror(mirrorResult.mirror, scenario)
    errors.push(...validationErrors)

    // Step 4: Apply edit if specified
    let editResult: EditResult | undefined
    if (scenario.editAction && mirrorResult.mirror) {
      this.log('\n[4] Applying edit...')
      editResult = this.applyEdit(mirrorResult.mirror, scenario)

      if (editResult) {
        this.log(`Edited ${scenario.editAction.property} to ${scenario.editAction.newValue}`)
        this.log(`New Mirror:\n${editResult.mirror}`)
      } else {
        errors.push(`Edit failed: Could not apply edit`)
      }
    }

    const duration = Date.now() - startTime

    const result: TestResult = {
      scenario,
      llmResponse,
      mirrorCode: mirrorResult,
      editResult,
      validation: {
        passed: errors.length === 0,
        errors,
      },
      duration,
    }

    // Summary
    this.log(`\n[Result] ${result.validation.passed ? '✅ PASSED' : '❌ FAILED'}`)
    if (errors.length > 0) {
      this.log(`Errors:\n${errors.map(e => `  - ${e}`).join('\n')}`)
    }
    this.log(`Duration: ${duration}ms`)

    return result
  }

  /**
   * Run multiple scenarios
   */
  async runScenarios(scenarios: TestScenario[]): Promise<TestResult[]> {
    const results: TestResult[] = []

    for (const scenario of scenarios) {
      try {
        const result = await this.runScenario(scenario)
        results.push(result)

        if (!result.validation.passed && this.stopOnError) {
          this.log('\n⚠️ Stopping due to error')
          break
        }
      } catch (error) {
        results.push({
          scenario,
          llmResponse: { react: '' },
          mirrorCode: { mirror: '' },
          validation: {
            passed: false,
            errors: [`Runtime error: ${(error as Error).message}`],
          },
          duration: 0,
        })

        if (this.stopOnError) {
          break
        }
      }
    }

    // Print summary
    this.printSummary(results)

    return results
  }

  /**
   * Validate Mirror code
   */
  private validateMirror(mirrorCode: string, scenario: TestScenario): string[] {
    const errors: string[] = []

    if (!mirrorCode || mirrorCode.trim() === '') {
      errors.push('Empty Mirror code generated')
      return errors
    }

    // Try to parse
    try {
      const ast = parse(mirrorCode)

      if (ast.errors.length > 0) {
        errors.push(...ast.errors.map(e => `Parse: ${e.message}`))
      }

      // Validate expected components
      if (scenario.validation?.hasComponents) {
        for (const comp of scenario.validation.hasComponents) {
          if (!mirrorCode.includes(comp)) {
            errors.push(`Missing expected component: ${comp}`)
          }
        }
      }

      // Validate minimum elements
      if (scenario.validation?.minElements) {
        const nodeCount = (mirrorCode.match(/^\w+/gm) || []).length
        if (nodeCount < scenario.validation.minElements) {
          errors.push(`Expected at least ${scenario.validation.minElements} elements, got ${nodeCount}`)
        }
      }

      // Validate tokens
      if (scenario.validation?.hasTokens) {
        if (!mirrorCode.includes('$')) {
          errors.push('Expected token references ($) but none found')
        }
      }
    } catch (error) {
      errors.push(`Parse error: ${(error as Error).message}`)
    }

    return errors
  }

  /**
   * Apply an edit to Mirror code
   */
  private applyEdit(mirrorCode: string, scenario: TestScenario): EditResult | null {
    if (!scenario.editAction) return null

    try {
      // Parse and generate source map
      const ast = parse(mirrorCode)
      if (ast.errors.length > 0) return null

      const ir = toIR(ast)
      const sourceMapBuilder = new SourceMapBuilder()

      // Build source map from AST
      // (simplified - in real implementation this would be more complete)
      const sourceMap = sourceMapBuilder.build()

      // For now, do a simple string replacement as a fallback
      const { selector, property, newValue } = scenario.editAction

      // Find the component and property
      const lines = mirrorCode.split('\n')
      let modified = false
      const newLines = lines.map(line => {
        // Check if this line defines or uses the component
        if (line.includes(selector) && !modified) {
          // Try to find and replace the property
          const propPattern = new RegExp(`(${property})\\s+[^,\\n]+`)
          if (propPattern.test(line)) {
            modified = true
            return line.replace(propPattern, `$1 ${newValue}`)
          }
        }
        return line
      })

      if (!modified) {
        // Property not found - try to add it
        for (let i = 0; i < newLines.length; i++) {
          if (newLines[i].includes(selector)) {
            // Add property to this line
            const trimmed = newLines[i].trimEnd()
            if (trimmed.endsWith(':')) {
              // Definition line
              newLines[i] = trimmed
              newLines.splice(i + 1, 0, `  ${property} ${newValue}`)
            } else {
              // Instance line - add property inline
              newLines[i] = `${trimmed}, ${property} ${newValue}`
            }
            modified = true
            break
          }
        }
      }

      const newMirror = newLines.join('\n')

      return {
        mirror: newMirror,
        react: '', // Would need Mirror-to-React converter
        change: {
          from: 0,
          to: mirrorCode.length,
          insert: newMirror,
        },
      }
    } catch (error) {
      this.log(`Edit error: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * Print test summary
   */
  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.validation.passed).length
    const failed = results.length - passed
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

    console.log('\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
    console.log(`Total time: ${totalTime}ms`)

    if (failed > 0) {
      console.log('\nFailed tests:')
      for (const result of results.filter(r => !r.validation.passed)) {
        console.log(`  ❌ ${result.scenario.name}`)
        for (const error of result.validation.errors) {
          console.log(`     - ${error}`)
        }
      }
    }

    // Group by complexity
    console.log('\nBy complexity:')
    const byComplexity = new Map<string, TestResult[]>()
    for (const result of results) {
      const key = result.scenario.complexity
      if (!byComplexity.has(key)) byComplexity.set(key, [])
      byComplexity.get(key)!.push(result)
    }
    for (const [complexity, group] of byComplexity) {
      const groupPassed = group.filter(r => r.validation.passed).length
      console.log(`  ${complexity}: ${groupPassed}/${group.length} passed`)
    }
  }

  /**
   * Log message if verbose
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message)
    }
  }
}

/**
 * Create a test runner with mock LLM
 */
export function createMockRunner(verbose = false): LLMTestRunner {
  return new LLMTestRunner({
    llmClient: createMockClient(),
    verbose,
  })
}

/**
 * Quick test function
 */
export async function runQuickTest(scenario: TestScenario): Promise<TestResult> {
  const runner = createMockRunner(true)
  return runner.runScenario(scenario)
}
