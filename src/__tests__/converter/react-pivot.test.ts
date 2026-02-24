/**
 * @vitest-environment node
 *
 * Tests for the React-Pivot transformation pipeline
 */

import { describe, it, expect } from 'vitest'
import {
  // Spec
  REACT_TO_MIRROR_PROPERTIES,
  REACT_TO_MIRROR_EVENTS,
  REACT_TO_MIRROR_ACTIONS,
  REACT_TO_MIRROR_STATES,
  ALLOWED_COMPONENTS,
  isValidReactProperty,
  isValidReactEvent,
  isValidAction,
  isValidState,
  isAllowedComponent,
  getMirrorProperty,
  getMirrorEvent,

  // Validation
  validateReactCode,
  healReactCode,
  generateCorrectionPrompt,

  // Transformation
  transformReactToMirror,

  // Integration
  shouldUseReactPivot,

  // Types
  createReactPivotError,
} from '../../converter/react-pivot'

// =============================================================================
// Spec Tests
// =============================================================================

describe('React-Pivot Spec', () => {
  describe('ALLOWED_COMPONENTS', () => {
    it('includes essential layout components', () => {
      expect(ALLOWED_COMPONENTS).toContain('Box')
      expect(ALLOWED_COMPONENTS).toContain('Row')
      expect(ALLOWED_COMPONENTS).toContain('Col')
      expect(ALLOWED_COMPONENTS).toContain('Stack')
      expect(ALLOWED_COMPONENTS).toContain('Grid')
    })

    it('includes content components', () => {
      expect(ALLOWED_COMPONENTS).toContain('Text')
      expect(ALLOWED_COMPONENTS).toContain('Title')
      expect(ALLOWED_COMPONENTS).toContain('Icon')
      expect(ALLOWED_COMPONENTS).toContain('Image')
    })

    it('includes interactive components', () => {
      expect(ALLOWED_COMPONENTS).toContain('Button')
      expect(ALLOWED_COMPONENTS).toContain('Input')
      expect(ALLOWED_COMPONENTS).toContain('Link')
    })

    it('includes container components', () => {
      expect(ALLOWED_COMPONENTS).toContain('Card')
      expect(ALLOWED_COMPONENTS).toContain('Panel')
      expect(ALLOWED_COMPONENTS).toContain('Modal')
    })
  })

  describe('isAllowedComponent', () => {
    it('returns true for allowed components', () => {
      expect(isAllowedComponent('Box')).toBe(true)
      expect(isAllowedComponent('Button')).toBe(true)
      expect(isAllowedComponent('Card')).toBe(true)
    })

    it('returns false for disallowed components', () => {
      expect(isAllowedComponent('div')).toBe(false)
      expect(isAllowedComponent('span')).toBe(false)
      expect(isAllowedComponent('CustomComponent')).toBe(false)
    })
  })

  describe('Property Mapping', () => {
    it('maps layout properties', () => {
      expect(REACT_TO_MIRROR_PROPERTIES.direction).toBeDefined()
      expect(REACT_TO_MIRROR_PROPERTIES.gap).toBe('gap')
      expect(REACT_TO_MIRROR_PROPERTIES.alignItems).toBeDefined()
    })

    it('maps sizing properties', () => {
      expect(REACT_TO_MIRROR_PROPERTIES.width).toBe('w')
      expect(REACT_TO_MIRROR_PROPERTIES.height).toBe('h')
      expect(REACT_TO_MIRROR_PROPERTIES.minWidth).toBe('min-w')
    })

    it('maps color properties', () => {
      expect(REACT_TO_MIRROR_PROPERTIES.background).toBe('bg')
      expect(REACT_TO_MIRROR_PROPERTIES.color).toBe('col')
      expect(REACT_TO_MIRROR_PROPERTIES.borderColor).toBe('boc')
    })
  })

  describe('isValidReactProperty', () => {
    it('returns true for valid properties', () => {
      expect(isValidReactProperty('width')).toBe(true)
      expect(isValidReactProperty('background')).toBe(true)
      expect(isValidReactProperty('padding')).toBe(true)
    })

    it('returns false for invalid properties', () => {
      expect(isValidReactProperty('unknownProp')).toBe(false)
      expect(isValidReactProperty('someRandomProp')).toBe(false)
    })
  })

  describe('getMirrorProperty', () => {
    it('returns Mirror property name', () => {
      expect(getMirrorProperty('width')).toBe('w')
      expect(getMirrorProperty('background')).toBe('bg')
      expect(getMirrorProperty('padding')).toBe('pad')
    })

    it('returns first option for multi-value mappings', () => {
      // direction maps to 'hor|ver'
      const result = getMirrorProperty('direction')
      expect(result).toBe('hor')
    })

    it('returns null for unmapped properties', () => {
      expect(getMirrorProperty('unknownProp')).toBeNull()
    })
  })

  describe('Event Mapping', () => {
    it('maps React events to Mirror events', () => {
      expect(REACT_TO_MIRROR_EVENTS.onClick).toBe('onclick')
      expect(REACT_TO_MIRROR_EVENTS.onHover).toBe('onhover')
      expect(REACT_TO_MIRROR_EVENTS.onChange).toBe('onchange')
    })

    it('validates event names', () => {
      expect(isValidReactEvent('onClick')).toBe(true)
      expect(isValidReactEvent('onCustomEvent')).toBe(false)
    })

    it('gets Mirror event name', () => {
      expect(getMirrorEvent('onClick')).toBe('onclick')
      expect(getMirrorEvent('onUnknown')).toBeNull()
    })
  })

  describe('Action Mapping', () => {
    it('maps action types', () => {
      expect(REACT_TO_MIRROR_ACTIONS.toggle).toBe('toggle')
      expect(REACT_TO_MIRROR_ACTIONS.show).toBe('show')
      expect(REACT_TO_MIRROR_ACTIONS.hide).toBe('hide')
      expect(REACT_TO_MIRROR_ACTIONS.assign).toBe('assign')
    })

    it('validates action names', () => {
      expect(isValidAction('toggle')).toBe(true)
      expect(isValidAction('show')).toBe(true)
      expect(isValidAction('unknownAction')).toBe(false)
    })
  })

  describe('State Mapping', () => {
    it('maps system states', () => {
      expect(REACT_TO_MIRROR_STATES.hover).toBe('hover')
      expect(REACT_TO_MIRROR_STATES.focus).toBe('focus')
      expect(REACT_TO_MIRROR_STATES.disabled).toBe('disabled')
    })

    it('maps behavior states', () => {
      expect(REACT_TO_MIRROR_STATES.selected).toBe('selected')
      expect(REACT_TO_MIRROR_STATES.expanded).toBe('expanded')
      expect(REACT_TO_MIRROR_STATES.on).toBe('on')
    })

    it('validates state names', () => {
      expect(isValidState('hover')).toBe(true)
      expect(isValidState('selected')).toBe(true)
      expect(isValidState('unknownState')).toBe(false)
    })
  })
})

