/**
 * EditorPanel Component Tests
 *
 * Using the test kit for concise, readable tests.
 */
import {
  componentTest,
  editorPanelProps,
  editorActionsContext,
  setupMocks,
  screen,
  fireEvent,
  describe,
  it,
  expect,
  beforeEach,
} from './kit'
import { EditorPanel } from '../components/EditorPanel'

// Setup component mocks
setupMocks()

// Create test context
const contextActions = editorActionsContext()

// Create test builder
const test = componentTest(EditorPanel, editorPanelProps, {
  providers: { EditorActions: contextActions },
})

describe('EditorPanel', () => {
  // ===========================================
  // Rendering Tests
  // ===========================================

  test.shouldRender(['Page', 'Components', 'Tokens'])
  test.shouldRenderTitles(['Clear', 'Extract'])

  // ===========================================
  // Tab Selection Tests
  // ===========================================

  describe('Tab Selection', () => {
    test.clicking('Page').calls('onTabChange', 'layout')
    test.clicking('Components').calls('onTabChange', 'components')
    test.clicking('Tokens').calls('onTabChange', 'tokens')
  })

  // ===========================================
  // Action Button Tests
  // ===========================================

  describe('Action Buttons', () => {
    beforeEach(() => {
      contextActions.onClear.mockClear()
      contextActions.onClean.mockClear()
    })

    it('clicking Clear calls onClear from context', () => {
      test.render()
      fireEvent.click(screen.getByTitle('Clear'))
      expect(contextActions.onClear).toHaveBeenCalledTimes(1)
    })

    it('clicking Extract calls onClean from context', () => {
      test.render()
      fireEvent.click(screen.getByTitle('Extract'))
      expect(contextActions.onClean).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================
  // Editor Content Tests
  // ===========================================

  describe('Editor Content', () => {
    test.when({ activeTab: 'layout' }).editorHasValue('Box')
    test.when({ activeTab: 'components' }).editorHasValue('Button: col #3B82F6')
    test.when({ activeTab: 'tokens' }).editorHasValue('$primary: #3B82F6')

    it('calls onLayoutChange when editor content changes', () => {
      const { props } = test.render({ activeTab: 'layout' })
      const editor = screen.getByTestId('editor')
      fireEvent.change(editor, { target: { value: 'NewBox' } })
      expect(props.onLayoutChange).toHaveBeenCalledWith('NewBox')
    })
  })

  // ===========================================
  // Width Tests
  // ===========================================

  describe('Width', () => {
    it('applies width from props', () => {
      const { container } = test.render({ width: 500 })
      const panel = container.firstChild as HTMLElement
      expect(panel.style.width).toBe('500px')
    })
  })
})
