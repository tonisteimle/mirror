/**
 * Animation Picker Module
 */

import { BasePicker, KeyboardNav, type PickerConfig, type PickerCallbacks } from '../base'
import { ANIMATION_PRESETS, getPresetsByCategory, getAnimationCategories, getPreset, type AnimationPreset } from './presets'

export { ANIMATION_PRESETS, getPresetsByCategory, getAnimationCategories, getPreset, type AnimationPreset }

export interface AnimationPickerConfig extends Partial<PickerConfig> {
  presets?: AnimationPreset[]
  showPreview?: boolean
  previewElement?: HTMLElement
}

export class AnimationPicker extends BasePicker {
  private presets: AnimationPreset[]
  private filteredPresets: AnimationPreset[]
  private showPreview: boolean
  private previewElement: HTMLElement | null
  private activeCategory: string | null = null
  private presetElements: HTMLElement[] = []
  private previewTarget: HTMLElement | null = null

  constructor(config: AnimationPickerConfig, callbacks: PickerCallbacks) {
    super(config, callbacks)

    this.presets = config.presets || ANIMATION_PRESETS
    this.filteredPresets = this.presets
    this.showPreview = config.showPreview ?? true
    this.previewElement = config.previewElement || null
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'animation-picker'
    this.presetElements = []

    // Categories
    container.appendChild(this.renderCategories())

    // Presets list
    const list = document.createElement('div')
    list.className = 'animation-picker-list'
    list.appendChild(this.renderPresets())
    container.appendChild(list)

    // Preview area
    if (this.showPreview) {
      container.appendChild(this.renderPreviewArea())
    }

    // Setup keyboard navigation
    this.setupKeyboardNav()

    return container
  }

  getValue(): string {
    return ''
  }

  setValue(value: string): void {
    // Could highlight selected preset
  }

  previewAnimation(preset: AnimationPreset): void {
    if (!this.previewTarget) return

    // Remove any existing animation
    this.stopPreview()

    // Inject keyframes
    const styleId = 'animation-preview-style'
    let style = document.getElementById(styleId) as HTMLStyleElement
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = preset.keyframes

    // Apply animation
    const animationName = preset.keyframes.match(/@keyframes\s+(\w+)/)?.[1] || preset.name
    this.previewTarget.style.animation = `${animationName} ${preset.duration} ${preset.easing}`

    // Reset after animation
    this.previewTarget.addEventListener('animationend', () => {
      this.previewTarget!.style.animation = ''
    }, { once: true })
  }

  stopPreview(): void {
    if (this.previewTarget) {
      this.previewTarget.style.animation = ''
    }
  }

  selectPreset(name: string): void {
    const preset = this.presets.find(p => p.name === name)
    if (preset) {
      this.selectValue(preset.name)
    }
  }

  getSelectedPreset(): AnimationPreset | null {
    if (!this.isOpen || !this.keyboardNav) return null
    const index = this.getSelectedIndex()
    return this.filteredPresets[index] ?? null
  }

  /**
   * Show the picker at a specific position (for TriggerManager)
   */
  showAt(x: number, y: number): void {
    // Create a temporary anchor element
    const anchor = document.createElement('div')
    anchor.style.position = 'fixed'
    anchor.style.left = `${x}px`
    anchor.style.top = `${y}px`
    anchor.style.width = '0'
    anchor.style.height = '0'
    document.body.appendChild(anchor)

    // Show using the base class method
    this.show(anchor)

    // Remove the anchor
    anchor.remove()

    // Override the position to be exact
    if (this.element) {
      this.element.style.left = `${x}px`
      this.element.style.top = `${y}px`
    }
  }

  /**
   * Navigate to a specific direction (for TriggerManager)
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.keyboardNav) return

    switch (direction) {
      case 'up':
        this.keyboardNav.moveUp()
        break
      case 'down':
        this.keyboardNav.moveDown()
        break
      case 'left':
        this.keyboardNav.moveLeft()
        break
      case 'right':
        this.keyboardNav.moveRight()
        break
    }
  }

  /**
   * Get the selected preset index
   */
  getSelectedIndex(): number {
    return this.keyboardNav?.getSelectedIndex() ?? 0
  }

