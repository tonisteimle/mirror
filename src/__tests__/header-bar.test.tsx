/**
 * HeaderBar Component Tests
 *
 * Using the test kit for concise, readable tests.
 */
import {
  componentTest,
  headerBarProps,
  screen,
  fireEvent,
  describe,
  it,
  expect,
} from './kit'
import { HeaderBar } from '../components/HeaderBar'

const test = componentTest(HeaderBar, headerBarProps)

describe('HeaderBar', () => {
  // ===========================================
  // Rendering Tests
  // ===========================================

  test.shouldRenderTitles(['Tutorial', 'Import', 'Export', 'Einstellungen'])

  it('renders logo', () => {
    test.render()
    expect(screen.getByAltText('mirror')).toBeDefined()
  })

  // ===========================================
  // Button Interaction Tests
  // ===========================================

  describe('Button Interactions', () => {
    test.clicking('Import').calls('onImport')
    test.clicking('Export').calls('onExport')
    test.clicking('Einstellungen').calls('onOpenSettings')
  })
})
