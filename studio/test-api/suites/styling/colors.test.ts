/**
 * Color Tests
 *
 * Tests for: bg, col, boc (background, color, border-color)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const colorTests: TestCase[] = describe('Colors', [
  // Background colors
  testWithSetup('bg with hex color', 'Frame bg #2271C1', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
  }),

  testWithSetup('bg with short hex', 'Frame bg #f00', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(255, 0, 0)')
  }),

  testWithSetup('bg with named color white', 'Frame bg white', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(255, 255, 255)')
  }),

  testWithSetup('bg with named color black', 'Frame bg black', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(0, 0, 0)')
  }),

  testWithSetup('bg transparent', 'Frame bg transparent', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  // Text colors
  testWithSetup('col sets text color', 'Text "Hello", col #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(239, 68, 68)')
  }),

  testWithSetup('col white', 'Text "Hello", col white', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
  }),

  testWithSetup('c alias for col', 'Text "Hello", c #10b981', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'color', 'rgb(16, 185, 129)')
  }),

  // Border colors
  testWithSetup('boc sets border color', 'Frame bor 1, boc #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'borderColor', 'rgb(51, 51, 51)')
  }),
])
