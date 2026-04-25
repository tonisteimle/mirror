/**
 * Tutorial 11-eingabe — Aspect Tests (Thema 14)
 *
 * Tutorial-Aspekte aus `11-eingabe.html`:
 * - Input (placeholder, type, disabled)
 * - Textarea (placeholder, value, h)
 * - Checkbox / Switch (checked, disabled, label)
 * - Select / Item (placeholder, value)
 * - Two-Way Binding (Input bind, Select bind)
 * - Slider (value, min, max, step, bind)
 * - RadioGroup / RadioItem (value, bind)
 * - Login-Formular (mehrere bind, type, disabled)
 * - Input Mask (Pattern, mask + bind)
 *
 * Verhaltens-Tests mit `renderWithRuntime`. Mask-Tests prüfen den
 * generierten Code (`_runtime.applyMask`-Calls), da jsdom keine
 * Selection-API hat.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../../compiler/parser'
import { generateDOM } from '../../../compiler/backends/dom'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

// =============================================================================
// Input
// =============================================================================

describe('Tutorial 11 — Input', () => {
  it('Input placeholder produces <input> with placeholder attribute', () => {
    const { root } = renderWithRuntime(`Input placeholder "Name eingeben..."`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.placeholder).toBe('Name eingeben...')
  })

  it('Input type "email" sets type="email"', () => {
    const { root } = renderWithRuntime(`Input placeholder "Mail", type "email"`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('type')).toBe('email')
  })

  it('Input type "password" sets type="password"', () => {
    const { root } = renderWithRuntime(`Input placeholder "Pwd", type "password"`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('type')).toBe('password')
  })

  it('Input type "number" sets type="number"', () => {
    const { root } = renderWithRuntime(`Input placeholder "N", type "number"`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.getAttribute('type')).toBe('number')
  })

  it('Input disabled marks input as disabled', () => {
    const { root } = renderWithRuntime(`Input placeholder "X", disabled`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})

// =============================================================================
// Textarea
// =============================================================================

describe('Tutorial 11 — Textarea', () => {
  it('Textarea produces <textarea> with placeholder', () => {
    const { root } = renderWithRuntime(`Textarea placeholder "Deine Nachricht...", h 80`, container)
    const ta = root.querySelector('textarea') as HTMLTextAreaElement
    expect(ta).toBeTruthy()
    expect(ta.placeholder).toBe('Deine Nachricht...')
  })

  it('Textarea h 80 sets height to 80px', () => {
    const { root } = renderWithRuntime(`Textarea placeholder "X", h 80`, container)
    const ta = root.querySelector('textarea') as HTMLTextAreaElement
    expect(ta.style.height).toBe('80px')
  })

  it('Textarea value sets initial content', () => {
    const { root } = renderWithRuntime(
      `Textarea placeholder "X", value "Initial Text", h 80`,
      container
    )
    const ta = root.querySelector('textarea') as HTMLTextAreaElement
    // Value either as attribute or property — both are acceptable
    const v = ta.value || ta.getAttribute('value')
    expect(v).toBe('Initial Text')
  })
})

// =============================================================================
// Checkbox / Switch
// =============================================================================

describe('Tutorial 11 — Checkbox & Switch', () => {
  it('Checkbox "Label" carries the label as text', () => {
    const { root } = renderWithRuntime(`Checkbox "Newsletter abonnieren"`, container)
    const cb = root.querySelector('[data-mirror-name="Checkbox"]') as HTMLElement
    expect(cb).toBeTruthy()
    expect(cb.textContent).toContain('Newsletter abonnieren')
  })

  it('Checkbox checked marks initial state', () => {
    const { root } = renderWithRuntime(`Checkbox "AGB akzeptieren", checked`, container)
    const cb = root.querySelector('[data-mirror-name="Checkbox"]') as HTMLElement
    // Either attribute on outer div, or as data
    const hasChecked = cb.hasAttribute('checked') || cb.dataset.checked === 'true'
    expect(hasChecked).toBe(true)
  })

  it('Switch "Label" carries the label as text', () => {
    const { root } = renderWithRuntime(`Switch "Dark Mode"`, container)
    const sw = root.querySelector('[data-mirror-name="Switch"]') as HTMLElement
    expect(sw).toBeTruthy()
    expect(sw.textContent).toContain('Dark Mode')
  })

  it('Switch disabled is visually disabled (opacity reduced)', () => {
    const { root } = renderWithRuntime(`Switch "Premium", disabled`, container)
    const sw = root.querySelector('[data-mirror-name="Switch"]') as HTMLElement
    expect(sw.style.opacity).toBe('0.5')
  })
})

// =============================================================================
// Select
// =============================================================================

describe('Tutorial 11 — Select', () => {
  it('Select with placeholder + Items renders a Select container with each Item', () => {
    const { root } = renderWithRuntime(
      `Select placeholder "Stadt wählen..."
  Item "Berlin"
  Item "Hamburg"
  Item "München"`,
      container
    )
    const sel = root.querySelector('[data-mirror-name="Select"]') as HTMLElement
    expect(sel).toBeTruthy()
    expect(sel.getAttribute('placeholder')).toBe('Stadt wählen...')
    const items = sel.querySelectorAll('[data-mirror-name="Item"]')
    expect(items.length).toBe(3)
    expect(items[0].textContent).toContain('Berlin')
  })

  it('Item with explicit value attribute', () => {
    const { root } = renderWithRuntime(
      `Select placeholder "Status..."
  Item "In Bearbeitung", value "in_progress"
  Item "Done", value "done"`,
      container
    )
    const items = root.querySelectorAll('[data-mirror-name="Item"]')
    expect(items[0].getAttribute('value')).toBe('in_progress')
    expect(items[1].getAttribute('value')).toBe('done')
  })
})

// =============================================================================
// Two-Way Binding
// =============================================================================

describe('Tutorial 11 — Two-Way Binding', () => {
  it('Input bind X marks the input with data-bind="X"', () => {
    const { root } = renderWithRuntime(
      `searchTerm: ""

Input bind searchTerm, placeholder "Suchen..."`,
      container
    )
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.dataset.bind).toBe('searchTerm')
  })

  it('Input bind initial value reflects the variable default', () => {
    const { root } = renderWithRuntime(
      `searchTerm: "Hallo"

Input bind searchTerm`,
      container
    )
    const input = root.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('Hallo')
  })

  it('Input bind: typing updates the global mirror data store', () => {
    const { root } = renderWithRuntime(
      `email: ""

Input bind email, placeholder "Mail"`,
      container
    )
    const input = root.querySelector('input') as HTMLInputElement
    input.value = 'foo@bar.com'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    // Two-way binding stores the value back in the global data store
    expect((window as any).__mirrorData?.email).toBe('foo@bar.com')
  })

  it('Select bind X marks the Select with data-bind="X"', () => {
    const { root } = renderWithRuntime(
      `selectedCity: ""

Select bind selectedCity, placeholder "..."
  Item "Berlin"
  Item "Hamburg"`,
      container
    )
    const sel = root.querySelector('[data-mirror-name="Select"]') as HTMLElement
    expect(sel.dataset.bind).toBe('selectedCity')
  })
})

// =============================================================================
// Slider
// =============================================================================

describe('Tutorial 11 — Slider', () => {
  it('Slider renders a Slider container', () => {
    const { root } = renderWithRuntime(`Slider value 50, min 0, max 100`, container)
    const sl = root.querySelector('[data-mirror-name="Slider"]') as HTMLElement
    expect(sl).toBeTruthy()
  })

  it('Slider value is reflected as attribute', () => {
    const { root } = renderWithRuntime(`Slider value 50, min 0, max 100`, container)
    const sl = root.querySelector('[data-mirror-name="Slider"]') as HTMLElement
    expect(sl.getAttribute('value')).toBe('50')
  })

  it('Slider bind X marks the Slider with data-bind="X"', () => {
    const { root } = renderWithRuntime(
      `volume: 30

Slider bind volume, min 0, max 100`,
      container
    )
    const sl = root.querySelector('[data-mirror-name="Slider"]') as HTMLElement
    expect(sl.dataset.bind).toBe('volume')
  })

  it('Slider min/max/step are emitted as HTML attributes', () => {
    const { root } = renderWithRuntime(`Slider value 50, min 0, max 100, step 5`, container)
    const sl = root.querySelector('[data-mirror-name="Slider"]') as HTMLElement
    expect(sl.getAttribute('min')).toBe('0')
    expect(sl.getAttribute('max')).toBe('100')
    expect(sl.getAttribute('step')).toBe('5')
  })
})

// =============================================================================
// RadioGroup
// =============================================================================

describe('Tutorial 11 — RadioGroup', () => {
  it('RadioGroup with RadioItems renders all options', () => {
    const { root } = renderWithRuntime(
      `RadioGroup value "monthly"
  RadioItem "Monatlich – €9/Monat", value "monthly"
  RadioItem "Jährlich – €99/Jahr", value "yearly"
  RadioItem "Lifetime – €299", value "lifetime"`,
      container
    )
    const grp = root.querySelector('[data-mirror-name="RadioGroup"]') as HTMLElement
    expect(grp).toBeTruthy()
    const items = grp.querySelectorAll('[data-mirror-name="RadioItem"]')
    expect(items.length).toBe(3)
  })

  it('RadioGroup value attribute stores the initial selection', () => {
    const { root } = renderWithRuntime(
      `RadioGroup value "monthly"
  RadioItem "Monatlich", value "monthly"`,
      container
    )
    const grp = root.querySelector('[data-mirror-name="RadioGroup"]') as HTMLElement
    expect(grp.getAttribute('value')).toBe('monthly')
  })

  it('RadioItem value attribute stores the option value', () => {
    const { root } = renderWithRuntime(
      `RadioGroup value "monthly"
  RadioItem "Yearly", value "yearly"`,
      container
    )
    const item = root.querySelector('[data-mirror-name="RadioItem"]') as HTMLElement
    expect(item.getAttribute('value')).toBe('yearly')
    expect(item.textContent).toContain('Yearly')
  })

  it('RadioGroup bind X marks the group with data-bind="X"', () => {
    const { root } = renderWithRuntime(
      `plan: "monthly"

RadioGroup bind plan
  RadioItem "Monatlich", value "monthly"
  RadioItem "Jährlich", value "yearly"`,
      container
    )
    const grp = root.querySelector('[data-mirror-name="RadioGroup"]') as HTMLElement
    expect(grp.dataset.bind).toBe('plan')
  })
})

// =============================================================================
// Praxis: Login-Formular
// =============================================================================

describe('Tutorial 11 — Login-Formular', () => {
  it('combines two bound inputs and a Checkbox (variant without name collision)', () => {
    // Use mail/pwd as variable names to avoid the email/password collision —
    // see the it.todo below.
    const { root } = renderWithRuntime(
      `mail: ""
pwd: ""

Frame gap 16, w 300, bg #1a1a1a, pad 24, rad 12
  Text "Anmelden", fs 20, weight bold, col white
  Frame gap 4
    Text "E-Mail", fs 12, col #888
    Input bind mail, placeholder "name@example.com", type "email"
  Frame gap 4
    Text "Passwort", fs 12, col #888
    Input bind pwd, placeholder "••••••••", type "password"
  Checkbox "Angemeldet bleiben"
  Button "Anmelden", w full, pad 12, bg #2271C1, col white, rad 6`,
      container
    )

    const inputs = root.querySelectorAll('input')
    expect(inputs.length).toBe(2)
    expect(inputs[0].dataset.bind).toBe('mail')
    expect(inputs[0].getAttribute('type')).toBe('email')
    expect(inputs[1].dataset.bind).toBe('pwd')
    expect(inputs[1].getAttribute('type')).toBe('password')

    const cb = root.querySelector('[data-mirror-name="Checkbox"]') as HTMLElement
    expect(cb.textContent).toContain('Angemeldet bleiben')

    const btn = root.querySelector('button') as HTMLButtonElement
    expect(btn.textContent).toContain('Anmelden')
  })

  it('Tutorial Login-Formular as-is (email variable name + type "email")', () => {
    // Bug fixed 2026-04-25: HTML attribute resolution now skips string-token
    // substitution. Variables named like literal strings used as type/
    // placeholder/name/href/src no longer collide.
    const { root } = renderWithRuntime(
      `email: ""
password: ""

Frame
  Input bind email, type "email"
  Input bind password, type "password"`,
      container
    )
    const inputs = root.querySelectorAll('input')
    expect(inputs[0].getAttribute('type')).toBe('email')
    expect(inputs[1].getAttribute('type')).toBe('password')
  })
})

// =============================================================================
// Input Mask
// =============================================================================

describe('Tutorial 11 — Input Mask', () => {
  it('Input mask emits _runtime.applyMask with the pattern', () => {
    const ast = parse(`Input mask "###.####.####.##", placeholder "AHV"`)
    const code = generateDOM(ast)
    expect(code).toMatch(/_runtime\.applyMask\(\s*node_\d+\s*,\s*"###\.####\.####\.##"\s*\)/)
  })

  it('Input mask phone pattern compiles', () => {
    const ast = parse(`Input mask "(###) ###-####", placeholder "Phone"`)
    const code = generateDOM(ast)
    expect(code).toMatch(/_runtime\.applyMask\(\s*node_\d+\s*,\s*"\(###\)/)
  })

  it('Input mask date pattern compiles', () => {
    const ast = parse(`Input mask "####-##-##", placeholder "Datum"`)
    const code = generateDOM(ast)
    expect(code).toContain('_runtime.applyMask')
    expect(code).toContain('"####-##-##"')
  })

  it('Input mask + bind emits BOTH applyMask AND bindValue', () => {
    const ast = parse(`ahv: ""

Input mask "###.####.####.##", bind ahv, placeholder "AHV"`)
    const code = generateDOM(ast)
    expect(code).toContain('_runtime.applyMask')
    expect(code).toContain('_runtime.bindValue')
    expect(code).toContain('"ahv"')
  })

  it('formatWithMask returns formatted string for raw digits', async () => {
    // Direct test against the runtime fn — verifies the # pattern char
    const { formatWithMask } = await import('../../../compiler/runtime/input-mask')
    expect(formatWithMask('756123456790', '###.####.####.##')).toBe('756.1234.5679.0')
  })

  it('formatWithMask supports A pattern (letters only)', async () => {
    const { formatWithMask } = await import('../../../compiler/runtime/input-mask')
    expect(formatWithMask('ABC123', 'AAA-###')).toBe('ABC-123')
  })

  it('formatWithMask blocks invalid chars (digits in A slot)', async () => {
    const { formatWithMask } = await import('../../../compiler/runtime/input-mask')
    // "1A2B3C" — # accepts digits, so first 3 digits keep, then nothing left for A?
    // For pattern "AAA-###" the input "ABC123" gives "ABC-123", but "12345"
    // can't fill A slots — they get skipped.
    const out = await import('../../../compiler/runtime/input-mask')
    expect(out.formatWithMask('12345', 'AAA-###')).toBe('')
  })

  it('formatWithMask supports * pattern (alphanumeric)', async () => {
    const { formatWithMask } = await import('../../../compiler/runtime/input-mask')
    expect(formatWithMask('A1B2', '****')).toBe('A1B2')
  })

  it('getRawValue strips formatting characters', async () => {
    const { getRawValue } = await import('../../../compiler/runtime/input-mask')
    // "756.1234.5678.90" → 13 digits, all kept
    expect(getRawValue('756.1234.5678.90', '###.####.####.##')).toBe('7561234567890')
    expect(getRawValue('(079) 123-4567', '(###) ###-####')).toBe('0791234567')
  })
})
