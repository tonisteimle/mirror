/**
 * Chart Data File Tests
 *
 * Verifies that the DEFAULT_PROJECT template ships with a usable
 * `data.data` file, and that creating a new project persists it
 * to localStorage.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { DEFAULT_PROJECT } from '../../../storage'

export const dataFileTests: TestCase[] = describe('Data Files', [
  test('data.data exists in DEFAULT_PROJECT template', async (api: TestAPI) => {
    api.assert.ok('data.data' in DEFAULT_PROJECT, 'data.data should exist in DEFAULT_PROJECT')
    api.assert.ok(
      DEFAULT_PROJECT['data.data'].includes('sales:'),
      'data.data should contain sales data'
    )
    api.assert.ok(
      DEFAULT_PROJECT['data.data'].includes('products:'),
      'data.data should contain products data'
    )
    api.assert.ok(
      DEFAULT_PROJECT['data.data'].includes('categories:'),
      'data.data should contain categories data'
    )
    api.assert.ok(
      DEFAULT_PROJECT['data.data'].includes('traffic:'),
      'data.data should contain traffic data'
    )
  }),

  test('new project creates data.data in localStorage', async (api: TestAPI) => {
    localStorage.setItem('mirror-files', JSON.stringify(DEFAULT_PROJECT))

    const stored = localStorage.getItem('mirror-files')
    api.assert.ok(stored !== null, 'mirror-files should exist in localStorage')

    const files = JSON.parse(stored!)
    api.assert.ok('data.data' in files, 'data.data should exist after new project creation')
    api.assert.ok(files['data.data'].includes('sales:'), 'saved data.data should contain sales')
  }),
])
