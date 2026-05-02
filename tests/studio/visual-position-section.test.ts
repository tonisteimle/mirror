/**
 * studio/visual/position-controls/position-section
 *
 * X/Y position input section with optional link toggle that ties the
 * two axes together. Verifies render, link-toggle behavior, and
 * proportional movement when linked.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PositionSection,
  createPositionSection,
} from '../../studio/visual/position-controls/position-section'

let container: HTMLElement
const changes: Array<{ axis: 'x' | 'y'; value: number }> = []

function makeSection(x = 10, y = 20): PositionSection {
  const section = new PositionSection()
  section.render({
    container,
    x,
    y,
    nodeId: 'test',
    onChange: (axis, value) => {
      changes.push({ axis, value })
    },
  })
  return section
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  changes.length = 0
})

describe('PositionSection — render', () => {
  it('renders header, two rows, and link button', () => {
    makeSection()
    expect(container.querySelector('.position-section')).toBeTruthy()
    expect(container.querySelector('.position-section-header')!.textContent).toBe('Position')
    expect(container.querySelectorAll('.position-row')).toHaveLength(2)
    expect(container.querySelector('.position-link-toggle')).toBeTruthy()
  })

  it('initializes inputs with given x and y', () => {
    makeSection(42, 99)
    const inputs = container.querySelectorAll<HTMLInputElement>('.numeric-input-field')
    expect(inputs[0].value).toBe('42')
    expect(inputs[1].value).toBe('99')
  })
})

describe('PositionSection — getValues / setValues', () => {
  it('round-trips programmatic values', () => {
    const s = makeSection(0, 0)
    s.setValues(5, 7)
    expect(s.getValues()).toEqual({ x: 5, y: 7 })
    const inputs = container.querySelectorAll<HTMLInputElement>('.numeric-input-field')
    expect(inputs[0].value).toBe('5')
    expect(inputs[1].value).toBe('7')
  })
})

describe('PositionSection — unlinked changes', () => {
  it('forwards x change as a single onChange call', () => {
    makeSection(10, 20)
    const xInput = container.querySelectorAll<HTMLInputElement>('.numeric-input-field')[0]
    xInput.value = '50'
    xInput.dispatchEvent(new Event('change', { bubbles: true }))
    expect(changes).toEqual([{ axis: 'x', value: 50 }])
  })
})

describe('PositionSection — link toggle + proportional moves', () => {
  it('toggles active class and applies delta to the other axis', () => {
    const s = makeSection(10, 20)
    const linkBtn = container.querySelector('.position-link-toggle') as HTMLButtonElement
    linkBtn.click()
    expect(linkBtn.classList.contains('active')).toBe(true)

    const xInput = container.querySelectorAll<HTMLInputElement>('.numeric-input-field')[0]
    xInput.value = '15' // delta 5
    xInput.dispatchEvent(new Event('change', { bubbles: true }))

    // y should move by same delta from 20 → 25 (the y onChange fires before
    // the x onChange that initiated the change)
    expect(changes).toEqual([
      { axis: 'y', value: 25 },
      { axis: 'x', value: 15 },
    ])
    expect(s.getValues()).toEqual({ x: 15, y: 25 })
  })

  it('toggling off restores independent axis movement', () => {
    const s = makeSection(0, 0)
    const linkBtn = container.querySelector('.position-link-toggle') as HTMLButtonElement
    linkBtn.click() // on
    linkBtn.click() // off
    expect(linkBtn.classList.contains('active')).toBe(false)

    const yInput = container.querySelectorAll<HTMLInputElement>('.numeric-input-field')[1]
    yInput.value = '7'
    yInput.dispatchEvent(new Event('change', { bubbles: true }))
    expect(changes).toEqual([{ axis: 'y', value: 7 }])
    expect(s.getValues()).toEqual({ x: 0, y: 7 })
  })
})

describe('PositionSection — dispose + factory', () => {
  it('dispose removes the element', () => {
    const s = makeSection()
    expect(container.querySelector('.position-section')).toBeTruthy()
    s.dispose()
    expect(container.querySelector('.position-section')).toBeNull()
  })

  it('factory returns a fresh instance', () => {
    const a = createPositionSection()
    const b = createPositionSection()
    expect(a).not.toBe(b)
    expect(a).toBeInstanceOf(PositionSection)
  })
})
