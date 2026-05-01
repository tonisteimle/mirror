/**
 * Property Panel Bidirectional Tests (preview.inspect reads applied styles)
 *
 * Note: This file is named `propertyPanelTests` but unrelated to the
 * property-panel/ folder which tests the panel UI itself.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const propertyPanelTests: TestCase[] = describe('Property Panel', [
  testWithSetup(
    'Can read element properties',
    'Frame pad 16, bg #1a1a1a, rad 8',
    async (api: TestAPI) => {
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Should get element info')
      api.assert.ok(info!.styles.padding !== '', 'Should have padding')
      api.assert.ok(info!.styles.borderRadius !== '', 'Should have border radius')
    }
  ),

  testWithSetup(
    'Can read text element font',
    'Text "Styled", fs 24, weight bold',
    async (api: TestAPI) => {
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Text element should exist')
      api.assert.ok(
        info!.styles.fontSize === '24px',
        `Font size should be 24px, got: ${info!.styles.fontSize}`
      )
      const weight = info!.styles.fontWeight
      api.assert.ok(
        weight === '700' || weight === 'bold',
        `Font weight should be bold (700), got: ${weight}`
      )
    }
  ),

  testWithSetup(
    'Can read icon properties',
    'Icon "check", ic #10b981, is 24',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),
])
