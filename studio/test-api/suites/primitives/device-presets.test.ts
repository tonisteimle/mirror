/**
 * Device Presets Tests
 *
 * Tests for the device size presets feature:
 * - device mobile → w 375, h 812
 * - device tablet → w 768, h 1024
 * - device desktop → w 1440, h 900
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const devicePresetsTests: TestCase[] = describe('Device Presets', [
  // Mobile preset
  testWithSetup(
    'device mobile sets width 375px and height 812px',
    'Frame device mobile, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '375px')
      api.assert.hasStyle('node-1', 'height', '812px')
    }
  ),

  // Tablet preset
  testWithSetup(
    'device tablet sets width 768px and height 1024px',
    'Frame device tablet, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '768px')
      api.assert.hasStyle('node-1', 'height', '1024px')
    }
  ),

  // Desktop preset
  testWithSetup(
    'device desktop sets width 1440px and height 900px',
    'Frame device desktop, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '1440px')
      api.assert.hasStyle('node-1', 'height', '900px')
    }
  ),

  // Case insensitivity
  testWithSetup(
    'device MOBILE (uppercase) works',
    'Frame device MOBILE, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '375px')
      api.assert.hasStyle('node-1', 'height', '812px')
    }
  ),

  // With other properties
  testWithSetup(
    'device preset works with other styling properties',
    'Frame device mobile, bg #2271C1, pad 16, rad 8',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '375px')
      api.assert.hasStyle('node-1', 'height', '812px')
      // Check backgroundColor instead of background (which includes full shorthand)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
    }
  ),

  // With children
  testWithSetup(
    'device preset works with children',
    `Frame device mobile, bg #1a1a1a, gap 16
  Text "Header", col white, fs 24
  Button "Click me", bg #2271C1, col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '375px')
      api.assert.hasStyle('node-1', 'height', '812px')
      api.assert.hasStyle('node-1', 'gap', '16px')

      // Children should exist
      api.assert.exists('node-2')
      api.assert.hasText('node-2', 'Header')
      api.assert.exists('node-3')
      api.assert.hasText('node-3', 'Click me')
    }
  ),

  // Override width after device
  testWithSetup(
    'explicit width after device overrides preset width',
    'Frame device mobile, w 400, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Width should be overridden
      api.assert.hasStyle('node-1', 'width', '400px')
      // Height should remain from preset
      api.assert.hasStyle('node-1', 'height', '812px')
    }
  ),

  // Override height after device
  testWithSetup(
    'explicit height after device overrides preset height',
    'Frame device tablet, h 800, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Width should remain from preset
      api.assert.hasStyle('node-1', 'width', '768px')
      // Height should be overridden
      api.assert.hasStyle('node-1', 'height', '800px')
    }
  ),

  // Layout modes work with device presets
  testWithSetup(
    'device preset with horizontal layout',
    `Frame device mobile, hor, gap 8, bg #1a1a1a
  Text "A"
  Text "B"
  Text "C"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '375px')
      api.assert.hasStyle('node-1', 'height', '812px')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
    }
  ),

  // Center alignment with device preset
  testWithSetup(
    'device preset with center alignment',
    `Frame device desktop, center, bg #1a1a1a
  Text "Centered", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'width', '1440px')
      api.assert.hasStyle('node-1', 'height', '900px')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),
])
