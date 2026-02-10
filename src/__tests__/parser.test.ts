import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('Parser', () => {
  describe('Component Definition', () => {
    it('parses component definition with properties', () => {
      const result = parse('Button: pad 8 col #3B82F6')

      expect(result.registry.has('Button')).toBe(true)
      const template = result.registry.get('Button')!
      expect(template.properties.pad).toBe(8)
      expect(template.properties.col).toBe('#3B82F6')
    })

    it('parses component definition with children', () => {
      const result = parse(`ProductTile: ver pad 12 gap 8
  Name size 14
  Price size 16`)

      expect(result.registry.has('ProductTile')).toBe(true)
      const template = result.registry.get('ProductTile')!
      expect(template.children.length).toBe(2)
      expect(template.children[0].name).toBe('Name')
      expect(template.children[1].name).toBe('Price')
    })
  })

  describe('Component Inheritance (from)', () => {
    it('inherits properties from base component', () => {
      const result = parse(`Button: pad 12 col #3B82F6 rad 8
DangerButton: from Button col #EF4444`)

      expect(result.registry.has('DangerButton')).toBe(true)
      const template = result.registry.get('DangerButton')!
      expect(template.properties.pad).toBe(12) // inherited
      expect(template.properties.rad).toBe(8) // inherited
      expect(template.properties.col).toBe('#EF4444') // overridden
    })

    it('inherits from base in inline usage', () => {
      const result = parse(`Button: pad 12 col #3B82F6
DangerButton from Button col #EF4444 "Delete"`)

      expect(result.nodes.length).toBe(1)
      const node = result.nodes[0]
      expect(node.name).toBe('DangerButton')
      expect(node.properties.pad).toBe(12) // inherited
      expect(node.properties.col).toBe('#EF4444') // overridden
      // Text is now a child node
      expect(node.children.length).toBe(1)
      expect(node.children[0].name).toBe('_text')
      expect(node.children[0].content).toBe('Delete')
    })
  })

  describe('Scoped Children', () => {
    it('registers children with parent scope', () => {
      const result = parse(`ProductTile: ver gap 8
  Name size 14
  Price size 16`)

      expect(result.registry.has('ProductTile.Name')).toBe(true)
      expect(result.registry.has('ProductTile.Price')).toBe(true)
    })

    it('children inherit scoped template', () => {
      const result = parse(`ProductTile: ver gap 8
  Name size 14 col #FFF
  Price size 16 col #10B981

ProductTile
  Name "MacBook"
  Price "€ 2.499"`)

      const tile = result.nodes[0]
      expect(tile.children.length).toBe(2)

      const name = tile.children[0]
      expect(name.name).toBe('Name')
      expect(name.properties.size).toBe(14)
      expect(name.properties.col).toBe('#FFF')
      // Text is now a _text child node
      expect(name.children[0].name).toBe('_text')
      expect(name.children[0].content).toBe('MacBook')

      const price = tile.children[1]
      expect(price.name).toBe('Price')
      expect(price.properties.size).toBe(16)
      expect(price.properties.col).toBe('#10B981')
      expect(price.children[0].name).toBe('_text')
      expect(price.children[0].content).toBe('€ 2.499')
    })
  })

  describe('Inline Child Slots', () => {
    it('parses inline slots on same line', () => {
      const result = parse(`ProductTile: ver gap 8
  Name size 14
  Price size 16

ProductTile Name "iPhone" Price "€ 999"`)

      const tile = result.nodes[0]
      expect(tile.children.length).toBe(2)
      expect(tile.children[0].content).toBe('iPhone')
      expect(tile.children[1].content).toBe('€ 999')
    })

    it('merges inline slots with template children', () => {
      const result = parse(`Card: ver gap 8
  Title size 18
  Description size 14
  Footer size 12

Card Title "Hello"`)

      const card = result.nodes[0]
      // Should have all 3 children from template, with Title content overridden
      expect(card.children.length).toBe(3)
      expect(card.children[0].content).toBe('Hello')
    })
  })

  describe('Template Reuse', () => {
    it('reuses component template without properties', () => {
      const result = parse(`Button: pad 12 col #3B82F6 rad 8

Button "Click"
Button "Submit"`)

      expect(result.nodes.length).toBe(2)
      expect(result.nodes[0].properties.pad).toBe(12)
      expect(result.nodes[0].properties.col).toBe('#3B82F6')
      expect(result.nodes[0].children[0].content).toBe('Click')

      expect(result.nodes[1].properties.pad).toBe(12)
      expect(result.nodes[1].children[0].content).toBe('Submit')
    })

    it('only explicit definitions (with colon) create reusable templates', () => {
      // Instance without colon should NOT create a template
      // Only explicit definitions (Name:) should be reusable
      const result = parse(`Myfooter pad 16 col #242424 hor gap 16
    Button "Okay"
    Button "Cancel"

Myfooter`)

      expect(result.nodes.length).toBe(2)

      // First instance has its own properties and children
      const first = result.nodes[0]
      expect(first.name).toBe('Myfooter')
      expect(first.properties.pad).toBe(16)
      expect(first.properties.col).toBe('#242424')
      expect(first.children.length).toBe(2)

      // Second instance has NO properties and NO children (no template was created)
      const second = result.nodes[1]
      expect(second.name).toBe('Myfooter')
      expect(second.properties.pad).toBeUndefined()
      expect(second.properties.col).toBeUndefined()
      expect(second.children.length).toBe(0)
    })

    it('explicit definition with children creates reusable template', () => {
      // Explicit definition (with :) should create a template with children
      const result = parse(`Myfooter: pad 16 col #242424 hor gap 16
    Button "Okay"
    Button "Cancel"

Myfooter`)

      expect(result.nodes.length).toBe(1) // Only one node in layout (the reuse)

      // The reused instance should have properties AND children from template
      const instance = result.nodes[0]
      expect(instance.name).toBe('Myfooter')
      expect(instance.properties.pad).toBe(16)
      expect(instance.properties.col).toBe('#242424')
      expect(instance.children.length).toBe(2)
      expect(instance.children[0].name).toBe('Button')
      expect(instance.children[0].children[0].content).toBe('Okay')
      expect(instance.children[1].name).toBe('Button')
      expect(instance.children[1].children[0].content).toBe('Cancel')
    })
  })

  describe('Layout Properties', () => {
    it('parses hor and ver', () => {
      const result = parse('Row hor gap 8')
      expect(result.nodes[0].properties.hor).toBe(true)
      expect(result.nodes[0].properties.gap).toBe(8)

      const result2 = parse('Column ver gap 16')
      expect(result2.nodes[0].properties.ver).toBe(true)
    })

    it('parses alignment properties', () => {
      const result = parse('Box hor-cen ver-cen')
      const props = result.nodes[0].properties
      expect(props['hor-cen']).toBe(true)
      expect(props['ver-cen']).toBe(true)
    })

    it('parses all alignment variants', () => {
      const variants = ['hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b']
      for (const v of variants) {
        const result = parse(`Box ${v}`)
        expect(result.nodes[0].properties[v]).toBe(true)
      }
    })
  })

  describe('Padding and Margin', () => {
    it('parses pad with single value', () => {
      const result = parse('Box pad 16')
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it('parses pad with directions', () => {
      const result = parse('Box pad l r 16')
      expect(result.nodes[0].properties.pad_l).toBe(16)
      expect(result.nodes[0].properties.pad_r).toBe(16)
    })

    it('parses mar with directions', () => {
      const result = parse('Box mar u d 8')
      expect(result.nodes[0].properties.mar_u).toBe(8)
      expect(result.nodes[0].properties.mar_d).toBe(8)
    })
  })

  describe('Nested Components', () => {
    it('parses nested structure', () => {
      const result = parse(`Header hor
  Logo "MyApp"
  Nav hor gap 8
    Link "Home"
    Link "About"`)

      const header = result.nodes[0]
      expect(header.name).toBe('Header')
      expect(header.children.length).toBe(2)

      const nav = header.children[1]
      expect(nav.name).toBe('Nav')
      expect(nav.children.length).toBe(2)
    })
  })

  describe('Errors', () => {
    it('returns empty nodes for empty input', () => {
      const result = parse('')
      expect(result.nodes.length).toBe(0)
      expect(result.errors.length).toBe(0)
    })
  })

  describe('Dimension Shorthand (syntactic sugar)', () => {
    it('parses Box with implicit w and h', () => {
      const result = parse('Box 300 400 pad 16')

      const box = result.nodes[0]
      expect(box.properties.w).toBe(300)
      expect(box.properties.h).toBe(400)
      expect(box.properties.pad).toBe(16)
    })

    it('parses component with only width', () => {
      const result = parse('Card 200 pad 8')

      const card = result.nodes[0]
      expect(card.properties.w).toBe(200)
      expect(card.properties.h).toBeUndefined()
      expect(card.properties.pad).toBe(8)
    })

    it('parses Image with implicit src and dimensions', () => {
      const result = parse('Image "hero.jpg" 800 600')

      const image = result.nodes[0]
      expect(image.properties.src).toBe('hero.jpg')
      expect(image.properties.w).toBe(800)
      expect(image.properties.h).toBe(600)
      expect(image.content).toBeUndefined()
    })

    it('parses Image with dimensions and other properties', () => {
      const result = parse('Image "photo.jpg" 400 300 fit cover rad 8')

      const image = result.nodes[0]
      expect(image.properties.src).toBe('photo.jpg')
      expect(image.properties.w).toBe(400)
      expect(image.properties.h).toBe(300)
      expect(image.properties.fit).toBe('cover')
      expect(image.properties.rad).toBe(8)
    })

    it('explicit w h still works', () => {
      const result = parse('Box w 300 h 400 pad 16')

      const box = result.nodes[0]
      expect(box.properties.w).toBe(300)
      expect(box.properties.h).toBe(400)
      expect(box.properties.pad).toBe(16)
    })

    it('mixed implicit and explicit works', () => {
      const result = parse('Box 300 h 400 pad 16')

      const box = result.nodes[0]
      expect(box.properties.w).toBe(300)
      expect(box.properties.h).toBe(400)
      expect(box.properties.pad).toBe(16)
    })
  })

  describe('Overlay Actions (open/close with animations)', () => {
    it('parses open action with target', () => {
      const result = parse(`Button "Open"
  onclick open MyDialog`)

      const button = result.nodes[0]
      expect(button.eventHandlers).toBeDefined()
      expect(button.eventHandlers!.length).toBe(1)

      const handler = button.eventHandlers![0]
      expect(handler.event).toBe('onclick')
      expect(handler.actions.length).toBe(1)

      const action = handler.actions[0] as { type: string; target: string }
      expect(action.type).toBe('open')
      expect(action.target).toBe('MyDialog')
    })

    it('parses open action with animation', () => {
      const result = parse(`Button "Open"
  onclick open ConfirmDialog slide-up`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target: string; animation: string }
      expect(action.type).toBe('open')
      expect(action.target).toBe('ConfirmDialog')
      expect(action.animation).toBe('slide-up')
    })

    it('parses open action with animation and duration', () => {
      const result = parse(`Button "Show"
  onclick open Modal fade 300`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target: string; animation: string; duration: number }
      expect(action.type).toBe('open')
      expect(action.target).toBe('Modal')
      expect(action.animation).toBe('fade')
      expect(action.duration).toBe(300)
    })

    it('parses close action with target', () => {
      const result = parse(`Button "Close"
  onclick close MyDialog`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target: string }
      expect(action.type).toBe('close')
      expect(action.target).toBe('MyDialog')
    })

    it('parses close action without target (close topmost)', () => {
      const result = parse(`Button "Cancel"
  onclick close`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target?: string }
      expect(action.type).toBe('close')
      expect(action.target).toBeUndefined()
    })

    it('parses close action with animation', () => {
      const result = parse(`Button "Done"
  onclick close Dialog scale`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target: string; animation: string }
      expect(action.type).toBe('close')
      expect(action.target).toBe('Dialog')
      expect(action.animation).toBe('scale')
    })

    it('parses close action with animation and duration', () => {
      const result = parse(`Button "OK"
  onclick close Popup slide-down 150`)

      const button = result.nodes[0]
      const handler = button.eventHandlers![0]
      const action = handler.actions[0] as { type: string; target: string; animation: string; duration: number }
      expect(action.type).toBe('close')
      expect(action.target).toBe('Popup')
      expect(action.animation).toBe('slide-down')
      expect(action.duration).toBe(150)
    })

    it('parses all supported animation types', () => {
      // Note: 'none' is excluded because it conflicts with BORDER_STYLES
      // (and omitting animation achieves the same effect)
      const animations = ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'fade', 'scale']

      for (const anim of animations) {
        const result = parse(`Button "Test"
  onclick open Dialog ${anim}`)
        const button = result.nodes[0]
        const action = button.eventHandlers![0].actions[0] as { animation: string }
        expect(action.animation).toBe(anim)
      }
    })

    it('component definitions work as overlay templates', () => {
      const result = parse(`ConfirmDialog: ver pad 24 col #1E1E2E rad 12
  Title "Are you sure?"
  Actions hor gap 8
    CancelBtn "Cancel"
      onclick close
    ConfirmBtn "Confirm"

OpenBtn "Show Dialog"
  onclick open ConfirmDialog slide-up`)

      // ConfirmDialog should be in registry as template
      expect(result.registry.has('ConfirmDialog')).toBe(true)
      const template = result.registry.get('ConfirmDialog')!
      expect(template.properties.pad).toBe(24)
      expect(template.properties.col).toBe('#1E1E2E')
      expect(template.children.length).toBe(2)

      // Only the OpenBtn should be in nodes (ConfirmDialog is just a definition)
      expect(result.nodes.length).toBe(1)
      expect(result.nodes[0].name).toBe('OpenBtn')

      // OpenBtn should have open action with animation
      const action = result.nodes[0].eventHandlers![0].actions[0] as { type: string; target: string; animation: string }
      expect(action.type).toBe('open')
      expect(action.target).toBe('ConfirmDialog')
      expect(action.animation).toBe('slide-up')
    })
  })

  describe('Named Instances', () => {
    it('parses Input Email as named instance', () => {
      const result = parse('Input Email: placeholder "Email" w full')

      expect(result.registry.has('Email')).toBe(true)
      const template = result.registry.get('Email')!
      expect(template.properties.placeholder).toBe('Email')
      expect(template.properties.w).toBe('full')
      expect(template.properties._primitiveType).toBe('Input')
    })

    it('parses Button Submit as named instance', () => {
      const result = parse('Button Submit: pad 12 col #3B82F6 "Login"')

      expect(result.registry.has('Submit')).toBe(true)
      const template = result.registry.get('Submit')!
      expect(template.properties.pad).toBe(12)
      expect(template.properties.col).toBe('#3B82F6')
      // Text is now a child node
      expect(template.children.length).toBe(1)
      expect(template.children[0].name).toBe('_text')
      expect(template.children[0].content).toBe('Login')
      expect(template.properties._primitiveType).toBe('Button')
    })

    it('parses named instance reference in layout', () => {
      // Input Email: defines a reusable named input template
      // LoginForm: defines a layout template
      // LoginForm (without colon) instantiates the layout
      const result = parse(`Input Email: placeholder "Email"

LoginForm: ver gap 16
  Input Email

LoginForm`)

      expect(result.nodes.length).toBe(1)
      const loginForm = result.nodes[0]
      expect(loginForm.name).toBe('LoginForm')
      expect(loginForm.children.length).toBe(1)
      const emailInput = loginForm.children[0]
      expect(emailInput.name).toBe('Email')
      expect(emailInput.properties.placeholder).toBe('Email')
    })
  })

  describe('Centralized Events Block', () => {
    it('parses events block with single handler', () => {
      const result = parse(`Input Email: placeholder "Email"

events
  Email onchange
    page Dashboard`)

      expect(result.centralizedEvents.length).toBe(1)
      const handler = result.centralizedEvents[0]
      expect(handler.targetInstance).toBe('Email')
      expect(handler.event).toBe('onchange')
      expect(handler.actions.length).toBe(1)
    })

    it('parses events block with multiple handlers', () => {
      const result = parse(`Input Email: placeholder "Email"
Button Submit: "Login"

events
  Email onchange
    page Dashboard
  Submit onclick
    page Dashboard`)

      expect(result.centralizedEvents.length).toBe(2)
      expect(result.centralizedEvents[0].targetInstance).toBe('Email')
      expect(result.centralizedEvents[0].event).toBe('onchange')
      expect(result.centralizedEvents[1].targetInstance).toBe('Submit')
      expect(result.centralizedEvents[1].event).toBe('onclick')
    })

    it('parses conditional in events block', () => {
      const result = parse(`Input Email: placeholder "Email"
Input Password: placeholder "Password"
Button Submit: "Login"

events
  Submit onclick
    if Email.value
      page Dashboard`)

      expect(result.centralizedEvents.length).toBe(1)
      const handler = result.centralizedEvents[0]
      expect(handler.targetInstance).toBe('Submit')
      expect(handler.actions.length).toBe(1)

      const conditional = handler.actions[0] as { condition: { type: string } }
      expect(conditional.condition.type).toBe('var')
    })
  })

  describe('Component Property Access', () => {
    it('tokenizes Email.value as single token', () => {
      const result = parse(`events
  Submit onclick
    if Email.value
      page Dashboard`)

      expect(result.centralizedEvents.length).toBe(1)
      const conditional = result.centralizedEvents[0].actions[0] as { condition: { type: string; name: string } }
      expect(conditional.condition.type).toBe('var')
      expect(conditional.condition.name).toBe('Email.value')
    })
  })

  describe('Syntactic Sugar - Property Inference', () => {
    it('infers color property as col for all components', () => {
      const result = parse('Text #FFFFFF "Hello"')

      expect(result.nodes.length).toBe(1)
      const text = result.nodes[0]
      expect(text.properties.col).toBe('#FFFFFF')
    })

    it('infers color property as col for Box', () => {
      const result = parse('Box #3B82F6')

      expect(result.nodes.length).toBe(1)
      const box = result.nodes[0]
      expect(box.properties.col).toBe('#3B82F6')
    })

    it('infers color property for Icon component as col', () => {
      const result = parse('Icon #FFFFFF icon "home"')

      expect(result.nodes.length).toBe(1)
      const icon = result.nodes[0]
      expect(icon.properties.col).toBe('#FFFFFF')
    })

    it('explicit col still works', () => {
      const result = parse('Text col #FFFFFF')

      expect(result.nodes.length).toBe(1)
      const text = result.nodes[0]
      expect(text.properties.col).toBe('#FFFFFF')
    })

    it('infers pad property from token name ending in -pad', () => {
      const result = parse(`$default-pad: 16

Box $default-pad`)

      expect(result.nodes.length).toBe(1)
      const box = result.nodes[0]
      expect(box.properties.pad).toBe(16)
    })

    it('infers rad property from token name ending in -rad', () => {
      const result = parse(`$card-rad: 12

Box $card-rad #1F2937`)

      expect(result.nodes.length).toBe(1)
      const box = result.nodes[0]
      expect(box.properties.rad).toBe(12)
      expect(box.properties.col).toBe('#1F2937')
    })

    it('infers col property from token name ending in -col', () => {
      const result = parse(`$primary-col: #3B82F6

Text $primary-col "Hello"`)

      expect(result.nodes.length).toBe(1)
      const text = result.nodes[0]
      expect(text.properties.col).toBe('#3B82F6')
    })

    it('infers col property from token name ending in -color', () => {
      const result = parse(`$card-color: #1F2937

Box $card-color pad 16`)

      expect(result.nodes.length).toBe(1)
      const box = result.nodes[0]
      expect(box.properties.col).toBe('#1F2937')
      expect(box.properties.pad).toBe(16)
    })

    it('explicit property overrides token name inference', () => {
      // Even though token name suggests pad, explicit rad assignment works
      const result = parse(`$default-pad: 16

Box rad $default-pad`)

      expect(result.nodes.length).toBe(1)
      const box = result.nodes[0]
      expect(box.properties.rad).toBe(16)
      expect(box.properties.pad).toBeUndefined()
    })

    it('warns for token not defined', () => {
      const result = parse('Box $undefined-pad')

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('not defined')
    })

    it('warns for token without inferable property', () => {
      const result = parse(`$something: 16

Box $something`)

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain("couldn't infer from name")
    })
  })
})
