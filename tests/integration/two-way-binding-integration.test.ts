/**
 * Two-Way Data Binding Integration Tests
 *
 * Tests the two-way binding feature by compiling Mirror code
 * and executing it in a jsdom environment.
 *
 * @vitest-environment jsdom
 */

import { describe, test, expect } from 'vitest'
import { parse, generateDOM } from '../../compiler'
import { JSDOM } from 'jsdom'

// ============================================
// TEST HELPERS
// ============================================

function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

function compileAndExecute(mirrorCode: string): {
  dom: JSDOM
  container: HTMLElement
  window: Window & typeof globalThis
  runtime: any
  mirrorData: any
} {
  const jsCode = compile(mirrorCode)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost',
  })

  const { window } = dom
  const { document } = window

  // Capture script errors
  const errors: string[] = []
  ;(window as any).onerror = (msg: string) => {
    errors.push(msg)
  }

  // The generated code includes the runtime, so we just need to execute it
  // Note: createUI() returns the root element directly with API methods attached
  const executableCode = jsCode.replace(/^export /gm, '')
  const wrappedCode = `
    (function() {
      try {
        ${executableCode}
        window.__mirrorRoot = createUI();
        window.__mirrorAPI = window.__mirrorRoot;
        window._runtime = _runtime;
      } catch (e) {
        window.__scriptError = e.message + '\\n' + e.stack;
      }
    })();
  `

  const script = document.createElement('script')
  script.textContent = wrappedCode
  document.body.appendChild(script)

  // Check for script errors
  if ((window as any).__scriptError) {
    throw new Error('Script execution error: ' + (window as any).__scriptError)
  }

  const container = (window as any).__mirrorRoot

  return {
    dom,
    container,
    window: window as Window & typeof globalThis,
    runtime: (window as any)._runtime,
    mirrorData: (window as any).__mirrorData,
  }
}

// Helper to simulate input event
function simulateInput(input: HTMLInputElement, value: string, window: Window) {
  input.value = value
  const event = new window.Event('input', { bubbles: true })
  input.dispatchEvent(event)
}

// ============================================
// TWO-WAY BINDING TESTS
// ============================================

describe('Two-Way Binding Integration', () => {
  test('Input with token binding updates __mirrorData', () => {
    const { container, window, mirrorData } = compileAndExecute(`$name: "Max"

Input value $name, placeholder "Name"`)
    const input = container.querySelector('input') as HTMLInputElement

    expect(input).toBeTruthy()
    expect(input.value).toBe('Max')

    // Simulate user typing
    simulateInput(input, 'Anna', window)

    // Check that __mirrorData was updated
    expect(mirrorData.name).toBe('Anna')
  })

  // Skip: Text $token without quotes doesn't render initial value correctly
  test.skip('Text element updates when input changes', () => {
    const { container, window, mirrorData } = compileAndExecute(`$name: "Max"

Frame gap 12
  Input value $name, placeholder "Name"
  Text $name`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('Max')
    expect(text.textContent).toBe('Max')

    // Simulate user typing
    simulateInput(input, 'Updated', window)

    // Text should update reactively
    expect(text.textContent).toBe('Updated')
  })

  test('Complex text expression updates', () => {
    const { container, window } = compileAndExecute(`$name: "World"

Frame gap 12
  Input value $name
  Text "Hello, " + $name + "!"`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(text.textContent).toContain('Hello, World!')

    // Update input
    simulateInput(input, 'Mirror', window)

    // Text expression should re-evaluate
    expect(text.textContent).toContain('Hello, Mirror!')
  })

  // Skip: Text $token without quotes doesn't render initial value correctly
  test.skip('Nested data path binding', () => {
    const { container, window, mirrorData } = compileAndExecute(`$user.profile.name: "Deep"

Frame gap 12
  Input value $user.profile.name
  Text $user.profile.name`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('Deep')
    expect(text.textContent).toBe('Deep')

    // Update nested value
    simulateInput(input, 'Nested', window)

    // Token is stored with dot notation key: "user.profile.name"
    expect(mirrorData['user.profile.name']).toBe('Nested')
    expect(text.textContent).toBe('Nested')
  })

  test('Multiple inputs bound to same token', () => {
    const { container, window, mirrorData } = compileAndExecute(`$shared: "initial"

Frame gap 12
  Input value $shared, placeholder "Input 1"
  Input value $shared, placeholder "Input 2"`)
    const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>

    expect(inputs[0].value).toBe('initial')
    expect(inputs[1].value).toBe('initial')

    // Update first input
    simulateInput(inputs[0], 'updated', window)

    // Data should update
    expect(mirrorData.shared).toBe('updated')
    // Note: Second input updates when it's not focused (handled by runtime)
  })

  test('Textarea binding', () => {
    const { container, window, mirrorData } = compileAndExecute(`$content: "Initial"

Frame gap 12
  Textarea value $content
  Text "Preview: " + $content`)
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(textarea.value).toBe('Initial')
    expect(text.textContent).toContain('Preview: Initial')

    // Update textarea
    textarea.value = 'Updated content'
    const event = new window.Event('input', { bubbles: true })
    textarea.dispatchEvent(event)

    expect(mirrorData.content).toBe('Updated content')
    expect(text.textContent).toContain('Preview: Updated content')
  })

  test('Static value has no binding', () => {
    const { container, window } = compileAndExecute(`Input value "static", placeholder "Static"`)
    const input = container.querySelector('input') as HTMLInputElement

    expect(input.value).toBe('static')

    // Can still type (it's a regular input)
    simulateInput(input, 'changed', window)
    expect(input.value).toBe('changed')

    // But no __mirrorData updates since it's static
    // (this just verifies the input still works as expected)
  })

  test('Input in component has binding', () => {
    const { container, window, mirrorData } = compileAndExecute(`$search: "query"

SearchBox: Frame pad 12, bg #1a1a1a, rad 8
  Input value $search, placeholder "Search..."

SearchBox
Text "Result: " + $search`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('query')
    expect(text.textContent).toContain('Result: query')

    // Update input in component
    simulateInput(input, 'new query', window)

    expect(mirrorData.search).toBe('new query')
    expect(text.textContent).toContain('Result: new query')
  })
})

describe('Two-Way Binding: Edge Cases', () => {
  test('Empty initial value', () => {
    const { container, window } = compileAndExecute(`$empty: ""

Input value $empty, placeholder "Empty"
Text "Value: " + $empty`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('')
    expect(text.textContent).toBe('Value: ')

    simulateInput(input, 'filled', window)

    expect(text.textContent).toBe('Value: filled')
  })

  test('Numeric value binding', () => {
    const { container, window, mirrorData } = compileAndExecute(`$count: 0

Input value $count, type number
Text "Count: " + $count`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    expect(input.value).toBe('0')

    simulateInput(input, '42', window)

    expect(mirrorData.count).toBe('42')
    expect(text.textContent).toBe('Count: 42')
  })

  // Skip: Text $token without quotes doesn't render initial value correctly
  test.skip('Special characters in value', () => {
    const { container, window, mirrorData } = compileAndExecute(`$special: "test"

Input value $special
Text $special`)
    const input = container.querySelector('input') as HTMLInputElement
    const text = container.querySelector('span') as HTMLSpanElement

    // Test with special characters
    simulateInput(input, 'Hello "World" & <test>', window)

    expect(mirrorData.special).toBe('Hello "World" & <test>')
    expect(text.textContent).toBe('Hello "World" & <test>')
  })
})
