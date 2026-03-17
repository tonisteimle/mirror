/**
 * Tests for DropIndicatorRenderer
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  DropIndicatorRenderer,
  createDropIndicatorRenderer,
  type LineIndicatorConfig,
  type CrosshairIndicatorConfig,
  type HighlightConfig,
  type ZoneIndicatorConfig,
} from '../drop-indicator-renderer'

// ===========================================
// TEST HELPERS
// ===========================================

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.style.position = 'relative'
  container.style.width = '400px'
  container.style.height = '400px'
  document.body.appendChild(container)
  return container
}

function cleanupContainer(container: HTMLElement): void {
  if (container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

// ===========================================
// DropIndicatorRenderer
// ===========================================

describe('DropIndicatorRenderer', () => {
  let container: HTMLElement
  let renderer: DropIndicatorRenderer

  beforeEach(() => {
    container = createContainer()
    renderer = new DropIndicatorRenderer(container)
  })

  afterEach(() => {
    renderer.dispose()
    cleanupContainer(container)
  })

  describe('Construction', () => {
    it('should create renderer instance', () => {
      expect(renderer).toBeDefined()
    })

    it('should create line indicator elements', () => {
      const lineElement = container.querySelector('.mirror-drop-indicator')
      expect(lineElement).not.toBeNull()
    })

    it('should create dot elements', () => {
      const dots = container.querySelectorAll('.mirror-drop-indicator-dot')
      expect(dots.length).toBe(2)
    })

    it('should hide indicators initially', () => {
      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('none')
    })
  })

  describe('show (line)', () => {
    it('should show horizontal line indicator', () => {
      const config: LineIndicatorConfig = {
        type: 'line',
        position: 100,
        isHorizontal: true,
        start: 50,
        length: 200,
        showDots: true,
      }

      renderer.show(config)

      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('block')
      expect(lineElement.style.left).toBe('50px')
      expect(lineElement.style.top).toBe('100px')
      expect(lineElement.style.width).toBe('200px')
    })

    it('should show vertical line indicator', () => {
      const config: LineIndicatorConfig = {
        type: 'line',
        position: 150,
        isHorizontal: false,
        start: 20,
        length: 300,
        showDots: true,
      }

      renderer.show(config)

      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('block')
      expect(lineElement.style.left).toBe('150px')
      expect(lineElement.style.top).toBe('20px')
      expect(lineElement.style.height).toBe('300px')
    })

    it('should show dots with line', () => {
      const config: LineIndicatorConfig = {
        type: 'line',
        position: 100,
        isHorizontal: true,
        start: 0,
        length: 200,
        showDots: true,
      }

      renderer.show(config)

      const dots = container.querySelectorAll('.mirror-drop-indicator-dot') as NodeListOf<HTMLElement>
      expect(dots[0].style.display).toBe('block')
      expect(dots[1].style.display).toBe('block')
    })

    it('should hide dots when showDots is false', () => {
      // First show with dots
      renderer.show({
        type: 'line',
        position: 100,
        isHorizontal: true,
        start: 0,
        length: 200,
        showDots: true,
      })

      // Then show without dots
      renderer.clear()
      renderer.show({
        type: 'line',
        position: 100,
        isHorizontal: true,
        start: 0,
        length: 200,
        showDots: false,
      })

      const dots = container.querySelectorAll('.mirror-drop-indicator-dot') as NodeListOf<HTMLElement>
      expect(dots[0].style.display).toBe('none')
      expect(dots[1].style.display).toBe('none')
    })
  })

  describe('show (crosshair)', () => {
    it('should show crosshair indicator', () => {
      const config: CrosshairIndicatorConfig = {
        type: 'crosshair',
        x: 100,
        y: 150,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
      }

      renderer.show(config)

      const crosshairH = container.querySelector('.mirror-crosshair-h') as HTMLElement
      const crosshairV = container.querySelector('.mirror-crosshair-v') as HTMLElement

      expect(crosshairH).not.toBeNull()
      expect(crosshairV).not.toBeNull()
      expect(crosshairH.style.display).toBe('block')
      expect(crosshairV.style.display).toBe('block')
    })

    it('should position crosshair lines correctly', () => {
      const config: CrosshairIndicatorConfig = {
        type: 'crosshair',
        x: 100,
        y: 150,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
      }

      renderer.show(config)

      const crosshairH = container.querySelector('.mirror-crosshair-h') as HTMLElement
      const crosshairV = container.querySelector('.mirror-crosshair-v') as HTMLElement

      expect(crosshairH.style.top).toBe('150px')
      expect(crosshairH.style.width).toBe('400px')
      expect(crosshairV.style.left).toBe('100px')
      expect(crosshairV.style.height).toBe('400px')
    })

    it('should show position label when provided', () => {
      const config: CrosshairIndicatorConfig = {
        type: 'crosshair',
        x: 100,
        y: 150,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
        label: 'x: 100, y: 150',
      }

      renderer.show(config)

      const label = container.querySelector('.mirror-position-label') as HTMLElement
      expect(label).not.toBeNull()
      expect(label.textContent).toBe('x: 100, y: 150')
      expect(label.style.display).toBe('block')
    })

    it('should not show label when not provided', () => {
      const config: CrosshairIndicatorConfig = {
        type: 'crosshair',
        x: 100,
        y: 150,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
      }

      renderer.show(config)

      // Label element might exist but should not be updated
      const label = container.querySelector('.mirror-position-label') as HTMLElement | null
      if (label) {
        expect(label.style.display).toBe('none')
      }
    })
  })

  describe('show (highlight)', () => {
    it('should highlight element', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      const config: HighlightConfig = {
        type: 'highlight',
        element,
      }

      renderer.show(config)

      expect(element.style.backgroundColor).toBe('rgba(59, 130, 246, 0.08)')
      expect(element.style.outline).toBe('2px solid #3B82F6')
    })

    it('should clear highlight on clear()', () => {
      const element = document.createElement('div')
      element.style.backgroundColor = 'red'
      container.appendChild(element)

      const config: HighlightConfig = {
        type: 'highlight',
        element,
      }

      renderer.show(config)
      renderer.clear()

      expect(element.style.backgroundColor).toBe('red')
    })
  })

  describe('show (zone)', () => {
    it('should show zone as line indicator', () => {
      const config: ZoneIndicatorConfig = {
        type: 'zone',
        line: {
          type: 'line',
          position: 100,
          isHorizontal: true,
          start: 0,
          length: 400,
        },
      }

      renderer.show(config)

      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('block')
    })
  })

  describe('showFromStrategyConfig', () => {
    it('should convert strategy line config to renderer config', () => {
      const strategyConfig = {
        type: 'line' as const,
        x: 100,
        y: 50,
        width: 2,
        height: 200,
        showDots: true,
      }

      renderer.showFromStrategyConfig(strategyConfig, new DOMRect(0, 0, 400, 400))

      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('block')
    })

    it('should convert strategy crosshair config to renderer config', () => {
      const strategyConfig = {
        type: 'crosshair' as const,
        x: 150,
        y: 100,
        label: 'x: 150, y: 100',
      }

      renderer.showFromStrategyConfig(strategyConfig, new DOMRect(0, 0, 400, 400))

      const crosshairH = container.querySelector('.mirror-crosshair-h') as HTMLElement
      expect(crosshairH).not.toBeNull()
    })
  })

  describe('clear', () => {
    it('should hide line indicator', () => {
      renderer.show({
        type: 'line',
        position: 100,
        isHorizontal: true,
        start: 0,
        length: 200,
      })

      renderer.clear()

      const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(lineElement.style.display).toBe('none')
    })

    it('should hide crosshair indicators', () => {
      renderer.show({
        type: 'crosshair',
        x: 100,
        y: 100,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
      })

      renderer.clear()

      const crosshairH = container.querySelector('.mirror-crosshair-h') as HTMLElement
      const crosshairV = container.querySelector('.mirror-crosshair-v') as HTMLElement

      expect(crosshairH?.style.display).toBe('none')
      expect(crosshairV?.style.display).toBe('none')
    })

    it('should clear element highlight', () => {
      const element = document.createElement('div')
      element.style.backgroundColor = 'white'
      container.appendChild(element)

      renderer.show({ type: 'highlight', element })
      renderer.clear()

      expect(element.style.backgroundColor).toBe('white')
    })
  })

  describe('dispose', () => {
    it('should remove line indicator elements', () => {
      renderer.dispose()

      expect(container.querySelector('.mirror-drop-indicator')).toBeNull()
      expect(container.querySelectorAll('.mirror-drop-indicator-dot').length).toBe(0)
    })

    it('should remove crosshair elements if created', () => {
      // Create crosshair elements first
      renderer.show({
        type: 'crosshair',
        x: 100,
        y: 100,
        containerLeft: 0,
        containerTop: 0,
        containerWidth: 400,
        containerHeight: 400,
      })

      renderer.dispose()

      expect(container.querySelector('.mirror-crosshair-h')).toBeNull()
      expect(container.querySelector('.mirror-crosshair-v')).toBeNull()
      expect(container.querySelector('.mirror-position-label')).toBeNull()
    })
  })

  describe('ensureElements', () => {
    it('should recreate elements if removed', () => {
      // Remove elements
      const indicators = container.querySelectorAll('.mirror-drop-indicator, .mirror-drop-indicator-dot')
      indicators.forEach((el) => el.remove())

      expect(container.querySelector('.mirror-drop-indicator')).toBeNull()

      renderer.ensureElements()

      expect(container.querySelector('.mirror-drop-indicator')).not.toBeNull()
      expect(container.querySelectorAll('.mirror-drop-indicator-dot').length).toBe(2)
    })

    it('should not duplicate elements if already present', () => {
      const initialCount = container.querySelectorAll('.mirror-drop-indicator').length

      renderer.ensureElements()

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(initialCount)
    })
  })
})

// ===========================================
// Factory function
// ===========================================

describe('createDropIndicatorRenderer', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    cleanupContainer(container)
  })

  it('should create DropIndicatorRenderer instance', () => {
    const renderer = createDropIndicatorRenderer(container)

    expect(renderer).toBeInstanceOf(DropIndicatorRenderer)

    renderer.dispose()
  })

  it('should create indicators in container', () => {
    const renderer = createDropIndicatorRenderer(container)

    expect(container.querySelector('.mirror-drop-indicator')).not.toBeNull()

    renderer.dispose()
  })
})

// ===========================================
// Visual indicator styling
// ===========================================

describe('Indicator Styling', () => {
  let container: HTMLElement
  let renderer: DropIndicatorRenderer

  beforeEach(() => {
    container = createContainer()
    renderer = new DropIndicatorRenderer(container)
  })

  afterEach(() => {
    renderer.dispose()
    cleanupContainer(container)
  })

  it('should apply blue color to line indicator', () => {
    renderer.show({
      type: 'line',
      position: 100,
      isHorizontal: true,
      start: 0,
      length: 200,
    })

    const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
    expect(lineElement.style.backgroundColor).toBe('rgb(59, 130, 246)') // #3B82F6
  })

  it('should apply blue color to dots', () => {
    renderer.show({
      type: 'line',
      position: 100,
      isHorizontal: true,
      start: 0,
      length: 200,
      showDots: true,
    })

    const dots = container.querySelectorAll('.mirror-drop-indicator-dot') as NodeListOf<HTMLElement>
    dots.forEach((dot) => {
      expect(dot.style.backgroundColor).toBe('rgb(59, 130, 246)')
    })
  })

  it('should apply transition for smooth animation', () => {
    const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
    expect(lineElement.style.transition).toContain('ease-out')
  })

  it('should make indicators non-interactive', () => {
    const lineElement = container.querySelector('.mirror-drop-indicator') as HTMLElement
    expect(lineElement.style.pointerEvents).toBe('none')
  })
})
