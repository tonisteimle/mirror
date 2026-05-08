/**
 * Integration Tests — Strong Validation Edition
 *
 * Tests for real-world designer workflows: feature combinations
 * that designers use daily. Validates that core features compose
 * correctly, not just in isolation.
 *
 * VALIDATION PHILOSOPHY:
 * - Every test checks EXACT CSS values, not just existence
 * - DOM structure is validated (tag, hierarchy, attributes)
 * - State transitions are verified with before/after comparisons
 * - Token resolution is tested against actual computed values
 * - Layout properties (flex, grid) are explicitly validated
 *
 * Each themed *.test.ts file owns one slice of the surface area.
 */

import type { TestCase } from '../../test-runner'

import { componentTokenTests } from './component-token.test'
import { componentStateTests, componentTokenStateTests } from './component-state.test'
import { nestedComponentTests } from './nested-component.test'
import { realWorldPatternTests } from './real-world.test'
import { layoutIntegrationTests } from './layout-integration.test'
import { dataIterationTests, conditionalTests } from './data.test'
import { iconButtonTests } from './icon-button.test'
import { animationTests } from './animation.test'
import { formIntegrationTests } from './form.test'
import { gradientTests } from './gradient.test'

export {
  componentTokenTests,
  componentStateTests,
  componentTokenStateTests,
  nestedComponentTests,
  realWorldPatternTests,
  layoutIntegrationTests,
  dataIterationTests,
  conditionalTests,
  iconButtonTests,
  animationTests,
  formIntegrationTests,
  gradientTests,
}

export const allIntegrationTests: TestCase[] = [
  ...componentTokenTests,
  ...componentStateTests,
  ...componentTokenStateTests,
  ...nestedComponentTests,
  ...realWorldPatternTests,
  ...layoutIntegrationTests,
  ...dataIterationTests,
  ...conditionalTests,
  ...iconButtonTests,
  ...animationTests,
  ...formIntegrationTests,
  ...gradientTests,
]

export const quickIntegrationTests: TestCase[] = [
  componentTokenTests[0], // Button component uses color token
  componentStateTests[1], // Component with toggle state
  componentTokenStateTests[0], // Button with token colors and hover state
  nestedComponentTests[0], // Card with nested slot components
  realWorldPatternTests[0], // Complete form field pattern
  dataIterationTests[0], // Each loop renders list items
  conditionalTests[0], // If/else block rendering
  iconButtonTests[0], // Button with leading icon
  animationTests[0], // Hover with transition timing
  formIntegrationTests[0], // Complete login form
  gradientTests[0], // Horizontal gradient background
]
