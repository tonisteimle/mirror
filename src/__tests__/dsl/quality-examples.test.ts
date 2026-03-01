/**
 * Tests für Quality Examples
 */

import { describe, it, expect } from 'vitest'
import { validateMirrorCode } from '../../dsl/validator/llm-validator'
import {
  correctnessExamples,
  tokenUsageExamples,
  consistencyExamples,
  completenessExamples,
  reusabilityExamples,
  combinedExamples,
  QualityExample,
} from './fixtures/quality-examples'

function testExamples(category: string, examples: QualityExample[]) {
  describe(category, () => {
    for (const example of examples) {
      it(`${example.name}: Score zwischen ${example.expectedScore.min}-${example.expectedScore.max}`, () => {
        const result = validateMirrorCode(example.code)
        const score = result.quality.overall

        expect(
          score,
          `${example.name}: Score ${score} nicht im Bereich ${example.expectedScore.min}-${example.expectedScore.max}\n` +
          `Correctness: ${result.quality.correctness}%, Tokens: ${result.quality.tokenUsage}%, ` +
          `Consistency: ${result.quality.consistency}%, Completeness: ${result.quality.completeness}%\n` +
          `Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`
        ).toBeGreaterThanOrEqual(example.expectedScore.min)

        expect(
          score,
          `${example.name}: Score ${score} über Maximum ${example.expectedScore.max}`
        ).toBeLessThanOrEqual(example.expectedScore.max)
      })
    }
  })
}

describe('Quality Examples', () => {
  testExamples('Korrektheit', correctnessExamples)
  testExamples('Token Usage', tokenUsageExamples)
  testExamples('Konsistenz', consistencyExamples)
  testExamples('Completeness', completenessExamples)
  testExamples('Wiederverwendung', reusabilityExamples)
  testExamples('Kombiniert', combinedExamples)
})
