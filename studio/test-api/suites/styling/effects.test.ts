/**
 * Effect Tests
 *
 * Tests for: opacity, shadow, blur, cursor, hidden, visible, clip, scroll
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const effectTests: TestCase[] = describe('Effects', [
  testWithSetup('opacity', 'Frame opacity 0.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'opacity', '0.5')
  }),

  testWithSetup('shadow sm', 'Frame shadow sm', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('shadow md', 'Frame shadow md', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('shadow lg', 'Frame shadow lg', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('blur', 'Frame blur 4', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  testWithSetup('cursor pointer', 'Frame cursor pointer', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'pointer')
  }),

  testWithSetup('cursor not-allowed', 'Frame cursor not-allowed', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'not-allowed')
  }),
])

export const visibilityTests: TestCase[] = describe('Visibility', [
  testWithSetup('hidden sets display none', 'Frame hidden', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'none')
  }),

  testWithSetup('visible sets display flex', 'Frame visible', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'flex')
  }),

  testWithSetup('clip sets overflow hidden', 'Frame clip', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflow', 'hidden')
  }),

  testWithSetup('scroll enables scrolling', 'Frame scroll, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflowY', 'auto')
  }),
])

export const combinedTests: TestCase[] = describe('Combined Styles', [
  testWithSetup(
    'Button with full styling',
    'Button "Click", bg #2271C1, col white, pad 12 24, rad 6, fs 14, weight 500',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'fontSize', '14px')
      api.assert.hasStyle('node-1', 'fontWeight', '500')
    }
  ),

  testWithSetup(
    'Card with multiple styles',
    'Frame bg #1a1a1a, pad 16, rad 8, gap 8, shadow md\n  Text "Title", col white, fs 18, weight bold\n  Text "Desc", col #888, fs 14',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
    }
  ),
])
