/**
 * Sizing Section - Width and Height
 *
 * Renders width and height controls with hug/full toggles, numeric inputs,
 * and device size presets dropdown.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import { renderTokenButtonGroup } from '../utils/render-token-buttons'

/**
 * Sizing icons
 */
const SIZE_ICONS = {
  widthHug: '<path d="M4 3v8M10 3v8M1 7h3M10 7h3"/>',
  widthFull: '<path d="M2 3v8M12 3v8M2 7h10"/>',
  heightHug: '<path d="M3 4h8M3 10h8M7 1v3M7 10v3"/>',
  heightFull: '<path d="M3 2h8M3 12h8M7 2v10"/>',
}

/**
 * Device size presets
 */
const DEVICE_PRESETS: { label: string; value: string; w: number; h: number }[] = [
  { label: 'Custom', value: '', w: 0, h: 0 },
  { label: 'Mobile (375×812)', value: 'mobile', w: 375, h: 812 },
  { label: 'Tablet (768×1024)', value: 'tablet', w: 768, h: 1024 },
  { label: 'Desktop (1440×900)', value: 'desktop', w: 1440, h: 900 },
]

/**
 * Detect device preset from width/height values
 */
function detectDevice(width: string, height: string): string {
  const w = parseInt(width, 10)
  const h = parseInt(height, 10)
  if (isNaN(w) || isNaN(h)) return ''

  for (const preset of DEVICE_PRESETS) {
    if (preset.w === w && preset.h === h) {
      return preset.value
    }
  }
  return ''
}

/**
 * Sizing Section class
 */
