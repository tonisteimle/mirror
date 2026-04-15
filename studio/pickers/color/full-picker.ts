/**
 * Full Color Picker - Complete Figma-style color picker
 *
 * Generates all HTML dynamically. Features:
 * - Token colors section
 * - Multiple palette tabs (Custom, Tailwind, Open, Material)
 * - Canvas-based HSV color picker
 * - Hue/Alpha sliders
 * - Hex input
 * - Eye dropper (if browser supports)
 */

import { hsvToRgb, rgbToHsv, hexToRgb, rgbToHex, hexToHsv, hsvToHex, type HSV } from './palette'

// =============================================================================
// Types
// =============================================================================

export interface FullColorPickerConfig {
  onSelect?: (color: string) => void
  onPreview?: (color: string) => void
  onClose?: () => void
}

export interface ColorScale {
  name: string
  shades: string[]
}

interface PickerState {
  h: number
  s: number
  v: number
  a: number
}

// =============================================================================
// Color Palettes (with names for grid building)
// =============================================================================

const OPEN_COLORS: ColorScale[] = [
  {
    name: 'gray',
    shades: [
      '#f8f9fa',
      '#f1f3f5',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#868e96',
      '#495057',
      '#343a40',
      '#212529',
    ],
  },
  {
    name: 'red',
    shades: [
      '#fff5f5',
      '#ffe3e3',
      '#ffc9c9',
      '#ffa8a8',
      '#ff8787',
      '#ff6b6b',
      '#fa5252',
      '#f03e3e',
      '#e03131',
      '#c92a2a',
    ],
  },
  {
    name: 'pink',
    shades: [
      '#fff0f6',
      '#ffdeeb',
      '#fcc2d7',
      '#faa2c1',
      '#f783ac',
      '#f06595',
      '#e64980',
      '#d6336c',
      '#c2255c',
      '#a61e4d',
    ],
  },
  {
    name: 'grape',
    shades: [
      '#f8f0fc',
      '#f3d9fa',
      '#eebefa',
      '#e599f7',
      '#da77f2',
      '#cc5de8',
      '#be4bdb',
      '#ae3ec9',
      '#9c36b5',
      '#862e9c',
    ],
  },
  {
    name: 'violet',
    shades: [
      '#f3f0ff',
      '#e5dbff',
      '#d0bfff',
      '#b197fc',
      '#9775fa',
      '#845ef7',
      '#7950f2',
      '#7048e8',
      '#6741d9',
      '#5f3dc4',
    ],
  },
  {
    name: 'indigo',
    shades: [
      '#edf2ff',
      '#dbe4ff',
      '#bac8ff',
      '#91a7ff',
      '#748ffc',
      '#5c7cfa',
      '#4c6ef5',
      '#4263eb',
      '#3b5bdb',
      '#364fc7',
    ],
  },
  {
    name: 'blue',
    shades: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
  {
    name: 'cyan',
    shades: [
      '#e3fafc',
      '#c5f6fa',
      '#99e9f2',
      '#66d9e8',
      '#3bc9db',
      '#22b8cf',
      '#15aabf',
      '#1098ad',
      '#0c8599',
      '#0b7285',
    ],
  },
  {
    name: 'teal',
    shades: [
      '#e6fcf5',
      '#c3fae8',
      '#96f2d7',
      '#63e6be',
      '#38d9a9',
      '#20c997',
      '#12b886',
      '#0ca678',
      '#099268',
      '#087f5b',
    ],
  },
  {
    name: 'green',
    shades: [
      '#ebfbee',
      '#d3f9d8',
      '#b2f2bb',
      '#8ce99a',
      '#69db7c',
      '#51cf66',
      '#40c057',
      '#37b24d',
      '#2f9e44',
      '#2b8a3e',
    ],
  },
  {
    name: 'lime',
    shades: [
      '#f4fce3',
      '#e9fac8',
      '#d8f5a2',
      '#c0eb75',
      '#a9e34b',
      '#94d82d',
      '#82c91e',
      '#74b816',
      '#66a80f',
      '#5c940d',
    ],
  },
  {
    name: 'yellow',
    shades: [
      '#fff9db',
      '#fff3bf',
      '#ffec99',
      '#ffe066',
      '#ffd43b',
      '#fcc419',
      '#fab005',
      '#f59f00',
      '#f08c00',
      '#e67700',
    ],
  },
  {
    name: 'orange',
    shades: [
      '#fff4e6',
      '#ffe8cc',
      '#ffd8a8',
      '#ffc078',
      '#ffa94d',
      '#ff922b',
      '#fd7e14',
      '#f76707',
      '#e8590c',
      '#d9480f',
    ],
  },
]

const TAILWIND_COLORS: ColorScale[] = [
  {
    name: 'slate',
    shades: [
      '#f8fafc',
      '#f1f5f9',
      '#e2e8f0',
      '#cbd5e1',
      '#94a3b8',
      '#64748b',
      '#475569',
      '#334155',
      '#1e293b',
      '#0f172a',
    ],
  },
  {
    name: 'gray',
    shades: [
      '#f9fafb',
      '#f3f4f6',
      '#e5e7eb',
      '#d1d5db',
      '#9ca3af',
      '#6b7280',
      '#4b5563',
      '#374151',
      '#1f2937',
      '#111827',
    ],
  },
  {
    name: 'zinc',
    shades: [
      '#fafafa',
      '#f4f4f5',
      '#e4e4e7',
      '#d4d4d8',
      '#a1a1aa',
      '#71717a',
      '#52525b',
      '#3f3f46',
      '#27272a',
      '#18181b',
    ],
  },
  {
    name: 'red',
    shades: [
      '#fef2f2',
      '#fee2e2',
      '#fecaca',
      '#fca5a5',
      '#f87171',
      '#ef4444',
      '#dc2626',
      '#b91c1c',
      '#991b1b',
      '#7f1d1d',
    ],
  },
  {
    name: 'orange',
    shades: [
      '#fff7ed',
      '#ffedd5',
      '#fed7aa',
      '#fdba74',
      '#fb923c',
      '#f97316',
      '#ea580c',
      '#c2410c',
      '#9a3412',
      '#7c2d12',
    ],
  },
  {
    name: 'amber',
    shades: [
      '#fffbeb',
      '#fef3c7',
      '#fde68a',
      '#fcd34d',
      '#fbbf24',
      '#f59e0b',
      '#d97706',
      '#b45309',
      '#92400e',
      '#78350f',
    ],
  },
  {
    name: 'yellow',
    shades: [
      '#fefce8',
      '#fef9c3',
      '#fef08a',
      '#fde047',
      '#facc15',
      '#eab308',
      '#ca8a04',
      '#a16207',
      '#854d0e',
      '#713f12',
    ],
  },
  {
    name: 'lime',
    shades: [
      '#f7fee7',
      '#ecfccb',
      '#d9f99d',
      '#bef264',
      '#a3e635',
      '#84cc16',
      '#65a30d',
      '#4d7c0f',
      '#3f6212',
      '#365314',
    ],
  },
  {
    name: 'green',
    shades: [
      '#f0fdf4',
      '#dcfce7',
      '#bbf7d0',
      '#86efac',
      '#4ade80',
      '#22c55e',
      '#16a34a',
      '#15803d',
      '#166534',
      '#14532d',
    ],
  },
  {
    name: 'emerald',
    shades: [
      '#ecfdf5',
      '#d1fae5',
      '#a7f3d0',
      '#6ee7b7',
      '#34d399',
      '#10b981',
      '#059669',
      '#047857',
      '#065f46',
      '#064e3b',
    ],
  },
  {
    name: 'teal',
    shades: [
      '#f0fdfa',
      '#ccfbf1',
      '#99f6e4',
      '#5eead4',
      '#2dd4bf',
      '#14b8a6',
      '#0d9488',
      '#0f766e',
      '#115e59',
      '#134e4a',
    ],
  },
  {
    name: 'cyan',
    shades: [
      '#ecfeff',
      '#cffafe',
      '#a5f3fc',
      '#67e8f9',
      '#22d3ee',
      '#06b6d4',
      '#0891b2',
      '#0e7490',
      '#155e75',
      '#164e63',
    ],
  },
  {
    name: 'sky',
    shades: [
      '#f0f9ff',
      '#e0f2fe',
      '#bae6fd',
      '#7dd3fc',
      '#38bdf8',
      '#0ea5e9',
      '#0284c7',
      '#0369a1',
      '#075985',
      '#0c4a6e',
    ],
  },
  {
    name: 'blue',
    shades: [
      '#eff6ff',
      '#dbeafe',
      '#bfdbfe',
      '#93c5fd',
      '#60a5fa',
      '#3b82f6',
      '#2563eb',
      '#1d4ed8',
      '#1e40af',
      '#1e3a8a',
    ],
  },
  {
    name: 'indigo',
    shades: [
      '#eef2ff',
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#6366f1',
      '#4f46e5',
      '#4338ca',
      '#3730a3',
      '#312e81',
    ],
  },
  {
    name: 'violet',
    shades: [
      '#f5f3ff',
      '#ede9fe',
      '#ddd6fe',
      '#c4b5fd',
      '#a78bfa',
      '#8b5cf6',
      '#7c3aed',
      '#6d28d9',
      '#5b21b6',
      '#4c1d95',
    ],
  },
  {
    name: 'purple',
    shades: [
      '#faf5ff',
      '#f3e8ff',
      '#e9d5ff',
      '#d8b4fe',
      '#c084fc',
      '#a855f7',
      '#9333ea',
      '#7e22ce',
      '#6b21a8',
      '#581c87',
    ],
  },
  {
    name: 'fuchsia',
    shades: [
      '#fdf4ff',
      '#fae8ff',
      '#f5d0fe',
      '#f0abfc',
      '#e879f9',
      '#d946ef',
      '#c026d3',
      '#a21caf',
      '#86198f',
      '#701a75',
    ],
  },
  {
    name: 'pink',
    shades: [
      '#fdf2f8',
      '#fce7f3',
      '#fbcfe8',
      '#f9a8d4',
      '#f472b6',
      '#ec4899',
      '#db2777',
      '#be185d',
      '#9d174d',
      '#831843',
    ],
  },
  {
    name: 'rose',
    shades: [
      '#fff1f2',
      '#ffe4e6',
      '#fecdd3',
      '#fda4af',
      '#fb7185',
      '#f43f5e',
      '#e11d48',
      '#be123c',
      '#9f1239',
      '#881337',
    ],
  },
]

const MATERIAL_COLORS: ColorScale[] = [
  {
    name: 'red',
    shades: [
      '#ffebee',
      '#ffcdd2',
      '#ef9a9a',
      '#e57373',
      '#ef5350',
      '#f44336',
      '#e53935',
      '#d32f2f',
      '#c62828',
      '#b71c1c',
    ],
  },
  {
    name: 'pink',
    shades: [
      '#fce4ec',
      '#f8bbd0',
      '#f48fb1',
      '#f06292',
      '#ec407a',
      '#e91e63',
      '#d81b60',
      '#c2185b',
      '#ad1457',
      '#880e4f',
    ],
  },
  {
    name: 'purple',
    shades: [
      '#f3e5f5',
      '#e1bee7',
      '#ce93d8',
      '#ba68c8',
      '#ab47bc',
      '#9c27b0',
      '#8e24aa',
      '#7b1fa2',
      '#6a1b9a',
      '#4a148c',
    ],
  },
  {
    name: 'deepPurple',
    shades: [
      '#ede7f6',
      '#d1c4e9',
      '#b39ddb',
      '#9575cd',
      '#7e57c2',
      '#673ab7',
      '#5e35b1',
      '#512da8',
      '#4527a0',
      '#311b92',
    ],
  },
  {
    name: 'indigo',
    shades: [
      '#e8eaf6',
      '#c5cae9',
      '#9fa8da',
      '#7986cb',
      '#5c6bc0',
      '#3f51b5',
      '#3949ab',
      '#303f9f',
      '#283593',
      '#1a237e',
    ],
  },
  {
    name: 'blue',
    shades: [
      '#e3f2fd',
      '#bbdefb',
      '#90caf9',
      '#64b5f6',
      '#42a5f5',
      '#2196f3',
      '#1e88e5',
      '#1976d2',
      '#1565c0',
      '#0d47a1',
    ],
  },
  {
    name: 'lightBlue',
    shades: [
      '#e1f5fe',
      '#b3e5fc',
      '#81d4fa',
      '#4fc3f7',
      '#29b6f6',
      '#03a9f4',
      '#039be5',
      '#0288d1',
      '#0277bd',
      '#01579b',
    ],
  },
  {
    name: 'cyan',
    shades: [
      '#e0f7fa',
      '#b2ebf2',
      '#80deea',
      '#4dd0e1',
      '#26c6da',
      '#00bcd4',
      '#00acc1',
      '#0097a7',
      '#00838f',
      '#006064',
    ],
  },
  {
    name: 'teal',
    shades: [
      '#e0f2f1',
      '#b2dfdb',
      '#80cbc4',
      '#4db6ac',
      '#26a69a',
      '#009688',
      '#00897b',
      '#00796b',
      '#00695c',
      '#004d40',
    ],
  },
  {
    name: 'green',
    shades: [
      '#e8f5e9',
      '#c8e6c9',
      '#a5d6a7',
      '#81c784',
      '#66bb6a',
      '#4caf50',
      '#43a047',
      '#388e3c',
      '#2e7d32',
      '#1b5e20',
    ],
  },
  {
    name: 'lightGreen',
    shades: [
      '#f1f8e9',
      '#dcedc8',
      '#c5e1a5',
      '#aed581',
      '#9ccc65',
      '#8bc34a',
      '#7cb342',
      '#689f38',
      '#558b2f',
      '#33691e',
    ],
  },
  {
    name: 'lime',
    shades: [
      '#f9fbe7',
      '#f0f4c3',
      '#e6ee9c',
      '#dce775',
      '#d4e157',
      '#cddc39',
      '#c0ca33',
      '#afb42b',
      '#9e9d24',
      '#827717',
    ],
  },
  {
    name: 'yellow',
    shades: [
      '#fffde7',
      '#fff9c4',
      '#fff59d',
      '#fff176',
      '#ffee58',
      '#ffeb3b',
      '#fdd835',
      '#fbc02d',
      '#f9a825',
      '#f57f17',
    ],
  },
  {
    name: 'amber',
    shades: [
      '#fff8e1',
      '#ffecb3',
      '#ffe082',
      '#ffd54f',
      '#ffca28',
      '#ffc107',
      '#ffb300',
      '#ffa000',
      '#ff8f00',
      '#ff6f00',
    ],
  },
  {
    name: 'orange',
    shades: [
      '#fff3e0',
      '#ffe0b2',
      '#ffcc80',
      '#ffb74d',
      '#ffa726',
      '#ff9800',
      '#fb8c00',
      '#f57c00',
      '#ef6c00',
      '#e65100',
    ],
  },
  {
    name: 'deepOrange',
    shades: [
      '#fbe9e7',
      '#ffccbc',
      '#ffab91',
      '#ff8a65',
      '#ff7043',
      '#ff5722',
      '#f4511e',
      '#e64a19',
      '#d84315',
      '#bf360c',
    ],
  },
  {
    name: 'brown',
    shades: [
      '#efebe9',
      '#d7ccc8',
      '#bcaaa4',
      '#a1887f',
      '#8d6e63',
      '#795548',
      '#6d4c41',
      '#5d4037',
      '#4e342e',
      '#3e2723',
    ],
  },
  {
    name: 'blueGrey',
    shades: [
      '#eceff1',
      '#cfd8dc',
      '#b0bec5',
      '#90a4ae',
      '#78909c',
      '#607d8b',
      '#546e7a',
      '#455a64',
      '#37474f',
      '#263238',
    ],
  },
]

// =============================================================================
// Full Color Picker Class
// =============================================================================

export class FullColorPicker {
  private container: HTMLElement | null = null
  private config: FullColorPickerConfig
  private state: PickerState = { h: 210, s: 100, v: 100, a: 1 }
  private currentTab = 'custom'
  private isVisible = false

  // DOM references
  private canvas: HTMLCanvasElement | null = null
  private hueThumb: HTMLElement | null = null
  private alphaSlider: HTMLElement | null = null
  private alphaThumb: HTMLElement | null = null
  private hexInput: HTMLInputElement | null = null
  private opacityInput: HTMLInputElement | null = null
  private preview: HTMLElement | null = null
  private hexDisplay: HTMLElement | null = null
  private tokenGrid: HTMLElement | null = null

  // Drag state
  private isDraggingCanvas = false
  private isDraggingHue = false
  private isDraggingAlpha = false

  // Swatch tracking for keyboard nav
  private swatchElements: HTMLElement[] = []
  private selectedSwatchIndex = 0

  constructor(config: FullColorPickerConfig = {}) {
    this.config = config
    this.boundMouseMove = this.handleMouseMove.bind(this)
    this.boundMouseUp = this.handleMouseUp.bind(this)
  }

  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: () => void

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Render the color picker into a container
   */
  render(targetId: string = 'color-picker'): HTMLElement {
    let target = document.getElementById(targetId)
    if (!target) {
      target = document.createElement('div')
      target.id = targetId
      target.className = 'color-picker'
      document.body.appendChild(target)
    }

    this.container = target
    this.container.innerHTML = this.generateHTML()
    this.cacheElements()
    this.setupEventListeners()
    this.buildAllGrids()
    this.draw()

    return this.container
  }

  /**
   * Show the picker at position
   */
  show(x: number, y: number, initialColor?: string): void {
    if (!this.container) this.render()

    if (initialColor) {
      this.setColor(initialColor)
    }

    this.container!.style.left = `${x}px`
    this.container!.style.top = `${y}px`
    this.container!.classList.add('visible')
    this.isVisible = true

    document.addEventListener('mousemove', this.boundMouseMove)
    document.addEventListener('mouseup', this.boundMouseUp)
  }

  /**
   * Hide the picker
   */
  hide(): void {
    if (this.container) {
      this.container.classList.remove('visible')
    }
    this.isVisible = false
    this.isDraggingCanvas = false
    this.isDraggingHue = false
    this.isDraggingAlpha = false

    document.removeEventListener('mousemove', this.boundMouseMove)
    document.removeEventListener('mouseup', this.boundMouseUp)

    this.config.onClose?.()
  }

  /**
   * Check if visible
   */
  isOpen(): boolean {
    return this.isVisible
  }

  /**
   * Set color from hex
   */
  setColor(hex: string): void {
    const hsv = hexToHsv(hex)
    this.state.h = hsv.h
    this.state.s = hsv.s
    this.state.v = hsv.v
    this.draw()
  }

  /**
   * Get current color as hex
   */
  getColor(): string {
    return hsvToHex(this.state.h, this.state.s, this.state.v)
  }

  /**
   * Update token colors grid
   */
  updateTokenColors(tokens: Array<{ name: string; value: string }>): void {
    if (!this.tokenGrid) return

    this.tokenGrid.innerHTML = ''

    if (tokens.length === 0) {
      const section = this.container?.querySelector('#color-picker-tokens')
      if (section) (section as HTMLElement).style.display = 'none'
      return
    }

    const section = this.container?.querySelector('#color-picker-tokens')
    if (section) (section as HTMLElement).style.display = ''

    for (const token of tokens) {
      const btn = this.createSwatch(token.value, `$${token.name}`)
      this.tokenGrid.appendChild(btn)
    }
  }

  /**
   * Navigate swatches (for keyboard)
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    const cols = 10,
      total = this.swatchElements.length
    if (total === 0) return
    const deltas: Record<string, number> = { left: -1, right: 1, up: -cols, down: cols }
    this.selectedSwatchIndex = Math.max(
      0,
      Math.min(total - 1, this.selectedSwatchIndex + deltas[direction])
    )
    this.updateSelectedSwatch()
  }

  /**
   * Select current swatch
   */
  selectCurrentSwatch(): void {
    const swatch = this.swatchElements[this.selectedSwatchIndex]
    if (swatch) {
      const color = swatch.dataset.color
      if (color) this.selectColor(color)
    }
  }

  // ===========================================================================
  // HTML Generation
  // ===========================================================================

  private generateHTML(): string {
    return `
      <!-- Token Colors Section -->
      <div id="color-picker-tokens" class="color-picker-section" style="display: none;">
        <div class="color-picker-label">Tokens</div>
        <div id="color-picker-token-grid" class="color-picker-token-grid"></div>
      </div>

      <!-- Tabs -->
      <div class="color-picker-tabs">
        <button class="color-picker-tab active" data-tab="custom">Custom</button>
        <button class="color-picker-tab" data-tab="tailwind">Tailwind</button>
        <button class="color-picker-tab" data-tab="open">Open</button>
        <button class="color-picker-tab" data-tab="material">Material</button>
      </div>

      <!-- Tab Content: Custom -->
      <div id="color-picker-custom" class="color-picker-content active">
        <canvas id="color-picker-area" class="color-picker-area" width="236" height="140"></canvas>
        <div class="color-picker-slider-row">
          <div id="color-picker-hue" class="color-picker-hue-slider">
            <div id="color-picker-hue-thumb" class="color-picker-slider-thumb"></div>
          </div>
        </div>
        <div class="color-picker-slider-row">
          <svg class="color-picker-eyedropper" id="color-picker-eyedropper" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M14.5 5.5 19 1l4 4-4.5 4.5M12 8l4 4"/>
          </svg>
          <div id="color-picker-alpha" class="color-picker-alpha-slider">
            <div id="color-picker-alpha-thumb" class="color-picker-slider-thumb"></div>
          </div>
        </div>
        <div class="color-picker-inputs">
          <select id="color-picker-format" class="color-picker-format">
            <option value="hex">Hex</option>
          </select>
          <input id="color-picker-hex-input" class="color-picker-hex-input" type="text" value="" />
          <input id="color-picker-opacity-input" class="color-picker-opacity-input" type="text" value="100%" />
        </div>
      </div>

      <!-- Tab Content: Tailwind -->
      <div id="color-picker-tailwind" class="color-picker-content">
        <div id="color-picker-tailwind-grid" class="color-picker-grid"></div>
      </div>

      <!-- Tab Content: Open Color -->
      <div id="color-picker-open" class="color-picker-content">
        <div id="color-picker-grid" class="color-picker-grid"></div>
      </div>

      <!-- Tab Content: Material -->
      <div id="color-picker-material" class="color-picker-content">
        <div id="color-picker-material-grid" class="color-picker-grid"></div>
      </div>

      <!-- Footer -->
      <div class="color-picker-footer">
        <div id="color-preview" class="color-preview"></div>
        <span id="color-hex" class="color-hex"></span>
      </div>
    `
  }

  // ===========================================================================
  // Setup
  // ===========================================================================

  private cacheElements(): void {
    if (!this.container) return

    this.canvas = this.container.querySelector('#color-picker-area')
    this.hueThumb = this.container.querySelector('#color-picker-hue-thumb')
    this.alphaSlider = this.container.querySelector('#color-picker-alpha')
    this.alphaThumb = this.container.querySelector('#color-picker-alpha-thumb')
    this.hexInput = this.container.querySelector('#color-picker-hex-input')
    this.opacityInput = this.container.querySelector('#color-picker-opacity-input')
    this.preview = this.container.querySelector('#color-preview')
    this.hexDisplay = this.container.querySelector('#color-hex')
    this.tokenGrid = this.container.querySelector('#color-picker-token-grid')
  }

  private setupEventListeners(): void {
    if (!this.container) return

    // Tab switching
    this.container.querySelectorAll('.color-picker-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.getAttribute('data-tab') || 'custom'))
    })

    // Canvas
    this.canvas?.addEventListener('mousedown', e => {
      this.isDraggingCanvas = true
      this.handleCanvasMove(e)
    })

    // Hue slider
    const hueSlider = this.container.querySelector('#color-picker-hue')
    hueSlider?.addEventListener('mousedown', e => {
      this.isDraggingHue = true
      this.handleHueMove(e as MouseEvent)
    })

    // Alpha slider
    this.alphaSlider?.addEventListener('mousedown', e => {
      this.isDraggingAlpha = true
      this.handleAlphaMove(e as MouseEvent)
    })

    // Hex input
    this.hexInput?.addEventListener('input', () => this.handleHexInput())
    this.hexInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        this.selectColor(this.getColor())
      }
    })

    // Eye dropper
    const eyedropper = this.container.querySelector('#color-picker-eyedropper')
    eyedropper?.addEventListener('click', () => this.openEyeDropper())
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDraggingCanvas) this.handleCanvasMove(e)
    if (this.isDraggingHue) this.handleHueMove(e)
    if (this.isDraggingAlpha) this.handleAlphaMove(e)
  }

  private handleMouseUp(): void {
    this.isDraggingCanvas = false
    this.isDraggingHue = false
    this.isDraggingAlpha = false
  }

  // ===========================================================================
  // Tab Switching
  // ===========================================================================

  private switchTab(tabName: string): void {
    if (!this.container) return

    this.currentTab = tabName

    // Update tab buttons
    this.container.querySelectorAll('.color-picker-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName)
    })

    // Update content
    this.container.querySelectorAll('.color-picker-content').forEach(content => {
      content.classList.toggle('active', content.id === `color-picker-${tabName}`)
    })
  }

  // ===========================================================================
  // Grid Building
  // ===========================================================================

  private buildAllGrids(): void {
    this.buildGrid('color-picker-grid', OPEN_COLORS)
    this.buildGrid('color-picker-tailwind-grid', TAILWIND_COLORS)
    this.buildGrid('color-picker-material-grid', MATERIAL_COLORS)
  }

  private buildGrid(gridId: string, colors: ColorScale[]): void {
    const grid = this.container?.querySelector(`#${gridId}`)
    if (!grid) return

    grid.innerHTML = ''

    for (const scale of colors) {
      const col = document.createElement('div')
      col.className = 'color-picker-column'

      for (const hex of scale.shades) {
        const btn = this.createSwatch(hex)
        col.appendChild(btn)
      }

      grid.appendChild(col)
    }
  }

  private createSwatch(hex: string, title?: string): HTMLElement {
    const btn = document.createElement('button')
    btn.className = 'color-swatch'
    btn.style.backgroundColor = hex
    btn.dataset.color = hex.toUpperCase()
    if (title) btn.title = title

    btn.addEventListener('mouseenter', () => {
      this.updatePreview(hex)
      this.config.onPreview?.(hex)
    })

    btn.addEventListener('click', e => {
      e.preventDefault()
      this.selectColor(hex.toUpperCase())
    })

    this.swatchElements.push(btn)
    return btn
  }

  // ===========================================================================
  // Drawing
  // ===========================================================================

  private draw(): void {
    this.drawColorArea()
    this.updateHueSlider()
    this.updateAlphaSlider()
    this.updateInputs()
    this.updatePreview(this.getColor())
  }

  private drawColorArea(): void {
    if (!this.canvas) return
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const width = this.canvas.width
    const height = this.canvas.height

    ctx.clearRect(0, 0, width, height)

    // Base hue color
    const hueRgb = hsvToRgb(this.state.h, 100, 100)
    ctx.fillStyle = `rgb(${hueRgb.r}, ${hueRgb.g}, ${hueRgb.b})`
    ctx.fillRect(0, 0, width, height)

    // White gradient (left to right)
    const whiteGrad = ctx.createLinearGradient(0, 0, width, 0)
    whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = whiteGrad
    ctx.fillRect(0, 0, width, height)

    // Black gradient (top to bottom)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, height)
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = blackGrad
    ctx.fillRect(0, 0, width, height)

    // Cursor
    const cursorX = (this.state.s / 100) * width
    const cursorY = (1 - this.state.v / 100) * height

    ctx.beginPath()
    ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  private updateHueSlider(): void {
    if (!this.hueThumb) return
    const percent = (this.state.h / 360) * 100
    this.hueThumb.style.left = `${percent}%`
  }

  private updateAlphaSlider(): void {
    if (!this.alphaSlider || !this.alphaThumb) return
    const hex = this.getColor()
    this.alphaSlider.style.backgroundImage = `
      linear-gradient(to right, transparent, ${hex}),
      repeating-conic-gradient(#404040 0% 25%, #606060 0% 50%)
    `
    this.alphaThumb.style.left = `${this.state.a * 100}%`
  }

  private updateInputs(): void {
    const hex = this.getColor()
    if (this.hexInput) this.hexInput.value = hex.replace('#', '')
    if (this.opacityInput) this.opacityInput.value = Math.round(this.state.a * 100) + '%'
  }

  private updatePreview(hex: string): void {
    if (this.preview) this.preview.style.backgroundColor = hex
    if (this.hexDisplay) this.hexDisplay.textContent = hex.toUpperCase()
  }

  private updateSelectedSwatch(): void {
    this.swatchElements.forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedSwatchIndex)
    })
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  private handleCanvasMove(e: MouseEvent): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

    this.state.s = (x / rect.width) * 100
    this.state.v = 100 - (y / rect.height) * 100

    this.draw()
    this.config.onPreview?.(this.getColor())
  }

  private handleHueMove(e: MouseEvent): void {
    const slider = this.container?.querySelector('#color-picker-hue')
    if (!slider) return
    const rect = slider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))

    this.state.h = (x / rect.width) * 360

    this.draw()
    this.config.onPreview?.(this.getColor())
  }

  private handleAlphaMove(e: MouseEvent): void {
    if (!this.alphaSlider) return
    const rect = this.alphaSlider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))

    this.state.a = x / rect.width

    this.updateAlphaSlider()
    this.updateInputs()
    this.config.onPreview?.(this.getColor())
  }

  private handleHexInput(): void {
    if (!this.hexInput) return
    const value = this.hexInput.value.replace('#', '')

    if (value.length === 6 && /^[0-9A-Fa-f]{6}$/.test(value)) {
      const hsv = hexToHsv('#' + value)
      this.state.h = hsv.h
      this.state.s = hsv.s
      this.state.v = hsv.v
      this.draw()
      this.config.onPreview?.(this.getColor())
    }
  }

  private async openEyeDropper(): Promise<void> {
    if (!('EyeDropper' in window)) return

    try {
      // @ts-ignore - EyeDropper API
      const dropper = new window.EyeDropper()
      const result = await dropper.open()
      const hex = result.sRGBHex.toUpperCase()
      this.setColor(hex)
      this.config.onPreview?.(hex)
    } catch {
      // User cancelled
    }
  }

  private selectColor(hex: string): void {
    this.config.onSelect?.(hex)
    this.hide()
  }
}

// =============================================================================
// Factory
// =============================================================================

let pickerInstance: FullColorPicker | null = null

export function getFullColorPicker(): FullColorPicker {
  if (!pickerInstance) {
    pickerInstance = new FullColorPicker()
  }
  return pickerInstance
}

export function createFullColorPicker(config: FullColorPickerConfig = {}): FullColorPicker {
  return new FullColorPicker(config)
}
