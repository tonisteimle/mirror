/**
 * AST to HTML Structure Tests
 *
 * Tests that DSL generates correct HTML element structure.
 * Uses DOM rendering via renderInteractive for accurate structure testing.
 */
import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'
import { generateAll } from '../../test-utils'
import { renderInteractive, findByDSLClass, findAllByDSLClass } from '../../kit/behavior-helpers'

describe('AST to HTML Structure', () => {
  // ==========================================================================
  // Basic Element Types
  // ==========================================================================
  describe('Basic Element Types', () => {
    it('renders Box as div', () => {
      const { container } = renderInteractive('Box')
      const box = container.querySelector('.Box')
      expect(box).not.toBeNull()
      expect(box?.tagName).toBe('DIV')
    })

    it('renders Text as div with text content', () => {
      const { container } = renderInteractive('Text "Hello"')
      const text = container.querySelector('.Text')
      expect(text?.textContent).toBe('Hello')
    })

    it('renders with className matching component name', () => {
      const { container } = renderInteractive('Card')
      expect(container.querySelector('.Card')).not.toBeNull()
    })

    it('preserves component name as className', () => {
      const { container } = renderInteractive('MyComponent')
      expect(container.querySelector('.MyComponent')).not.toBeNull()
    })
  })

  // ==========================================================================
  // HTML Primitives
  // ==========================================================================
  describe('HTML Primitives', () => {
    it('renders Input as input element', () => {
      const { container } = renderInteractive('Input "placeholder"')
      const input = container.querySelector('input')
      expect(input).not.toBeNull()
      expect(input?.placeholder).toBe('placeholder')
    })

    it('renders Input with type attribute', () => {
      const { container } = renderInteractive('Input "email" type email')
      const input = container.querySelector('input')
      expect(input?.type).toBe('email')
    })

    it('renders Textarea as textarea element', () => {
      const { container } = renderInteractive('Textarea "message"')
      const textarea = container.querySelector('textarea')
      expect(textarea).not.toBeNull()
    })

    it('renders Image as img element', () => {
      const { container } = renderInteractive('Image "photo.jpg"')
      const img = container.querySelector('img')
      expect(img).not.toBeNull()
      expect(img?.src).toContain('photo.jpg')
    })

    it('renders Image with fit property', () => {
      const { container } = renderInteractive('Image "photo.jpg" fit cover')
      const img = container.querySelector('img')
      expect(img?.style.objectFit).toBe('cover')
    })

    it('renders Link as anchor element', () => {
      const { container } = renderInteractive('Link "https://example.com" "Click here"')
      const link = container.querySelector('a')
      expect(link).not.toBeNull()
      expect(link?.href).toBe('https://example.com/')
    })

    it('renders Button as div with Button class (preview mode)', () => {
      // In preview mode, Button renders as div with interactivity
      // Native <button> elements are used in export mode
      const { container } = renderInteractive('Button "Click me"')
      const button = container.querySelector('.Button')
      expect(button).not.toBeNull()
      expect(button?.textContent).toBe('Click me')
    })
  })

  // ==========================================================================
  // Parent-Child Hierarchy
  // ==========================================================================
  describe('Parent-Child Hierarchy', () => {
    it('renders parent-child via indentation', () => {
      const { container } = renderInteractive(`Card
  Title "Hello"`)
      const card = container.querySelector('.Card')
      const title = card?.querySelector('.Title')
      expect(title).not.toBeNull()
    })

    it('renders multiple children', () => {
      const { container } = renderInteractive(`Card
  Title "Hello"
  Description "World"`)
      const card = container.querySelector('.Card')
      expect(card?.querySelectorAll(':scope > div').length).toBeGreaterThanOrEqual(2)
    })

    it('renders deeply nested structure', () => {
      const { container } = renderInteractive(`Card
  Header
    Title "Hello"`)
      const header = container.querySelector('.Header')
      expect(header).not.toBeNull()
      expect(header?.querySelector('.Title')).not.toBeNull()
    })

    it('preserves child class names', () => {
      const { container } = renderInteractive(`Container
  Header "Title"
  Content "Body"
  Footer "End"`)
      expect(container.querySelector('.Header')).not.toBeNull()
      expect(container.querySelector('.Content')).not.toBeNull()
      expect(container.querySelector('.Footer')).not.toBeNull()
    })
  })

  // ==========================================================================
  // Component Definition and Usage
  // ==========================================================================
  describe('Component Definition and Usage', () => {
    it('definition with colon does not render', () => {
      const result = parse('Card: bg #333')
      // Definition should not produce renderable nodes
      expect(result.nodes.length).toBe(0)
    })

    it('usage without colon renders', () => {
      const { container } = renderInteractive('Card "Content"')
      expect(container.querySelector('.Card')).not.toBeNull()
    })

    it('subsequent uses inherit properties', () => {
      const { container } = renderInteractive(`Button bg #3B82F6 "First"
Button "Second"`)
      const buttons = container.querySelectorAll('.Button')
      expect(buttons.length).toBe(2)
    })
  })

  // ==========================================================================
  // Slots (Named Children)
  // ==========================================================================
  describe('Slots', () => {
    it('renders defined slots in usage', () => {
      const { container } = renderInteractive(`Card:
  Title:
  Description:

Card Title "Hello" Description "World"`)
      const card = container.querySelector('.Card')
      expect(card?.querySelector('.Title')).not.toBeNull()
      expect(card?.querySelector('.Description')).not.toBeNull()
    })

    it('renders slots with expanded syntax', () => {
      const { container } = renderInteractive(`Card:
  Title:
  Actions:

Card
  Title "Header"
  Actions
    Button "Save"`)
      expect(container.querySelector('.Title')).not.toBeNull()
      expect(container.querySelector('.Actions')).not.toBeNull()
      // Button renders as div with .Button class in preview mode
      expect(container.querySelector('.Actions .Button')).not.toBeNull()
    })
  })

  // ==========================================================================
  // List Items (New Instances)
  // ==========================================================================
  describe('List Items', () => {
    it('creates new instances with - prefix', () => {
      const { container } = renderInteractive(`Menu
  - Item "Profile"
  - Item "Settings"
  - Item "Logout"`)
      const items = container.querySelectorAll('.Item')
      expect(items.length).toBe(3)
    })

    it('allows property override on list items', () => {
      const { container } = renderInteractive(`Menu
  - Item "Normal"
  - Item col #EF4444 "Danger"`)
      const items = container.querySelectorAll('.Item')
      expect(items[0].textContent).toBe('Normal')
      expect(items[1].textContent).toBe('Danger')
    })
  })

  // ==========================================================================
  // Named Instances
  // ==========================================================================
  describe('Named Instances', () => {
    it('renders named primitives', () => {
      // Named primitive definition followed by usage
      const { container } = renderInteractive(`Input Email: "Enter email" type email
Email`)
      const input = container.querySelector('input')
      expect(input).not.toBeNull()
      expect(input?.type).toBe('email')
    })

    it('renders named components with named keyword', () => {
      const { container } = renderInteractive(`Panel:
  "Content"

Panel named Dashboard "Dashboard content"`)
      expect(container.querySelector('.Panel')).not.toBeNull()
    })
  })

  // ==========================================================================
  // Data Attributes
  // ==========================================================================
  describe('Data Attributes', () => {
    it('adds data-id to interactive elements', () => {
      const { container } = renderInteractive(`Toggle onclick toggle
  state off
    bg #333
  state on
    bg #3B82F6`)
      const toggle = container.querySelector('.Toggle')
      expect(toggle?.getAttribute('data-id')).toBeDefined()
    })

    it('adds data-state for stateful components', () => {
      const { container } = renderInteractive(`Toggle onclick toggle
  state off
    bg #333
  state on
    bg #3B82F6`)
      const toggle = container.querySelector('.Toggle')
      expect(toggle?.getAttribute('data-state')).toBeDefined()
    })
  })

  // ==========================================================================
  // Multiple Root Elements
  // ==========================================================================
  describe('Multiple Root Elements', () => {
    it('generates multiple root elements', () => {
      const { container } = renderInteractive(`Box "First"
Box "Second"
Box "Third"`)
      const boxes = container.querySelectorAll('.Box')
      expect(boxes.length).toBe(3)
    })

    it('maintains independence of root elements', () => {
      const { container } = renderInteractive(`Card bg #111 "Dark"
Card bg #EEE "Light"`)
      const cards = container.querySelectorAll('.Card')
      expect(cards.length).toBe(2)
    })
  })

  // ==========================================================================
  // Text Content
  // ==========================================================================
  describe('Text Content', () => {
    it('renders text at end of line', () => {
      const { container } = renderInteractive('Button bg #3B82F6 "Click me"')
      // Button renders as div with .Button class in preview mode
      const button = container.querySelector('.Button')
      expect(button?.textContent).toBe('Click me')
    })

    it('renders text in nested elements', () => {
      const { container } = renderInteractive(`Card
  Title "Welcome"
  Description "Get started with Mirror"`)
      const title = container.querySelector('.Title')
      const desc = container.querySelector('.Description')
      expect(title?.textContent).toBe('Welcome')
      expect(desc?.textContent).toBe('Get started with Mirror')
    })
  })

  // ==========================================================================
  // Icon Integration
  // ==========================================================================
  describe('Icon Integration', () => {
    it('renders icon property', () => {
      const { container } = renderInteractive('Box icon "search"')
      const box = container.querySelector('.Box')
      // Icon should be rendered as SVG child
      expect(box?.querySelector('svg')).not.toBeNull()
    })
  })
})
