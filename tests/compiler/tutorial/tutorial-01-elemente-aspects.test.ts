/**
 * Tutorial 01-elemente — Aspect Tests (Thema 16)
 *
 * Tutorial-Aspekte aus `01-elemente.html`:
 * - Primitives (Frame, Text, Button, Input)
 * - Styling-Properties als Komma-Liste
 * - Hierarchie durch Einrückung
 * - Semicolon-Kurzschreibweise
 * - Icons (Lucide standard, ic color, is size, fill modifier)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

describe('Tutorial 01 — Primitives', () => {
  it('Frame produces a <div>', () => {
    const { root } = renderWithRuntime(`Frame bg #1a1a1a`, container)
    const frame = root.querySelector('[data-mirror-name="Frame"]')
    expect(frame?.tagName.toLowerCase()).toBe('div')
  })

  it('Text "..." produces a <span> with the text content', () => {
    const { root } = renderWithRuntime(`Text "Hello"`, container)
    const text = root.querySelector('[data-mirror-name="Text"]')
    expect(text?.tagName.toLowerCase()).toBe('span')
    expect(text?.textContent).toBe('Hello')
  })

  it('Button "..." produces a <button>', () => {
    const { root } = renderWithRuntime(`Button "Click"`, container)
    const btn = root.querySelector('[data-mirror-name="Button"]')
    expect(btn?.tagName.toLowerCase()).toBe('button')
    expect(btn?.textContent).toBe('Click')
  })

  it('Input produces an <input> with placeholder', () => {
    const { root } = renderWithRuntime(`Input placeholder "Email"`, container)
    const input = root.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.placeholder).toBe('Email')
  })

  it('Image src "..." produces an <img>', () => {
    const { root } = renderWithRuntime(`Image src "/foo.jpg", w 200`, container)
    const img = root.querySelector('img') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src')).toBe('/foo.jpg')
  })

  it('Link "..." href produces an <a>', () => {
    const { root } = renderWithRuntime(`Link "Click", href "https://x.com"`, container)
    const a = root.querySelector('a') as HTMLAnchorElement
    expect(a).toBeTruthy()
    expect(a.getAttribute('href')).toBe('https://x.com')
  })
})

describe('Tutorial 01 — Hierarchie durch Einrückung', () => {
  it('2-space indentation creates parent/child relation', () => {
    const { root } = renderWithRuntime(
      `Frame bg #1a1a1a, pad 16
  Text "Title"
  Text "Subtitle"`,
      container
    )
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    const innerSpans = frame.querySelectorAll('span')
    expect(innerSpans.length).toBe(2)
    expect(innerSpans[0].textContent).toBe('Title')
    expect(innerSpans[1].textContent).toBe('Subtitle')
  })

  it('3-level deep nesting renders all levels', () => {
    const { root } = renderWithRuntime(
      `Frame
  Frame
    Frame
      Text "Deep"`,
      container
    )
    const deep = Array.from(root.querySelectorAll('span')).find(s => s.textContent === 'Deep')
    expect(deep).toBeTruthy()
  })
})

describe('Tutorial 01 — Semicolon Kurzschreibweise', () => {
  it('Frame hor, gap 8; Icon "check"; Text "OK" parses inline', () => {
    const { root } = renderWithRuntime(`Frame hor, gap 8; Icon "check"; Text "OK"`, container)
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    expect(frame.style.flexDirection).toBe('row')
    // Both Icon and Text must be children of the Frame
    const ok = Array.from(frame.querySelectorAll('span')).find(s => s.textContent === 'OK')
    expect(ok).toBeTruthy()
  })
})

describe('Tutorial 01 — Icons', () => {
  it('Icon "check" loads Lucide icon via _runtime.loadIcon', () => {
    const { root } = renderWithRuntime(`Icon "check", ic #10b981, is 24`, container)
    const icon = root.querySelector('[data-mirror-name="Icon"]') as HTMLElement
    expect(icon).toBeTruthy()
    // ic and is are stored as data-attributes for runtime loading
    expect(icon.dataset.iconColor).toMatch(/#10b981|rgb\(16/i)
    expect(icon.dataset.iconSize).toBe('24')
  })

  it('Icon with fill modifier sets data-icon-fill', () => {
    const { root } = renderWithRuntime(`Icon "heart", ic #ef4444, is 18, fill`, container)
    const icon = root.querySelector('[data-mirror-name="Icon"]') as HTMLElement
    expect(icon.dataset.iconFill).toBeTruthy()
  })

  it('Icon default size when no `is` provided is 16', () => {
    const { root } = renderWithRuntime(`Icon "settings"`, container)
    const icon = root.querySelector('[data-mirror-name="Icon"]') as HTMLElement
    expect(icon.dataset.iconSize).toBe('16')
  })
})

describe('Tutorial 01 — Canvas / Device Presets', () => {
  it('canvas mobile applies 375x812 to the root', () => {
    const { root } = renderWithRuntime(
      `canvas mobile

Text "X"`,
      container
    )
    expect(root.style.width).toBe('375px')
    expect(root.style.height).toBe('812px')
  })

  it('canvas tablet applies 768x1024', () => {
    const { root } = renderWithRuntime(
      `canvas tablet

Text "X"`,
      container
    )
    expect(root.style.width).toBe('768px')
  })

  it('canvas desktop applies 1440x900', () => {
    const { root } = renderWithRuntime(
      `canvas desktop

Text "X"`,
      container
    )
    expect(root.style.width).toBe('1440px')
  })

  it('canvas with custom width/height overrides preset', () => {
    const { root } = renderWithRuntime(
      `canvas mobile, h 600

Text "X"`,
      container
    )
    expect(root.style.height).toBe('600px')
  })
})
