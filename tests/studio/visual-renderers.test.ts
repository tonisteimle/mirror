// @vitest-environment jsdom
/**
 * Tests for studio/visual/ DOM-renderer modules:
 *   - overlay-manager.ts (299 LOC) — visual overlay layer (resize handles,
 *     drop zones, semantic dots, sibling line, zone indicator, size badge)
 *   - draw-rect-renderer.ts (104 LOC) — click-to-draw live rectangle preview
 *   - smart-guides/guide-renderer.ts (98 LOC) — smart-guide line rendering
 *
 * Skipped (deeply state-coupled, covered indirectly by browser tests):
 *   padding-manager, margin-manager, gap-manager, resize-manager,
 *   draw-manager — pure helpers extracted from these are in VIS-QP-1/2.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { OverlayManager, createOverlayManager } from '../../studio/visual/overlay-manager'
import { DrawRectRenderer } from '../../studio/visual/draw-rect-renderer'
import { GuideRenderer, createGuideRenderer } from '../../studio/visual/smart-guides/guide-renderer'
import type { Guide } from '../../studio/visual/smart-guides/types'

let container: HTMLElement

beforeEach(() => {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
})

// =============================================================================
// OverlayManager
// =============================================================================

describe('OverlayManager — construction', () => {
  it('createOverlayManager returns an OverlayManager', () => {
    expect(createOverlayManager({ container })).toBeInstanceOf(OverlayManager)
  })

  it('appends a .visual-overlay element to the container', () => {
    new OverlayManager({ container })
    expect(container.querySelector('.visual-overlay')).not.toBeNull()
  })

  it('jsdom: getComputedStyle.position returns empty (NOT "static") — branch untested in jsdom', () => {
    // In real browsers, default position is 'static' and the constructor
    // upgrades to 'relative'. In jsdom getComputedStyle returns '' so the
    // branch never fires. Real-browser coverage via studio/test-api.
    new OverlayManager({ container })
    // Either '' (unchanged) or 'relative' (upgraded) — both ok for jsdom.
    expect(['', 'relative']).toContain(container.style.position)
  })

  it('does NOT touch container.style.position if already non-static', () => {
    container.style.position = 'absolute'
    new OverlayManager({ container })
    expect(container.style.position).toBe('absolute')
  })

  it('overlay contains all 6 inner sections', () => {
    new OverlayManager({ container })
    const o = container.querySelector('.visual-overlay')!
    expect(o.querySelector('.resize-handles')).not.toBeNull()
    expect(o.querySelector('.drop-zone-highlight')).not.toBeNull()
    expect(o.querySelector('.semantic-dots')).not.toBeNull()
    expect(o.querySelector('.sibling-line')).not.toBeNull()
    expect(o.querySelector('.zone-indicator')).not.toBeNull()
    expect(o.querySelector('.size-indicator')).not.toBeNull()
  })
})

describe('OverlayManager — ensureOverlay', () => {
  it('re-appends overlay if container.innerHTML was cleared', () => {
    const m = new OverlayManager({ container })
    container.innerHTML = '' // simulate compile reset
    m.ensureOverlay()
    expect(container.querySelector('.visual-overlay')).not.toBeNull()
  })

  it('re-initializes pooled dots after re-append (Q5: leaks old dots)', () => {
    // Q5 finding: ensureOverlay re-appends the same `this.overlay` element
    // which still contains the OLD pool. Then initializeDots adds 9 new
    // dots → 18 total. The pool reference is fresh but the DOM has both
    // sets. Probably benign since both sets carry the right active class
    // semantics, but worth flagging.
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, null)
    container.innerHTML = ''
    m.ensureOverlay()
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, null)
    // Currently: 18 (old + new). Test pinned to the actual behavior so
    // a future cleanup will fail and prompt review.
    expect(container.querySelectorAll('.zone-dot').length).toBe(18)
  })
})

describe('OverlayManager — Resize handles', () => {
  it('getResizeHandlesContainer returns the .resize-handles element', () => {
    const m = new OverlayManager({ container })
    expect(m.getResizeHandlesContainer().className).toBe('resize-handles')
  })

  it('clearResizeHandles empties the container', () => {
    const m = new OverlayManager({ container })
    const handlesEl = m.getResizeHandlesContainer()
    handlesEl.appendChild(document.createElement('div'))
    expect(handlesEl.children.length).toBe(1)
    m.clearResizeHandles()
    expect(handlesEl.children.length).toBe(0)
  })
})

describe('OverlayManager — Size indicator', () => {
  it('show: sets text + position + display:block', () => {
    const m = new OverlayManager({ container })
    m.showSizeIndicator(100, 200, '300', '400')
    const el = container.querySelector('.size-indicator') as HTMLElement
    expect(el.textContent).toBe('300 × 400')
    expect(el.style.left).toBe('100px')
    expect(el.style.top).toBe('200px')
    expect(el.style.display).toBe('block')
  })

  it('hide: sets display:none', () => {
    const m = new OverlayManager({ container })
    m.showSizeIndicator(0, 0, '10', '10')
    m.hideSizeIndicator()
    const el = container.querySelector('.size-indicator') as HTMLElement
    expect(el.style.display).toBe('none')
  })
})

describe('OverlayManager — Drop zone (deprecated, kept for API compat)', () => {
  it('show/hide are no-ops (no DOM change to drop-zone-highlight)', () => {
    const m = new OverlayManager({ container })
    const before = (container.querySelector('.drop-zone-highlight') as HTMLElement).getAttribute(
      'style'
    )
    m.showDropZone({ left: 0, top: 0, width: 100, height: 100 })
    m.hideDropZone()
    const after = (container.querySelector('.drop-zone-highlight') as HTMLElement).getAttribute(
      'style'
    )
    expect(after).toBe(before)
  })
})

describe('OverlayManager — Semantic dots', () => {
  it('show: creates 9 .zone-dot children (one per zone)', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 200, height: 200 }, null)
    expect(container.querySelectorAll('.zone-dot').length).toBe(9)
  })

  it('show: sets position + dimensions on .semantic-dots', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 50, top: 60, width: 200, height: 100 }, null)
    const dots = container.querySelector('.semantic-dots') as HTMLElement
    expect(dots.style.left).toBe('50px')
    expect(dots.style.top).toBe('60px')
    expect(dots.style.width).toBe('200px')
    expect(dots.style.height).toBe('100px')
    expect(dots.style.display).toBe('block')
  })

  it('show: marks active zone dot with .active class', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'top-center')
    const active = container.querySelector('.zone-dot.active') as HTMLElement
    expect(active?.dataset.zone).toBe('top-center')
  })

  it('show: only one dot active at a time', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'top-left')
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'bottom-right')
    expect(container.querySelectorAll('.zone-dot.active').length).toBe(1)
  })

  it('show: null active zone → no dot has active class', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, null)
    expect(container.querySelectorAll('.zone-dot.active').length).toBe(0)
  })

  it('hide: sets display:none but PRESERVES pooled dots', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, null)
    m.hideSemanticDots()
    const dots = container.querySelector('.semantic-dots') as HTMLElement
    expect(dots.style.display).toBe('none')
    expect(container.querySelectorAll('.zone-dot').length).toBe(9) // pool kept
  })

  it('multiple show calls reuse the SAME pooled dot elements', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, null)
    const firstSet = Array.from(container.querySelectorAll('.zone-dot'))
    m.showSemanticDots({ left: 50, top: 50, width: 100, height: 100 }, null)
    const secondSet = Array.from(container.querySelectorAll('.zone-dot'))
    expect(firstSet).toEqual(secondSet) // same DOM nodes, no recreation
  })
})

describe('OverlayManager — Sibling line', () => {
  it('horizontal direction + before: vertical line on left edge', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 100, top: 50, width: 80, height: 60 }, 'before', 'horizontal')
    const el = container.querySelector('.sibling-line') as HTMLElement
    expect(el.style.left).toBe('98px') // left - 2
    expect(el.style.top).toBe('50px')
    expect(el.style.width).toBe('4px')
    expect(el.style.height).toBe('60px')
  })

  it('horizontal direction + after: vertical line on right edge', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 100, top: 50, width: 80, height: 60 }, 'after', 'horizontal')
    const el = container.querySelector('.sibling-line') as HTMLElement
    expect(el.style.left).toBe('178px') // left + width - 2
    expect(el.style.height).toBe('60px')
  })

  it('vertical direction + before: horizontal line on top edge', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 100, top: 50, width: 80, height: 60 }, 'before', 'vertical')
    const el = container.querySelector('.sibling-line') as HTMLElement
    expect(el.style.top).toBe('48px') // top - 2
    expect(el.style.width).toBe('80px')
    expect(el.style.height).toBe('4px')
  })

  it('vertical direction + after: horizontal line on bottom edge', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 100, top: 50, width: 80, height: 60 }, 'after', 'vertical')
    const el = container.querySelector('.sibling-line') as HTMLElement
    expect(el.style.top).toBe('108px') // top + height - 2
  })

  it('hide: sets display:none', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 0, top: 0, width: 10, height: 10 }, 'before', 'horizontal')
    m.hideSiblingLine()
    expect((container.querySelector('.sibling-line') as HTMLElement).style.display).toBe('none')
  })
})

describe('OverlayManager — Zone indicator', () => {
  it('show: composes "Container | Zone" text + adds visible class', () => {
    const m = new OverlayManager({ container })
    m.showZoneIndicator('Card', 'top-left')
    const ind = container.querySelector('.zone-indicator') as HTMLElement
    expect(ind.querySelector('.zone-name')?.textContent).toBe('Card | top-left')
    expect(ind.classList.contains('visible')).toBe(true)
  })

  it('hide: removes visible class', () => {
    const m = new OverlayManager({ container })
    m.showZoneIndicator('Card', 'top-left')
    m.hideZoneIndicator()
    expect(container.querySelector('.zone-indicator')!.classList.contains('visible')).toBe(false)
  })
})

describe('OverlayManager — hideAll + dispose', () => {
  it('hideAll runs every hide-* method', () => {
    const m = new OverlayManager({ container })
    m.showSizeIndicator(0, 0, '1', '1')
    m.showSiblingLine({ left: 0, top: 0, width: 1, height: 1 }, 'before', 'horizontal')
    m.showSemanticDots({ left: 0, top: 0, width: 1, height: 1 }, null)
    m.showZoneIndicator('A', 'B')
    m.hideAll()
    expect((container.querySelector('.size-indicator') as HTMLElement).style.display).toBe('none')
    expect((container.querySelector('.sibling-line') as HTMLElement).style.display).toBe('none')
    expect((container.querySelector('.semantic-dots') as HTMLElement).style.display).toBe('none')
    expect(container.querySelector('.zone-indicator')!.classList.contains('visible')).toBe(false)
  })

  it('dispose removes overlay from container', () => {
    const m = new OverlayManager({ container })
    expect(container.querySelector('.visual-overlay')).not.toBeNull()
    m.dispose()
    expect(container.querySelector('.visual-overlay')).toBeNull()
  })
})

// =============================================================================
// DrawRectRenderer
// =============================================================================

describe('DrawRectRenderer', () => {
  it('createOverlay appends .draw-overlay to document.body', () => {
    new DrawRectRenderer(container)
    expect(document.body.querySelector('.draw-overlay')).not.toBeNull()
  })

  it('overlay starts hidden (display:none)', () => {
    new DrawRectRenderer(container)
    const o = document.body.querySelector('.draw-overlay') as HTMLElement
    expect(o.style.display).toBe('none')
  })

  it('render shows overlay with rect element', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 10, y: 20, width: 100, height: 50 }, new DOMRect(0, 0, 500, 500), 1)
    const overlay = document.body.querySelector('.draw-overlay') as HTMLElement
    expect(overlay.style.display).toBe('block')
    expect(overlay.querySelector('.draw-rect')).not.toBeNull()
  })

  it('render positions rect using containerRect + scale', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 10, y: 20, width: 100, height: 50 }, new DOMRect(50, 100, 500, 500), 2)
    const rect = document.body.querySelector('.draw-rect') as HTMLElement
    expect(rect.style.left).toBe('70px') // 50 + 10*2
    expect(rect.style.top).toBe('140px') // 100 + 20*2
    expect(rect.style.width).toBe('200px') // 100*2
    expect(rect.style.height).toBe('100px') // 50*2
  })

  it('render shows dimension label "W × H" rounded', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 0, y: 0, width: 100.7, height: 50.4 }, new DOMRect(0, 0, 500, 500), 1)
    const dim = document.body.querySelector('.draw-rect-label-dimensions')
    expect(dim?.textContent).toBe('101 × 50')
  })

  it('render shows position label "x: X, y: Y" rounded', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 12.6, y: 33.4, width: 100, height: 50 }, new DOMRect(0, 0, 500, 500), 1)
    const pos = document.body.querySelector('.draw-rect-label-position')
    expect(pos?.textContent).toBe('x: 13, y: 33')
  })

  it('hide sets overlay display to none', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 0, y: 0, width: 10, height: 10 }, new DOMRect(0, 0, 100, 100), 1)
    r.hide()
    expect((document.body.querySelector('.draw-overlay') as HTMLElement).style.display).toBe('none')
  })

  it('dispose removes overlay from DOM', () => {
    const r = new DrawRectRenderer(container)
    r.dispose()
    expect(document.body.querySelector('.draw-overlay')).toBeNull()
  })

  it('multiple renders reuse same DOM elements (ensureElements idempotent)', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 0, y: 0, width: 10, height: 10 }, new DOMRect(0, 0, 100, 100), 1)
    r.render({ x: 5, y: 5, width: 20, height: 20 }, new DOMRect(0, 0, 100, 100), 1)
    expect(document.body.querySelectorAll('.draw-rect').length).toBe(1)
    expect(document.body.querySelectorAll('.draw-rect-label-dimensions').length).toBe(1)
  })
})

// =============================================================================
// GuideRenderer
// =============================================================================

describe('GuideRenderer', () => {
  function makeGuide(axis: 'vertical' | 'horizontal', position: number): Guide {
    return {
      axis,
      position,
      start: 0,
      end: 100,
      alignedEdges: [{ type: 'left', position, elementId: 'a' }],
    }
  }

  it('createGuideRenderer returns a GuideRenderer', () => {
    expect(createGuideRenderer(container)).toBeInstanceOf(GuideRenderer)
  })

  it('render: empty guides → no elements added', () => {
    const r = new GuideRenderer(container)
    r.render([])
    expect(container.querySelectorAll('.smart-guide').length).toBe(0)
    expect(r.hasGuides()).toBe(false)
  })

  it('render: vertical guide → 1px-wide line', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('vertical', 50)])
    const line = container.querySelector('.smart-guide') as HTMLElement
    expect(line.style.left).toBe('50px')
    expect(line.style.width).toBe('1px')
    expect(line.style.height).toBe('100px') // end - start
  })

  it('render: horizontal guide → 1px-tall line', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('horizontal', 30)])
    const line = container.querySelector('.smart-guide') as HTMLElement
    expect(line.style.top).toBe('30px')
    expect(line.style.height).toBe('1px')
    expect(line.style.width).toBe('100px')
  })

  it('render: replaces previous guides', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('vertical', 10)])
    r.render([makeGuide('horizontal', 20), makeGuide('vertical', 30)])
    expect(container.querySelectorAll('.smart-guide').length).toBe(2)
  })

  it('clear removes all guides', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('vertical', 10), makeGuide('horizontal', 20)])
    r.clear()
    expect(container.querySelectorAll('.smart-guide').length).toBe(0)
    expect(r.hasGuides()).toBe(false)
  })

  it('hasGuides: true after render with non-empty list', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('vertical', 10)])
    expect(r.hasGuides()).toBe(true)
  })

  it('dispose clears guides', () => {
    const r = new GuideRenderer(container)
    r.render([makeGuide('vertical', 10)])
    r.dispose()
    expect(container.querySelectorAll('.smart-guide').length).toBe(0)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: OverlayManager preserves non-static container position (catches forced mutation)', () => {
    container.style.position = 'fixed'
    new OverlayManager({ container })
    expect(container.style.position).toBe('fixed')
  })

  it('M2: OverlayManager only ONE active dot at a time (catches drop of else-remove)', () => {
    const m = new OverlayManager({ container })
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'top-left')
    m.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'top-right')
    expect(container.querySelectorAll('.zone-dot.active').length).toBe(1)
  })

  it('M3: OverlayManager sibling-line "before" uses left-2 / "after" uses left+width-2', () => {
    const m = new OverlayManager({ container })
    m.showSiblingLine({ left: 100, top: 0, width: 50, height: 30 }, 'before', 'horizontal')
    const before = (container.querySelector('.sibling-line') as HTMLElement).style.left
    m.showSiblingLine({ left: 100, top: 0, width: 50, height: 30 }, 'after', 'horizontal')
    const after = (container.querySelector('.sibling-line') as HTMLElement).style.left
    expect(before).toBe('98px') // 100 - 2
    expect(after).toBe('148px') // 100 + 50 - 2
  })

  it('M4: DrawRectRenderer uses Math.round for label values', () => {
    const r = new DrawRectRenderer(container)
    r.render({ x: 1.5, y: 2.5, width: 100.5, height: 50.4 }, new DOMRect(0, 0, 500, 500), 1)
    expect(document.body.querySelector('.draw-rect-label-position')?.textContent).toBe('x: 2, y: 3')
    expect(document.body.querySelector('.draw-rect-label-dimensions')?.textContent).toBe('101 × 50')
  })

  it('M5: GuideRenderer line dimension = end - start (catches drop of subtraction)', () => {
    const r = new GuideRenderer(container)
    r.render([
      {
        axis: 'vertical',
        position: 100,
        start: 50,
        end: 80,
        alignedEdges: [{ type: 'left', position: 100, elementId: 'a' }],
      },
    ])
    const line = container.querySelector('.smart-guide') as HTMLElement
    expect(line.style.height).toBe('30px') // 80 - 50
  })
})
