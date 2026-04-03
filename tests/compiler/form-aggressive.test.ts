/**
 * Aggressive Tests: Form Component
 *
 * Comprehensive edge case testing for Form component:
 * - Parser edge cases
 * - IR transformation edge cases
 * - Code generation edge cases
 * - Complex nested structures
 * - Error handling
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import {
  isZagPrimitive,
  isZagItemKeyword,
  getZagPrimitive,
  isZagSlot,
} from '../../compiler/schema/zag-primitives'

describe('Form: Aggressive Parser Tests', () => {
  describe('Field Property Combinations', () => {
    it('parses Field with all properties', () => {
      const input = `
Form collection "$tasks"
  Field name "title", label "Title", placeholder "Enter...", required, max 100
`
      const ast = parse(input)
      const item = ast.instances?.[0]?.items?.[0]

      expect(item).toBeDefined()
      expect(item.name).toBe('title')
      expect(item.label).toBe('Title')
      expect(item.placeholder).toBe('Enter...')
      expect(item.required).toBe(true)
      expect(item.max).toBe(100)
    })

    it('parses Field with multiline flag', () => {
      const input = `
Form collection "$tasks"
  Field name "description", multiline, placeholder "Long text..."
`
      const ast = parse(input)
      const item = ast.instances?.[0]?.items?.[0]

      expect(item.multiline).toBe(true)
      expect(item.placeholder).toBe('Long text...')
    })

    it('parses Field with display override', () => {
      const input = `
Form collection "$tasks"
  Field name "status", display "select"
  Field name "done", display "checkbox"
  Field name "priority", display "slider"
`
      const ast = parse(input)
      const items = ast.instances?.[0]?.items

      expect(items[0].display).toBe('select')
      expect(items[1].display).toBe('checkbox')
      expect(items[2].display).toBe('slider')
    })

    it('parses Field with readOnly and disabled', () => {
      const input = `
Form collection "$tasks"
  Field name "id", readOnly
  Field name "archived", disabled
`
      const ast = parse(input)
      const items = ast.instances?.[0]?.items

      expect(items[0].readOnly).toBe(true)
      expect(items[1].disabled).toBe(true)
    })

    it('parses Field with filter for relations', () => {
      const input = `
Form collection "$tasks"
  Field name "assignee", filter "active"
`
      const ast = parse(input)
      const item = ast.instances?.[0]?.items?.[0]

      expect(item.filter).toBe('active')
    })

    it('parses multiple Fields in sequence', () => {
      const input = `
Form collection "$users"
  Field name "firstName", label "First Name", required
  Field name "lastName", label "Last Name", required
  Field name "email", label "Email", placeholder "user@example.com"
  Field name "age", label "Age", max 150
  Field name "bio", label "Biography", multiline
  Field name "active", label "Active", display "switch"
`
      const ast = parse(input)
      const items = ast.instances?.[0]?.items

      expect(items).toHaveLength(6)
      expect(items[0].name).toBe('firstName')
      expect(items[5].display).toBe('switch')
    })
  })

  describe('Slot Parsing Edge Cases', () => {
    it('parses Actions slot with colon syntax', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions:
    Button "Save"
`
      const ast = parse(input)
      expect(ast.instances?.[0]?.slots?.Actions).toBeDefined()
      expect(ast.instances?.[0]?.slots?.Actions?.children).toHaveLength(1)
    })

    it('parses Actions slot without colon', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save"
    Button "Cancel"
`
      const ast = parse(input)
      expect(ast.instances?.[0]?.slots?.Actions).toBeDefined()
      expect(ast.instances?.[0]?.slots?.Actions?.children).toHaveLength(2)
    })

    it('parses Actions with styled buttons', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save", bg #2563eb, col white, pad 12 24
    Button "Cancel", bg #333, col white
`
      const ast = parse(input)
      const buttons = ast.instances?.[0]?.slots?.Actions?.children

      expect(buttons).toHaveLength(2)
      expect(buttons[0].properties.some((p: any) => p.name === 'bg')).toBe(true)
    })

    it('parses empty Actions slot', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions:
`
      const ast = parse(input)
      expect(ast.instances?.[0]?.slots?.Actions).toBeDefined()
      expect(ast.instances?.[0]?.slots?.Actions?.children).toHaveLength(0)
    })
  })

  describe('Collection Binding Edge Cases', () => {
    it('parses collection with $ prefix', () => {
      const input = `Form collection "$tasks"`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'collection')

      expect(prop?.values[0]).toBe('$tasks')
    })

    it('parses collection without $ prefix', () => {
      const input = `Form collection "tasks"`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'collection')

      expect(prop?.values[0]).toBe('tasks')
    })

    it('parses collection with nested path', () => {
      const input = `Form collection "$data.users"`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'collection')

      expect(prop?.values[0]).toBe('$data.users')
    })
  })

  describe('Form Properties', () => {
    it('parses auto flag', () => {
      const input = `Form collection "$tasks", auto`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'auto')

      expect(prop?.values[0]).toBe(true)
    })

    it('parses validateOnBlur', () => {
      const input = `Form collection "$tasks", validateOnBlur`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'validateOnBlur')

      expect(prop?.values[0]).toBe(true)
    })

    it('parses validateOnChange', () => {
      const input = `Form collection "$tasks", validateOnChange`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'validateOnChange')

      expect(prop?.values[0]).toBe(true)
    })

    it('parses disabled Form', () => {
      const input = `Form collection "$tasks", disabled`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'disabled')

      expect(prop?.values[0]).toBe(true)
    })

    it('parses readOnly Form', () => {
      const input = `Form collection "$tasks", readOnly`
      const ast = parse(input)
      const prop = ast.instances?.[0]?.properties?.find((p: any) => p.name === 'readOnly')

      expect(prop?.values[0]).toBe(true)
    })

    it('parses multiple Form properties', () => {
      const input = `Form collection "$tasks", auto, validateOnBlur, validateOnChange`
      const ast = parse(input)
      const props = ast.instances?.[0]?.properties

      expect(props?.some((p: any) => p.name === 'auto')).toBe(true)
      expect(props?.some((p: any) => p.name === 'validateOnBlur')).toBe(true)
      expect(props?.some((p: any) => p.name === 'validateOnChange')).toBe(true)
    })
  })
})

describe('Form: Aggressive IR Tests', () => {
  describe('Machine Config Generation', () => {
    it('generates correct machineConfig for collection', () => {
      const input = `Form collection "$tasks"`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.collection).toBe('tasks')
    })

    it('strips $ prefix from collection in machineConfig', () => {
      const input = `Form collection "$myData"`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.collection).toBe('myData')
    })

    it('preserves collection without $ prefix', () => {
      const input = `Form collection "rawData"`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.collection).toBe('rawData')
    })

    it('includes auto in machineConfig', () => {
      const input = `Form collection "$tasks", auto`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.auto).toBe(true)
    })

    it('includes validation flags in machineConfig', () => {
      const input = `Form collection "$tasks", validateOnBlur, validateOnChange`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.machineConfig.validateOnBlur).toBe(true)
      expect(node.machineConfig.validateOnChange).toBe(true)
    })
  })

  describe('Item Transformation', () => {
    it('transforms Field items with all properties', () => {
      const input = `
Form collection "$tasks"
  Field name "title", label "Title", placeholder "Enter", required, max 50
`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      const item = node.items[0]

      expect(item.name).toBe('title')
      expect(item.label).toBe('Title')
      expect(item.placeholder).toBe('Enter')
      expect(item.required).toBe(true)
      expect(item.max).toBe(50)
    })

    it('transforms multiple Field items', () => {
      const input = `
Form collection "$tasks"
  Field name "a"
  Field name "b"
  Field name "c"
  Field name "d"
  Field name "e"
`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.items).toHaveLength(5)
      expect(node.items.map((i: any) => i.name)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('transforms Field with boolean flags', () => {
      const input = `
Form collection "$tasks"
  Field name "x", multiline, required, readOnly, disabled
`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      const item = node.items[0]

      expect(item.multiline).toBe(true)
      expect(item.required).toBe(true)
      expect(item.readOnly).toBe(true)
      expect(item.disabled).toBe(true)
    })
  })

  describe('Slot Transformation', () => {
    it('transforms Actions slot with children', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save"
    Button "Cancel"
`
      const ast = parse(input)
      const ir = toIR(ast)

      const node = ir.nodes[0] as any
      expect(node.slots.Actions).toBeDefined()
      expect(node.slots.Actions.children).toHaveLength(2)
    })
  })
})

describe('Form: Aggressive Code Generation Tests', () => {
  describe('Form Element Generation', () => {
    it('generates form element', () => {
      const input = `Form collection "$tasks"`
      const code = compile(input)

      expect(code).toContain("createElement('form')")
      expect(code).toContain("dataset.zagComponent = 'form'")
    })

    it('generates collection data attribute', () => {
      const input = `Form collection "$myCollection"`
      const code = compile(input)

      expect(code).toContain("dataset.collection = 'myCollection'")
    })

    it('generates prevent default on submit', () => {
      const input = `Form collection "$tasks"`
      const code = compile(input)

      expect(code).toContain("addEventListener('submit'")
      expect(code).toContain('preventDefault()')
    })
  })

  describe('Field Generation', () => {
    it('generates field container', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
`
      const code = compile(input)

      expect(code).toContain("dataset.slot = 'Field'")
      expect(code).toContain("dataset.fieldName = 'title'")
    })

    it('generates label element', () => {
      const input = `
Form collection "$tasks"
  Field name "title", label "Task Title"
`
      const code = compile(input)

      expect(code).toContain("createElement('label')")
      expect(code).toContain("dataset.slot = 'FieldLabel'")
      expect(code).toContain("textContent = 'Task Title'")
    })

    it('generates input element', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
`
      const code = compile(input)

      expect(code).toContain("createElement('input')")
      expect(code).toContain("dataset.slot = 'FieldInput'")
    })

    it('generates textarea for multiline', () => {
      const input = `
Form collection "$tasks"
  Field name "description", multiline
`
      const code = compile(input)

      expect(code).toContain("createElement('textarea')")
    })

    it('generates checkbox input for checkbox display', () => {
      const input = `
Form collection "$tasks"
  Field name "done", display "checkbox"
`
      const code = compile(input)

      expect(code).toContain("type = 'checkbox'")
    })

    it('generates number input for number/slider display', () => {
      const input = `
Form collection "$tasks"
  Field name "priority", display "number"
`
      const code = compile(input)

      expect(code).toContain("type = 'number'")
    })

    it('generates placeholder attribute', () => {
      const input = `
Form collection "$tasks"
  Field name "title", placeholder "Enter task title..."
`
      const code = compile(input)

      expect(code).toContain("placeholder = 'Enter task title...'")
    })

    it('generates required attribute', () => {
      const input = `
Form collection "$tasks"
  Field name "title", required
`
      const code = compile(input)

      expect(code).toContain('.required = true')
    })

    it('generates error span', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
`
      const code = compile(input)

      expect(code).toContain("dataset.slot = 'FieldError'")
    })
  })

  describe('Actions Slot Generation', () => {
    it('generates actions container', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save"
`
      const code = compile(input)

      expect(code).toContain("dataset.slot = 'Actions'")
    })

    it('generates button children in actions', () => {
      const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Button "Save"
    Button "Cancel"
`
      const code = compile(input)

      expect(code).toContain("createElement('button')")
      expect(code).toContain('Save')
      expect(code).toContain('Cancel')
    })
  })

  describe('Complex Form Generation', () => {
    it('generates complete form with multiple fields and actions', () => {
      const input = `
Form collection "$users"
  Field name "firstName", label "First Name", placeholder "John", required
  Field name "lastName", label "Last Name", placeholder "Doe", required
  Field name "email", label "Email", placeholder "john@example.com"
  Field name "bio", label "Biography", multiline
  Field name "active", label "Active", display "checkbox"
  Actions
    Button "Save", bg #2563eb
    Button "Cancel", bg #666
`
      const code = compile(input)

      // Form element
      expect(code).toContain("createElement('form')")

      // All fields
      expect(code).toContain("dataset.fieldName = 'firstName'")
      expect(code).toContain("dataset.fieldName = 'lastName'")
      expect(code).toContain("dataset.fieldName = 'email'")
      expect(code).toContain("dataset.fieldName = 'bio'")
      expect(code).toContain("dataset.fieldName = 'active'")

      // Labels
      expect(code).toContain("textContent = 'First Name'")
      expect(code).toContain("textContent = 'Last Name'")

      // Textarea for multiline
      expect(code).toContain("createElement('textarea')")

      // Checkbox
      expect(code).toContain("type = 'checkbox'")

      // Actions
      expect(code).toContain('Save')
      expect(code).toContain('Cancel')
    })
  })
})

describe('Form: Schema Validation', () => {
  it('Form is a valid Zag primitive', () => {
    expect(isZagPrimitive('Form')).toBe(true)
  })

  it('Field is a valid item keyword for Form', () => {
    expect(isZagItemKeyword('Form', 'Field')).toBe(true)
  })

  it('Actions is a valid slot for Form', () => {
    expect(isZagSlot('Form', 'Actions')).toBe(true)
  })

  it('Form has correct itemProps', () => {
    const def = getZagPrimitive('Form')

    expect(def?.itemProps).toContain('name')
    expect(def?.itemProps).toContain('label')
    expect(def?.itemProps).toContain('placeholder')
    expect(def?.itemProps).toContain('multiline')
    expect(def?.itemProps).toContain('display')
    expect(def?.itemProps).toContain('required')
    expect(def?.itemProps).toContain('disabled')
    expect(def?.itemProps).toContain('readOnly')
    expect(def?.itemProps).toContain('filter')
    expect(def?.itemProps).toContain('allowClear')
    expect(def?.itemProps).toContain('max')
  })

  it('Form has correct props', () => {
    const def = getZagPrimitive('Form')

    expect(def?.props).toContain('collection')
    expect(def?.props).toContain('auto')
    expect(def?.props).toContain('validateOnBlur')
    expect(def?.props).toContain('validateOnChange')
    expect(def?.props).toContain('disabled')
    expect(def?.props).toContain('readOnly')
  })

  it('Form has correct slots', () => {
    const def = getZagPrimitive('Form')

    expect(def?.slots).toContain('Field')
    expect(def?.slots).toContain('Actions')
  })

  it('Form has correct machine type', () => {
    const def = getZagPrimitive('Form')

    expect(def?.machine).toBe('form')
  })
})

describe('Form: Edge Cases and Error Handling', () => {
  describe('Empty Form', () => {
    it('compiles Form without fields', () => {
      const input = `Form collection "$tasks"`
      const code = compile(input)

      expect(code).toContain("createElement('form')")
    })

    it('compiles Form with only Actions', () => {
      const input = `
Form collection "$tasks"
  Actions
    Button "Submit"
`
      const code = compile(input)

      expect(code).toContain("createElement('form')")
      expect(code).toContain('Submit')
    })
  })

  describe('Special Characters', () => {
    it('handles field name with underscores', () => {
      const input = `
Form collection "$tasks"
  Field name "first_name"
`
      const code = compile(input)

      expect(code).toContain("dataset.fieldName = 'first_name'")
    })

    it('handles label with special characters', () => {
      const input = `
Form collection "$tasks"
  Field name "email", label "E-Mail Address"
`
      const code = compile(input)

      expect(code).toContain("textContent = 'E-Mail Address'")
    })

    it('handles placeholder with quotes', () => {
      const input = `
Form collection "$tasks"
  Field name "title", placeholder "Enter 'title' here"
`
      const code = compile(input)

      // The placeholder should appear in the output, quotes can be escaped in different ways
      expect(code).toMatch(/Enter.*title.*here/)
    })
  })

  describe('Numeric Values', () => {
    it('handles max as integer', () => {
      const input = `
Form collection "$tasks"
  Field name "title", max 100
`
      const ast = parse(input)
      const item = ast.instances?.[0]?.items?.[0]

      expect(item.max).toBe(100)
    })

    it('handles max as zero', () => {
      const input = `
Form collection "$tasks"
  Field name "count", max 0
`
      const ast = parse(input)
      const item = ast.instances?.[0]?.items?.[0]

      expect(item.max).toBe(0)
    })
  })

  describe('Form Nesting', () => {
    it('Form inside Frame', () => {
      const input = `
Frame pad 20
  Form collection "$tasks"
    Field name "title"
`
      const code = compile(input)

      expect(code).toContain("createElement('form')")
      expect(code).toContain("dataset.fieldName = 'title'")
    })

    it('multiple Forms in same document', () => {
      const input = `
Frame gap 20
  Form collection "$users"
    Field name "name"
  Form collection "$tasks"
    Field name "title"
`
      const code = compile(input)

      // Should have two forms
      const formMatches = code.match(/createElement\('form'\)/g)
      expect(formMatches).toHaveLength(2)
    })
  })
})

describe('Form: Stress Tests', () => {
  it('handles 20 fields', () => {
    const fields = Array.from({ length: 20 }, (_, i) => `  Field name "field${i}"`).join('\n')
    const input = `Form collection "$data"\n${fields}`

    const ast = parse(input)
    expect(ast.instances?.[0]?.items).toHaveLength(20)

    const code = compile(input)
    for (let i = 0; i < 20; i++) {
      expect(code).toContain(`dataset.fieldName = 'field${i}'`)
    }
  })

  it('handles deeply nested Actions content', () => {
    const input = `
Form collection "$tasks"
  Field name "title"
  Actions
    Frame hor, gap 8
      Frame ver
        Button "Primary"
      Frame ver
        Button "Secondary"
        Button "Tertiary"
`
    const code = compile(input)

    expect(code).toContain('Primary')
    expect(code).toContain('Secondary')
    expect(code).toContain('Tertiary')
  })

  it('handles all field properties at once', () => {
    const input = `
Form collection "$tasks"
  Field name "mega", label "Mega Field", placeholder "Enter value", multiline, required, readOnly, disabled, display "textarea", max 1000, filter "active", allowClear
`
    const ast = parse(input)
    const item = ast.instances?.[0]?.items?.[0]

    expect(item.name).toBe('mega')
    expect(item.label).toBe('Mega Field')
    expect(item.placeholder).toBe('Enter value')
    expect(item.multiline).toBe(true)
    expect(item.required).toBe(true)
    expect(item.readOnly).toBe(true)
    expect(item.disabled).toBe(true)
    expect(item.display).toBe('textarea')
    expect(item.max).toBe(1000)
    expect(item.filter).toBe('active')
    expect(item.allowClear).toBe(true)
  })
})
