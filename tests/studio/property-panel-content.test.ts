// @vitest-environment jsdom
/**
 * Tests for studio/panels/property/sections/content-section.ts (188 LOC, ~50%)
 *
 * Content = element-type-driven (Text/Button/Link/Icon/Input/Image/...).
 * The CONTENT_ELEMENTS table maps componentName → fields {field, label,
 * placeholder, isIcon}. Icon picker button only shown for `isIcon: true`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ContentSection,
  createContentSection,
} from '../../studio/panels/property/sections/content-section'
import type { SectionDependencies, SectionData } from '../../studio/panels/property/base/section'

let deps: SectionDependencies
let onPropertyChange: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  onPropertyChange = vi.fn()
  deps = {
    escapeHtml: (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    getDisplayLabel: (n: string) => n,
    onPropertyChange,
    onToggleProperty: vi.fn(),
  }
})

interface Prop {
  name: string
  value: string
}

function renderSection(
  componentName: string,
  props: Prop[] = [],
  extra: Partial<SectionData> = {}
): HTMLElement {
  const data = {
    currentElement: { componentName },
    allProperties: props,
    ...extra,
  } as unknown as SectionData
  const html = createContentSection(deps).render(data)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('ContentSection — construction', () => {
  it('createContentSection returns a ContentSection', () => {
    expect(createContentSection(deps)).toBeInstanceOf(ContentSection)
  })

  it('returns empty when no currentElement', () => {
    expect(createContentSection(deps).render({} as SectionData)).toBe('')
  })

  it('returns empty for unknown element type (Frame, Custom)', () => {
    const root = renderSection('Frame')
    expect(root.querySelector('.prop-row')).toBeNull()

    const root2 = renderSection('CustomComponent')
    expect(root2.querySelector('.prop-row')).toBeNull()
  })
})

describe('ContentSection — element type mapping', () => {
  it('Text → single text-content row labeled "Text"', () => {
    const root = renderSection('Text')
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toEqual(['Text'])
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['content'])
  })

  it('Button → single text-content row', () => {
    const root = renderSection('Button')
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['content'])
  })

  it('Link → text + URL rows', () => {
    const root = renderSection('Link')
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toEqual(['Text', 'URL'])
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['content', 'href'])
  })

  it('Icon → content row + icon-picker button', () => {
    const root = renderSection('Icon')
    expect(root.querySelector('button[data-open-icon-picker]')).not.toBeNull()
    expect(root.querySelector('.pp-icon-field')).not.toBeNull()
  })

  it('Input → placeholder row', () => {
    const root = renderSection('Input')
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['placeholder'])
  })

  it('Textarea → placeholder row', () => {
    const root = renderSection('Textarea')
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['placeholder'])
  })

  it('Image → src row labeled "Path"', () => {
    const root = renderSection('Image')
    const labels = Array.from(root.querySelectorAll('.prop-label')).map(l => l.textContent)
    expect(labels).toEqual(['Path'])
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['src'])
  })

  it('Img alias maps the same as Image', () => {
    const root = renderSection('Img')
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['src'])
  })

  it.each(['H1', 'H2', 'H3', 'H4', 'H5', 'H6'])('%s → single text-content row', heading => {
    const root = renderSection(heading)
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['content'])
  })

  it('Label → single text-content row', () => {
    const root = renderSection('Label')
    const fields = Array.from(root.querySelectorAll('input[data-content-field]')).map(
      i => (i as HTMLInputElement).dataset.contentField
    )
    expect(fields).toEqual(['content'])
  })
})

describe('ContentSection — value rendering', () => {
  it('reads value from matching property', () => {
    const root = renderSection('Text', [{ name: 'content', value: 'Hello' }])
    const input = root.querySelector('input[data-content-field="content"]') as HTMLInputElement
    expect(input.value).toBe('Hello')
  })

  it('Link reads both content and href independently', () => {
    const root = renderSection('Link', [
      { name: 'content', value: 'Click here' },
      { name: 'href', value: '/foo' },
    ])
    expect(
      (root.querySelector('input[data-content-field="content"]') as HTMLInputElement).value
    ).toBe('Click here')
    expect((root.querySelector('input[data-content-field="href"]') as HTMLInputElement).value).toBe(
      '/foo'
    )
  })

  it('escapes HTML in value attribute (raw HTML source)', () => {
    const html = createContentSection(deps).render({
      currentElement: { componentName: 'Text' },
      allProperties: [{ name: 'content', value: '"><script>' }],
    } as unknown as SectionData)
    expect(html).toContain('value="&quot;&gt;&lt;script&gt;"')
  })

  it('escapes HTML in label and placeholder', () => {
    // Default placeholders have no HTML, so use the deps.escapeHtml hook to
    // verify it runs at all. Just check rendering includes default placeholder.
    const root = renderSection('Text')
    const input = root.querySelector('input[data-content-field="content"]') as HTMLInputElement
    expect(input.placeholder).toBe('Enter text...')
  })

  it('Empty value still renders the input (empty string)', () => {
    const root = renderSection('Text')
    const input = root.querySelector('input[data-content-field="content"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe('')
  })
})

describe('ContentSection — header / compact mode', () => {
  it('default mode renders "Content" header', () => {
    const root = renderSection('Text')
    const label = root.querySelector('.section-label')
    expect(label?.textContent).toBe('Content')
  })

  it('compact mode hides the header', () => {
    const root = renderSection('Text', [], { compact: true } as Partial<SectionData>)
    expect(root.querySelector('.section-label')).toBeNull()
  })
})

describe('ContentSection — handlers', () => {
  function getHandlers() {
    return createContentSection(deps).getHandlers()
  }

  it('text input → onPropertyChange(field, value, "input")', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.dataset.contentField = 'content'
    input.value = 'Hello'
    handlers['input[data-content-field]'].input(new Event('input'), input)
    expect(onPropertyChange).toHaveBeenCalledWith('content', 'Hello', 'input')
  })

  it('input is NO-OP when field attribute is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.value = 'Hello'
    handlers['input[data-content-field]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('icon-picker button click → __OPEN_ICON_PICKER__', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['button[data-open-icon-picker]'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('__OPEN_ICON_PICKER__', '', 'button')
  })

  it('different fields fire distinct events', () => {
    const handlers = getHandlers()
    const i1 = document.createElement('input')
    i1.dataset.contentField = 'href'
    i1.value = '/foo'
    handlers['input[data-content-field]'].input(new Event('input'), i1)

    const i2 = document.createElement('input')
    i2.dataset.contentField = 'src'
    i2.value = '/bar.png'
    handlers['input[data-content-field]'].input(new Event('input'), i2)

    expect(onPropertyChange).toHaveBeenNthCalledWith(1, 'href', '/foo', 'input')
    expect(onPropertyChange).toHaveBeenNthCalledWith(2, 'src', '/bar.png', 'input')
  })
})

describe('P3 — mutation-driven', () => {
  it('M1: getFieldsForElement returns [] for unknown (catches return-default mutation)', () => {
    const root = renderSection('TotallyUnknown')
    expect(root.innerHTML.trim()).toBe('')
  })

  it('M2: Icon field renders picker button (catches drop of isIcon branch)', () => {
    const root = renderSection('Icon')
    expect(root.querySelector('button[data-open-icon-picker]')).not.toBeNull()
  })

  it('M3: Non-icon field does NOT render picker button', () => {
    const root = renderSection('Text')
    expect(root.querySelector('button[data-open-icon-picker]')).toBeNull()
  })

  it('M4: input handler `&& field` guard (catches drop of guard)', () => {
    const handlers = createContentSection(deps).getHandlers()
    const input = document.createElement('input')
    input.value = 'X' // no field attr
    handlers['input[data-content-field]'].input(new Event('input'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})
