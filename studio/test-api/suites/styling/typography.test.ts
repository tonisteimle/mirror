/**
 * Typography Tests
 *
 * Tests for: fs, weight, font, italic, underline, uppercase, lowercase, truncate, text-align
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const typographyTests: TestCase[] = describe('Typography', [
  testWithSetup('fs sets font-size', 'Text "Big", fs 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontSize', '24px')
  }),

  testWithSetup('weight bold', 'Text "Bold", weight bold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '700')
  }),

  testWithSetup('weight semibold', 'Text "Semi", weight semibold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '600')
  }),

  testWithSetup('weight medium', 'Text "Medium", weight medium', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('weight normal', 'Text "Normal", weight normal', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '400')
  }),

  testWithSetup('weight light', 'Text "Light", weight light', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '300')
  }),

  testWithSetup('weight numeric', 'Text "500", weight 500', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('font mono', 'Text "Code", font mono', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('italic', 'Text "Italic", italic', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontStyle', 'italic')
  }),

  testWithSetup('underline', 'Text "Underline", underline', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textDecoration', 'underline')
  }),

  testWithSetup('uppercase', 'Text "upper", uppercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'uppercase')
  }),

  testWithSetup('lowercase', 'Text "LOWER", lowercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'lowercase')
  }),

  testWithSetup(
    'truncate adds ellipsis',
    'Text "Very long text that gets cut off", truncate, w 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'overflow', 'hidden')
    }
  ),

  testWithSetup(
    'text-align center',
    'Text "Centered", text-align center, w 200',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'textAlign', 'center')
    }
  ),
])