export class SizingSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Size' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const category = data.category
    if (!category) return ''

    // For Icon primitive, show icon-size (is) instead of w/h
    if (data.primitive === 'Icon') {
      return this.renderIconSize(data, category)
    }

    const props = category.properties

    // Find width and height values
    const widthProp = props.find(p => p.name === 'width' || p.name === 'w')
    const heightProp = props.find(p => p.name === 'height' || p.name === 'h')

    const widthValue = widthProp?.value || ''
    const heightValue = heightProp?.value || ''

    // Check for hug/full values
    const widthIsHug = widthValue === 'hug'
    const widthIsFull = widthValue === 'full'
    const heightIsHug = heightValue === 'hug'
    const heightIsFull = heightValue === 'full'

    // Resolve token values for display
    const widthIsToken = widthValue.startsWith('$')
    const heightIsToken = heightValue.startsWith('$')

    let widthDisplayValue = widthValue
    let widthInputClass = 'prop-input'
    if (widthIsToken && data.resolveTokenValue) {
      // Pass 'w' as property type for short references like "$s" → "$s.w"
      const resolved = data.resolveTokenValue(widthValue, 'w')
      if (resolved) {
        widthDisplayValue = resolved
        widthInputClass = 'prop-input token-resolved'
      }
    }

    let heightDisplayValue = heightValue
    let heightInputClass = 'prop-input'
    if (heightIsToken && data.resolveTokenValue) {
      // Pass 'h' as property type for short references like "$s" → "$s.h"
      const resolved = data.resolveTokenValue(heightValue, 'h')
      if (resolved) {
        heightDisplayValue = resolved
        heightInputClass = 'prop-input token-resolved'
      }
    }

    // Detect current device preset from w/h values
    const currentDevice = detectDevice(widthValue, heightValue)

    // Build device dropdown options
    const deviceOptionsHtml = DEVICE_PRESETS.map(
      preset =>
        `<option value="${preset.value}" ${currentDevice === preset.value ? 'selected' : ''}>${preset.label}</option>`
    ).join('')

    // Token buttons (width + height tokens come pre-loaded in spacingTokens;
    // filter by suffix the same way the other sections do).
    const wTokenItems = (data.spacingTokens || [])
      .filter(t => t.fullName.endsWith('.w'))
      .map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))
    const hTokenItems = (data.spacingTokens || [])
      .filter(t => t.fullName.endsWith('.h'))
      .map(t => ({ label: t.name, value: t.value, tokenRef: `$${t.fullName}` }))

    const widthTokenGroup =
      wTokenItems.length > 0
        ? `<div class="token-group">${renderTokenButtonGroup({ activeValue: widthValue, propKey: 'w', tokens: wTokenItems })}</div>`
        : ''
    const heightTokenGroup =
      hTokenItems.length > 0
        ? `<div class="token-group">${renderTokenButtonGroup({ activeValue: heightValue, propKey: 'h', tokens: hTokenItems })}</div>`
        : ''

    return `
      <div class="section">
        <div class="section-label">Size</div>
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Device</span>
            <div class="prop-content">
              <select class="prop-select" data-device-preset>
                ${deviceOptionsHtml}
              </select>
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Width</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${widthIsHug ? 'active' : ''}" data-size-mode="width-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    ${SIZE_ICONS.widthHug}
                  </svg>
                </button>
                <button class="toggle-btn ${widthIsFull ? 'active' : ''}" data-size-mode="width-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    ${SIZE_ICONS.widthFull}
                  </svg>
                </button>
              </div>
              ${widthTokenGroup}
              <input type="text" class="${widthInputClass}" autocomplete="off" value="${this.deps.escapeHtml(widthDisplayValue)}" data-prop="width" data-token-ref="${widthIsToken ? this.deps.escapeHtml(widthValue) : ''}" placeholder="auto">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">Height</span>
            <div class="prop-content">
              <div class="toggle-group">
                <button class="toggle-btn ${heightIsHug ? 'active' : ''}" data-size-mode="height-hug" title="Hug Content">
                  <svg class="icon" viewBox="0 0 14 14">
                    ${SIZE_ICONS.heightHug}
                  </svg>
                </button>
                <button class="toggle-btn ${heightIsFull ? 'active' : ''}" data-size-mode="height-full" title="Fill Container">
                  <svg class="icon" viewBox="0 0 14 14">
                    ${SIZE_ICONS.heightFull}
                  </svg>
                </button>
              </div>
              ${heightTokenGroup}
              <input type="text" class="${heightInputClass}" autocomplete="off" value="${this.deps.escapeHtml(heightDisplayValue)}" data-prop="height" data-token-ref="${heightIsToken ? this.deps.escapeHtml(heightValue) : ''}" placeholder="auto">
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render simplified sizing for Icon (just icon-size)
   */
  private renderIconSize(
    data: SectionData,
    category: { properties: Array<{ name: string; value: string }> }
  ): string {
    const props = category.properties
    const allProps = data.allProperties || []

    // Find icon-size (is) from allProperties since it might not be in sizing category
    const isProp = allProps.find((p: { name: string }) => p.name === 'icon-size' || p.name === 'is')
    const isValue = isProp?.value || '20'

    return `
      <div class="section">
        <div class="section-content">
          <div class="prop-row">
            <span class="prop-label">Size</span>
            <div class="prop-content">
              <input type="text" class="prop-input" autocomplete="off" value="${this.deps.escapeHtml(isValue)}" data-prop="icon-size" placeholder="20">
            </div>
          </div>
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      'select[data-device-preset]': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          const deviceValue = select.value
          if (!deviceValue) return // Custom selected, don't change anything

          // Find the preset and set both width and height
          const preset = DEVICE_PRESETS.find(p => p.value === deviceValue)
          if (preset) {
            // Use __DEVICE_PRESET__ as a special signal to set both w and h
            this.deps.onPropertyChange('__DEVICE_PRESET__', deviceValue, 'dropdown')
          }
        },
      },
      '.toggle-btn[data-size-mode]': {
        click: (e: Event, target: HTMLElement) => {
          const mode = target.dataset.sizeMode
          if (mode) {
            // Parse mode: "width-hug" -> prop: "width", value: "hug"
            const [prop, value] = mode.split('-')
            this.deps.onPropertyChange(prop, value, 'toggle')
          }
        },
      },
      'input[data-prop="width"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('width', input.value, 'input')
        },
      },
      'input[data-prop="height"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('height', input.value, 'input')
        },
      },
      'input[data-prop="icon-size"]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          this.deps.onPropertyChange('is', input.value, 'input')
        },
      },
      // Width/height token buttons. Both the token-btn and the
      // token-dropdown-item carry data-{w,h}-token, so a single
      // selector pair covers visible + dropdown variants.
      '.token-btn[data-w-token], .token-dropdown-item[data-w-token]': {
        click: (_e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.wToken
          if (value) {
            this.deps.onPropertyChange('width', value, 'token')
          }
          target.closest('.token-dropdown')?.classList.remove('open')
        },
      },
      '.token-btn[data-h-token], .token-dropdown-item[data-h-token]': {
        click: (_e: Event, target: HTMLElement) => {
          const tokenRef = target.dataset.tokenRef
          const value = tokenRef || target.dataset.hToken
          if (value) {
            this.deps.onPropertyChange('height', value, 'token')
          }
          target.closest('.token-dropdown')?.classList.remove('open')
        },
      },
      // Generic more-button toggle for width/height token dropdowns.
      // (Other sections own their own per-section more-btn handler;
      // this one fires when the more-btn doesn't match those — within
      // the sizing section's DOM it's the only one.)
      '.token-more-btn[data-w-token-dir], .token-more-btn[data-h-token-dir]': {
        click: (e: Event, target: HTMLElement) => {
          e.stopPropagation()
          const container = target.closest('.token-more-container')
          const dropdown = container?.querySelector('.token-dropdown') as HTMLElement | null
          if (!dropdown) return
          const isOpen = dropdown.classList.contains('open')
          document.querySelectorAll('.token-dropdown.open').forEach(d => d.classList.remove('open'))
          if (!isOpen) dropdown.classList.add('open')
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createSizingSection(deps: SectionDependencies): SizingSection {
  return new SizingSection(deps)
}
