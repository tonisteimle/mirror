/**
 * ConstraintPanel - Visual constraint/anchor editor
 *
 * Provides a visual interface for setting pin-to-edge constraints:
 * - Visual box with clickable edges
 * - Value inputs for each pinned edge
 * - Center alignment toggles
 */

import type { ConstraintPanelConfig, ConstraintState, PinEdge, PinCenter } from './types'

export class ConstraintPanel {
  private container: HTMLElement
  private config: ConstraintPanelConfig
  private state: ConstraintState
  private element: HTMLElement | null = null

  constructor(config: ConstraintPanelConfig) {
    this.config = config
    this.container = config.container
    this.state = { ...config.initialState }
    this.render()
  }

  private render(): void {
    this.element = document.createElement('div')
    this.element.className = 'constraint-panel'
    this.element.innerHTML = `
      <div class="constraint-header">Constraints</div>
      <div class="constraint-content">
        <div class="constraint-visual">
          <div class="constraint-box">
            <button class="pin-btn pin-top ${this.state.top !== null ? 'active' : ''}"
                    data-pin="top" title="Pin to top">
              <span class="pin-line"></span>
            </button>
            <button class="pin-btn pin-right ${this.state.right !== null ? 'active' : ''}"
                    data-pin="right" title="Pin to right">
              <span class="pin-line"></span>
            </button>
            <button class="pin-btn pin-bottom ${this.state.bottom !== null ? 'active' : ''}"
                    data-pin="bottom" title="Pin to bottom">
              <span class="pin-line"></span>
            </button>
            <button class="pin-btn pin-left ${this.state.left !== null ? 'active' : ''}"
                    data-pin="left" title="Pin to left">
              <span class="pin-line"></span>
            </button>
            <div class="constraint-inner">
              <button class="center-btn center-x ${this.state.centerX ? 'active' : ''}"
                      data-center="x" title="Center horizontally">
                <span class="center-line-h"></span>
              </button>
              <button class="center-btn center-y ${this.state.centerY ? 'active' : ''}"
                      data-center="y" title="Center vertically">
                <span class="center-line-v"></span>
              </button>
            </div>
          </div>
        </div>
        <div class="constraint-values">
          <div class="constraint-row ${this.state.top !== null ? 'active' : ''}">
            <label>Top</label>
            <input type="number" data-constraint="top"
                   value="${this.state.top ?? ''}"
                   ${this.state.top === null ? 'disabled' : ''}>
            <span class="unit">px</span>
          </div>
          <div class="constraint-row ${this.state.right !== null ? 'active' : ''}">
            <label>Right</label>
            <input type="number" data-constraint="right"
                   value="${this.state.right ?? ''}"
                   ${this.state.right === null ? 'disabled' : ''}>
            <span class="unit">px</span>
          </div>
          <div class="constraint-row ${this.state.bottom !== null ? 'active' : ''}">
            <label>Bottom</label>
            <input type="number" data-constraint="bottom"
                   value="${this.state.bottom ?? ''}"
                   ${this.state.bottom === null ? 'disabled' : ''}>
            <span class="unit">px</span>
          </div>
          <div class="constraint-row ${this.state.left !== null ? 'active' : ''}">
            <label>Left</label>
            <input type="number" data-constraint="left"
                   value="${this.state.left ?? ''}"
                   ${this.state.left === null ? 'disabled' : ''}>
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    `

    this.setupEventListeners()
    this.container.appendChild(this.element)
  }

  private setupEventListeners(): void {
    if (!this.element) return

    // Pin buttons
    const pinBtns = this.element.querySelectorAll('.pin-btn')
    pinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const edge = btn.getAttribute('data-pin') as PinEdge
        this.togglePin(edge)
      })
    })

    // Center buttons
    const centerBtns = this.element.querySelectorAll('.center-btn')
    centerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.getAttribute('data-center')
        if (axis === 'x') {
          this.toggleCenter('center-x')
        } else if (axis === 'y') {
          this.toggleCenter('center-y')
        }
      })
    })

    // Value inputs
    const inputs = this.element.querySelectorAll('input[data-constraint]')
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const edge = target.getAttribute('data-constraint') as PinEdge
        const value = target.value ? parseInt(target.value, 10) : null
        this.updateValue(edge, value)
      })
    })
  }

  private togglePin(edge: PinEdge): void {
    const currentValue = this.state[edge]
    const newValue = currentValue === null ? 0 : null

    this.state[edge] = newValue
    this.updateUI(edge, newValue)
    this.config.onChange(edge, newValue)
  }

  private toggleCenter(center: PinCenter): void {
    if (center === 'center-x') {
      this.state.centerX = !this.state.centerX
      this.updateCenterUI('x', this.state.centerX)
      this.config.onChange('center-x', this.state.centerX ? 0 : null)
    } else if (center === 'center-y') {
      this.state.centerY = !this.state.centerY
      this.updateCenterUI('y', this.state.centerY)
      this.config.onChange('center-y', this.state.centerY ? 0 : null)
    }
  }

  private updateValue(edge: PinEdge, value: number | null): void {
    this.state[edge] = value
    this.config.onChange(edge, value)
  }

  private updateUI(edge: PinEdge, value: number | null): void {
    if (!this.element) return

    const btn = this.element.querySelector(`.pin-${edge}`)
    const row = this.element.querySelector(`.constraint-row input[data-constraint="${edge}"]`)?.closest('.constraint-row')
    const input = this.element.querySelector(`input[data-constraint="${edge}"]`) as HTMLInputElement

    if (value !== null) {
      btn?.classList.add('active')
      row?.classList.add('active')
      if (input) {
        input.disabled = false
        input.value = String(value)
      }
    } else {
      btn?.classList.remove('active')
      row?.classList.remove('active')
      if (input) {
        input.disabled = true
        input.value = ''
      }
    }
  }

  private updateCenterUI(axis: 'x' | 'y', active: boolean): void {
    if (!this.element) return

    const btn = this.element.querySelector(`.center-${axis}`)
    if (active) {
      btn?.classList.add('active')
    } else {
      btn?.classList.remove('active')
    }
  }

  /**
   * Update the panel with new state
   */
  update(state: Partial<ConstraintState>): void {
    Object.assign(this.state, state)

    // Update UI for each edge
    for (const edge of ['top', 'right', 'bottom', 'left'] as PinEdge[]) {
      if (edge in state) {
        this.updateUI(edge, this.state[edge])
      }
    }

    // Update center toggles
    if ('centerX' in state) {
      this.updateCenterUI('x', this.state.centerX)
    }
    if ('centerY' in state) {
      this.updateCenterUI('y', this.state.centerY)
    }
  }

  /**
   * Get current constraint state
   */
  getState(): ConstraintState {
    return { ...this.state }
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement | null {
    return this.element
  }

  /**
   * Dispose the panel
   */
  dispose(): void {
    this.element?.remove()
    this.element = null
  }
}

/**
 * Create a constraint panel
 */
export function createConstraintPanel(config: ConstraintPanelConfig): ConstraintPanel {
  return new ConstraintPanel(config)
}