  /**
   * Get the selected value (preset name)
   */
  getSelectedValue(): string | undefined {
    const preset = this.getSelectedPreset()
    return preset?.name
  }

  /**
   * Filter presets by text (for TriggerManager)
   */
  filter(text: string): void {
    const lowerText = text.toLowerCase()
    this.filteredPresets = this.presets.filter(p =>
      p.name.toLowerCase().includes(lowerText) ||
      p.label.toLowerCase().includes(lowerText) ||
      p.category.toLowerCase().includes(lowerText)
    )
    this.refreshList()
  }

  /**
   * Search presets
   */
  search(query: string): void {
    this.filter(query)
  }

  setCategory(category: string | null): void {
    this.activeCategory = category
    this.filteredPresets = category
      ? getPresetsByCategory(category)
      : this.presets
    this.refreshList()
    this.updateCategoryButtons()
  }

  private renderCategories(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'animation-picker-categories'

    // All button
    const allBtn = document.createElement('button')
    allBtn.className = `animation-picker-category-btn ${this.activeCategory === null ? 'active' : ''}`
    allBtn.textContent = 'All'
    allBtn.setAttribute('data-category', '')
    allBtn.onclick = () => this.setCategory(null)
    container.appendChild(allBtn)

    // Category buttons
    for (const cat of getAnimationCategories()) {
      const btn = document.createElement('button')
      btn.className = `animation-picker-category-btn ${this.activeCategory === cat ? 'active' : ''}`
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1)
      btn.setAttribute('data-category', cat)
      btn.onclick = () => this.setCategory(cat)
      container.appendChild(btn)
    }

    return container
  }

  private renderPresets(): DocumentFragment {
    const fragment = document.createDocumentFragment()
    this.presetElements = []

    for (const preset of this.filteredPresets) {
      fragment.appendChild(this.renderPreset(preset))
    }

    return fragment
  }

  private renderPreset(preset: AnimationPreset): HTMLElement {
    const item = document.createElement('button')
    item.className = 'animation-picker-item'
    item.setAttribute('data-animation', preset.name)
    item.setAttribute('role', 'option')

    const name = document.createElement('span')
    name.className = 'animation-picker-item-name'
    name.textContent = preset.label
    item.appendChild(name)

    const info = document.createElement('span')
    info.className = 'animation-picker-item-info'
    info.textContent = `${preset.duration} ${preset.easing}`
    item.appendChild(info)

    item.onclick = () => {
      this.selectValue(preset.name)
    }

    item.onmouseenter = () => {
      if (this.showPreview) {
        this.previewAnimation(preset)
      }
    }

    this.presetElements.push(item)
    return item
  }

  private renderPreviewArea(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'animation-picker-preview'

    const box = document.createElement('div')
    box.className = 'animation-picker-preview-box'
    box.textContent = 'Preview'
    container.appendChild(box)

    this.previewTarget = box

    return container
  }

  private refreshList(): void {
    if (!this.isOpen || !this.element) return

    const list = this.element.querySelector('.animation-picker-list')
    if (list) {
      this.presetElements = []
      list.innerHTML = ''
      list.appendChild(this.renderPresets())
      this.setupKeyboardNav()
    }
  }

  private updateCategoryButtons(): void {
    if (!this.element) return

    this.element.querySelectorAll('.animation-picker-category-btn').forEach(btn => {
      const cat = btn.getAttribute('data-category')
      btn.classList.toggle('active', cat === (this.activeCategory || ''))
    })
  }

  private setupKeyboardNav(): void {
    if (this.presetElements.length > 0) {
      this.keyboardNav = new KeyboardNav({
        orientation: 'vertical',
        wrap: true,
        onSelect: (item) => {
          const name = item.getAttribute('data-animation')
          if (name) {
            this.selectValue(name)
          }
        },
        onCancel: () => this.hide(),
      })
      this.keyboardNav.setItems(this.presetElements)
    } else {
      this.keyboardNav = null
    }
  }
}

/**
 * Factory function
 */
export function createAnimationPicker(
  config: AnimationPickerConfig,
  callbacks: PickerCallbacks
): AnimationPicker {
  return new AnimationPicker(config, callbacks)
}