// =============================================================================
// Validation Tests
// =============================================================================

describe('React Validation', () => {
  describe('validateReactCode', () => {
    it('validates code with allowed components', () => {
      const code = `<Box><Text>Hello</Text></Box>`
      const result = validateReactCode(code)
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('detects unknown components', () => {
      const code = `<CustomWidget>Content</CustomWidget>`
      const result = validateReactCode(code)
      expect(result.issues.some(i => i.type === 'INVALID_COMPONENT')).toBe(true)
    })

    it('suggests replacements for unknown components', () => {
      const code = `<CustomWidget>Content</CustomWidget>`
      const result = validateReactCode(code)
      const issue = result.issues.find(i => i.type === 'INVALID_COMPONENT')
      expect(issue).toBeDefined()
      expect(issue?.fixable).toBe(true)
      // Suggestion should mention using allowed components
      expect(issue?.suggestion).toBeDefined()
    })

    it('detects hardcoded colors', () => {
      const code = `<Box style={{ background: '#3B82F6' }}>Test</Box>`
      const result = validateReactCode(code)
      expect(result.issues.some(i => i.type === 'HARDCODED_COLOR')).toBe(true)
    })

    it('allows token colors', () => {
      const code = `<Box style={{ background: '$primary.bg' }}>Test</Box>`
      const result = validateReactCode(code)
      expect(result.issues.filter(i => i.type === 'HARDCODED_COLOR')).toHaveLength(0)
    })

    it('detects className usage', () => {
      const code = `<Box className="px-4 bg-blue-500">Test</Box>`
      const result = validateReactCode(code)
      expect(result.issues.some(i => i.type === 'CLASSNAME_USED')).toBe(true)
    })

    it('detects spread operators', () => {
      const code = `<Box {...props}>Test</Box>`
      const result = validateReactCode(code)
      expect(result.issues.some(i => i.type === 'SPREAD_OPERATOR')).toBe(true)
    })

    it('detects React hooks', () => {
      const code = `const [state, setState] = useState(0)`
      const result = validateReactCode(code)
      expect(result.issues.some(i => i.type === 'CUSTOM_HOOK')).toBe(true)
    })
  })

  describe('healReactCode', () => {
    it('removes spread operators', () => {
      const code = `<Box {...props} style={{ padding: 8 }}>Test</Box>`
      const issues = validateReactCode(code).issues
      const result = healReactCode(code, issues)

      expect(result.code).not.toContain('{...props}')
    })

    it('reports unfixable issues', () => {
      const code = `<Box style={{ background: '#ff0000' }}>Test</Box>`
      const issues = validateReactCode(code).issues
      const result = healReactCode(code, issues)

      expect(result.success).toBe(false)
      expect(result.remainingIssues.some(i => i.type === 'HARDCODED_COLOR')).toBe(true)
    })
  })

  describe('generateCorrectionPrompt', () => {
    it('generates a correction prompt with issues', () => {
      const prompt = generateCorrectionPrompt(
        'Create a button',
        '<div style={{ background: "#ff0000" }}>Click</div>',
        [
          { type: 'INVALID_COMPONENT', message: 'Unknown component', fixable: false },
          { type: 'HARDCODED_COLOR', message: 'Hardcoded color', fixable: false },
        ]
      )

      expect(prompt).toContain('validation issues')
      expect(prompt).toContain('Unknown component')
      expect(prompt).toContain('Hardcoded color')
      expect(prompt).toContain('Create a button')
    })
  })
})

// =============================================================================
// Transformation Tests
// =============================================================================

describe('React Transformation', () => {
  describe('transformReactToMirror', () => {
    it('transforms simple Box to Mirror', () => {
      const react = `
const App = () => (
  <Box style={{ padding: 16, background: '$surface.bg' }}>
    <Text>Hello World</Text>
  </Box>
)
`
      const result = transformReactToMirror(react)

      expect(result.mirrorCode).toContain('Box')
      expect(result.mirrorCode).toContain('pad 16')
      expect(result.mirrorCode).toContain('bg $surface.bg')
      expect(result.mirrorCode).toContain('Text')
      expect(result.mirrorCode).toContain('Hello World')
    })

    it('transforms horizontal layout', () => {
      const react = `
const App = () => (
  <Row style={{ gap: 8 }}>
    <Text>Left</Text>
    <Text>Right</Text>
  </Row>
)
`
      const result = transformReactToMirror(react)

      // Row component is already horizontal, check it exists with gap
      expect(result.mirrorCode).toContain('Row')
      expect(result.mirrorCode).toContain('gap 8')
      expect(result.mirrorCode).toContain('Left')
      expect(result.mirrorCode).toContain('Right')
    })

    it('transforms component with states', () => {
      const react = `
const Button = mirror({
  tag: 'button',
  base: {
    padding: 8,
    background: '$primary.bg',
  },
  states: {
    hover: { background: '$primary.hover.bg' }
  }
})

const App = () => (
  <Button>Click me</Button>
)
`
      const result = transformReactToMirror(react)

      expect(result.mirrorCode).toContain('Button:')
      expect(result.mirrorCode).toContain('hover')
    })

    it('returns schema for debugging', () => {
      const react = `
const App = () => (
  <Card><Title>Test</Title></Card>
)
`
      const result = transformReactToMirror(react)

      expect(result.schema).toBeDefined()
      expect(result.schema.layout).toBeDefined()
    })
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  describe('shouldUseReactPivot', () => {
    it('returns true for complex UI keywords', () => {
      expect(shouldUseReactPivot('Create a login form')).toBe(true)
      expect(shouldUseReactPivot('Build a dashboard')).toBe(true)
      expect(shouldUseReactPivot('Add a data table')).toBe(true)
      expect(shouldUseReactPivot('Create a modal dialog')).toBe(true)
    })

    it('returns true for multi-component descriptions', () => {
      // These prompts contain complex keywords or are long enough to trigger
      expect(shouldUseReactPivot('Create a navigation menu with icons')).toBe(true)
      expect(shouldUseReactPivot('Build a dropdown with multiple options')).toBe(true)
    })

    it('returns true for long prompts', () => {
      const longPrompt = 'Create a user profile card that shows the avatar, name, email, and has buttons for edit and delete actions at the bottom'
      expect(shouldUseReactPivot(longPrompt)).toBe(true)
    })

    it('returns false for simple prompts', () => {
      expect(shouldUseReactPivot('blue')).toBe(false)
      expect(shouldUseReactPivot('bigger')).toBe(false)
      expect(shouldUseReactPivot('bold text')).toBe(false)
    })
  })
})

// =============================================================================
// Error Tests
// =============================================================================

describe('Error Handling', () => {
  describe('createReactPivotError', () => {
    it('creates an error with all fields', () => {
      const error = createReactPivotError({
        message: 'Test error',
        phase: 'react-validation',
        issues: [{ type: 'HARDCODED_COLOR', message: 'Bad color', fixable: false }],
        code: '<div />',
      })

      expect(error.name).toBe('ReactPivotError')
      expect(error.message).toBe('Test error')
      expect(error.phase).toBe('react-validation')
      expect(error.issues).toHaveLength(1)
      expect(error.code).toBe('<div />')
    })

    it('is an instance of Error', () => {
      const error = createReactPivotError({
        message: 'Test',
        phase: 'react-generation',
      })

      expect(error instanceof Error).toBe(true)
    })
  })
})
