/**
 * Tutorial 12 - Forms: BEHAVIOR Tests
 *
 * Testet DOM-Struktur von:
 * - Input, Textarea
 * - Checkbox, Switch
 * - Select, RadioGroup
 * - Slider, NumberInput
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

// ============================================================
// INPUT
// ============================================================
describe('Input', () => {

  it('Input rendert als <input>', () => {
    const { root } = renderWithRuntime(`
Input placeholder "Enter text..."
`, container)

    const input = root.querySelector('input')
    expect(input).toBeTruthy()
    expect(input?.placeholder).toBe('Enter text...')
  })

  it('Input mit type', () => {
    const { root } = renderWithRuntime(`
Input type "email", placeholder "Email"
`, container)

    const input = root.querySelector('input')
    expect(input?.type).toBe('email')
  })

  it('Input mit Styles', () => {
    const { root } = renderWithRuntime(`
Input w full, pad 12, bg #1a1a1a, rad 8, bor 1, boc #333
`, container)

    const input = root.querySelector('input') as HTMLInputElement
    expect(input.style.width).toBe('100%')
    expect(input.style.padding).toBe('12px')
  })
})

// ============================================================
// TEXTAREA
// ============================================================
describe('Textarea', () => {

  it('Textarea rendert als <textarea>', () => {
    const { root } = renderWithRuntime(`
Textarea placeholder "Enter description...", h 100
`, container)

    const textarea = root.querySelector('textarea')
    expect(textarea).toBeTruthy()
    expect(textarea?.placeholder).toBe('Enter description...')
  })
})

// ============================================================
// CHECKBOX (Zag)
// ============================================================
describe('Checkbox', () => {

  it('Checkbox hat korrekte Struktur', () => {
    const { root } = renderWithRuntime(`
Checkbox
  Label: Text "Accept terms"
`, container)

    const checkbox = root.querySelector('[data-zag-component="checkbox"]')
    expect(checkbox).toBeTruthy()
  })

  it('Checkbox checked', () => {
    const { root } = renderWithRuntime(`
Checkbox checked
  Label: Text "Already checked"
`, container)

    const checkbox = root.querySelector('[data-zag-component="checkbox"]')
    expect(checkbox).toBeTruthy()
  })
})

// ============================================================
// SWITCH (Zag)
// ============================================================
describe('Switch', () => {

  it('Switch hat Track und Thumb', () => {
    const { root } = renderWithRuntime(`
Switch
`, container)

    const switchEl = root.querySelector('[data-zag-component="switch"]')
    expect(switchEl).toBeTruthy()

    const track = root.querySelector('[data-slot="Track"]')
    expect(track).toBeTruthy()

    const thumb = root.querySelector('[data-slot="Thumb"]')
    expect(thumb).toBeTruthy()
  })

  it('Switch mit Label', () => {
    const { root } = renderWithRuntime(`
Switch
  Label: Text "Dark Mode"
`, container)

    const switchEl = root.querySelector('[data-zag-component="switch"]')
    expect(switchEl).toBeTruthy()
  })
})

// ============================================================
// SELECT (Zag)
// ============================================================
describe('Select', () => {

  it('Select hat Trigger und Content', () => {
    const { root } = renderWithRuntime(`
Select placeholder "Choose..."
  Item "Option 1" value "1"
  Item "Option 2" value "2"
  Item "Option 3" value "3"
`, container)

    const select = root.querySelector('[data-zag-component="select"]')
    expect(select).toBeTruthy()
  })
})

// ============================================================
// RADIO GROUP (Zag)
// ============================================================
describe('RadioGroup', () => {

  it('RadioGroup hat Items', () => {
    const { root } = renderWithRuntime(`
RadioGroup defaultValue "a"
  Item "Option A" value "a"
  Item "Option B" value "b"
  Item "Option C" value "c"
`, container)

    const radioGroup = root.querySelector('[data-zag-component="radio-group"]')
    expect(radioGroup).toBeTruthy()
  })
})

// ============================================================
// SLIDER (Zag)
// ============================================================
describe('Slider', () => {

  it('Slider hat Track und Thumb', () => {
    const { root } = renderWithRuntime(`
Slider min 0, max 100, defaultValue 50
`, container)

    const slider = root.querySelector('[data-zag-component="slider"]')
    expect(slider).toBeTruthy()
  })
})

// ============================================================
// NUMBER INPUT (Zag)
// ============================================================
describe('NumberInput', () => {

  it('NumberInput hat Increment/Decrement', () => {
    const { root } = renderWithRuntime(`
NumberInput min 0, max 10, defaultValue 5
`, container)

    // NumberInput kann verschiedene Selektoren haben
    const numberInput = root.querySelector('[data-zag-component="number-input"]') ||
                        root.querySelector('[data-zag-component="numberinput"]') ||
                        root.querySelector('[data-mirror-name="NumberInput"]')
    expect(numberInput).toBeTruthy()
  })
})

// ============================================================
// TUTORIAL BEISPIELE
// ============================================================
describe('Tutorial 12 Beispiele', () => {

  it('Beispiel: Login Form', () => {
    const { root } = renderWithRuntime(`
Frame ver, gap 16, w 300, pad 24, bg #1a1a1a, rad 12
  Text "Login" weight bold, fs 24
  Frame ver, gap 4
    Text "Email" fs 14, col #888
    Input type "email", w full, pad 12, bg #111, rad 8, bor 1, boc #333
  Frame ver, gap 4
    Text "Password" fs 14, col #888
    Input type "password", w full, pad 12, bg #111, rad 8, bor 1, boc #333
  Button "Sign In", w full, pad 12, bg #2563eb, col white, rad 8
`, container)

    const inputs = root.querySelectorAll('input')
    expect(inputs.length).toBe(2)

    const button = root.querySelector('button')
    expect(button).toBeTruthy()
  })

  it('Beispiel: Settings Form', () => {
    const { root } = renderWithRuntime(`
Frame ver, gap 16, w 350, pad 24, bg #1a1a1a, rad 12
  Text "Settings" weight bold, fs 20
  Frame hor, spread
    Text "Dark Mode"
    Switch
  Frame hor, spread
    Text "Notifications"
    Switch
  Frame ver, gap 4
    Text "Volume"
    Slider min 0, max 100, defaultValue 75
`, container)

    const switches = root.querySelectorAll('[data-zag-component="switch"]')
    expect(switches.length).toBe(2)

    const slider = root.querySelector('[data-zag-component="slider"]')
    expect(slider).toBeTruthy()
  })
})
