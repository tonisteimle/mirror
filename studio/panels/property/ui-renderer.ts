/**
 * Property Panel UI Renderer
 *
 * Handles rendering of property panel UI elements.
 */

import type { ExtractedProperty, ExtractedElement, PropertyCategory, PropertyInputConfig, ChildElement, CategoryName } from './types'
import { CATEGORY_INFO } from './types'

export interface UIRendererConfig {
  showIcons?: boolean
  collapsibleCategories?: boolean
  inlineEditing?: boolean
}

export class UIRenderer {
  private config: Required<UIRendererConfig>
  private collapsedCategories: Set<CategoryName> = new Set()

  constructor(config: UIRendererConfig = {}) {
    this.config = {
      showIcons: true,
      collapsibleCategories: true,
      inlineEditing: true,
      ...config,
    }
  }

  render(element: ExtractedElement, callbacks: {
    onPropertyChange: (property: string, value: string) => void
    onPropertyRemove: (property: string) => void
    onChildSelect?: (childId: string) => void
  }): HTMLElement {
    const container = document.createElement('div')
    container.className = 'property-panel-content'

    // Header with element info
    container.appendChild(this.renderHeader(element))

    // Render categories from element.categories
    for (const category of element.categories) {
      if (category.properties.length > 0) {
        container.appendChild(
          this.renderCategory(
            category.name as CategoryName,
            category.properties,
            element.nodeId,
            callbacks
          )
        )
      }
    }

    return container
  }

  renderHeader(element: ExtractedElement): HTMLElement {
    const header = document.createElement('div')
    header.className = 'property-panel-header'

    const title = document.createElement('h3')
    title.className = 'property-panel-title'
    title.textContent = element.instanceName || element.componentName

    const type = document.createElement('span')
    type.className = 'property-panel-type'
    type.textContent = element.componentName

    header.appendChild(title)
    if (element.instanceName && element.instanceName !== element.componentName) {
      header.appendChild(type)
    }

    return header
  }

  renderCategory(
    category: CategoryName,
    properties: ExtractedProperty[],
    nodeId: string,
    callbacks: {
      onPropertyChange: (property: string, value: string) => void
      onPropertyRemove: (property: string) => void
    }
  ): HTMLElement {
    const section = document.createElement('div')
    section.className = 'property-panel-category'
    section.setAttribute('data-category', category)

    const info = CATEGORY_INFO[category] || { label: category, icon: 'other', order: 99 }
    const isCollapsed = this.collapsedCategories.has(category)

    // Category header
    const header = document.createElement('div')
    header.className = `property-panel-category-header ${isCollapsed ? 'collapsed' : ''}`

    if (this.config.showIcons) {
      const icon = document.createElement('span')
      icon.className = `property-panel-icon icon-${info.icon}`
      header.appendChild(icon)
    }

    const label = document.createElement('span')
    label.className = 'property-panel-category-label'
    label.textContent = info.label
    header.appendChild(label)

    const count = document.createElement('span')
    count.className = 'property-panel-category-count'
    count.textContent = `(${properties.length})`
    header.appendChild(count)

    if (this.config.collapsibleCategories) {
      const toggle = document.createElement('span')
      toggle.className = 'property-panel-category-toggle'
      toggle.textContent = isCollapsed ? '+' : '-'
      header.appendChild(toggle)

      header.onclick = () => {
        if (isCollapsed) {
          this.collapsedCategories.delete(category)
        } else {
          this.collapsedCategories.add(category)
        }
        section.classList.toggle('collapsed', !isCollapsed)
        toggle.textContent = isCollapsed ? '-' : '+'
        header.classList.toggle('collapsed', !isCollapsed)
      }
    }

    section.appendChild(header)

    // Properties list
    const list = document.createElement('div')
    list.className = `property-panel-properties ${isCollapsed ? 'hidden' : ''}`

    for (const property of properties) {
      list.appendChild(
        this.renderProperty({
          property,
          nodeId,
          onChange: (value) => callbacks.onPropertyChange(property.name, value),
          onRemove: () => callbacks.onPropertyRemove(property.name),
        })
      )
    }

    section.appendChild(list)
    return section
  }

  renderProperty(config: PropertyInputConfig): HTMLElement {
    const { property, onChange, onRemove, onFocus, onBlur } = config

    const row = document.createElement('div')
    row.className = 'property-panel-row'
    row.setAttribute('data-property', property.name)

    // Label
    const label = document.createElement('label')
    label.className = 'property-panel-label'
    label.textContent = property.name
    if (property.description) {
      label.title = property.description
    }
    row.appendChild(label)

    // Input
    const input = this.renderInput(property, onChange, onFocus, onBlur)
    row.appendChild(input)

    // Remove button
    const removeBtn = document.createElement('button')
    removeBtn.className = 'property-panel-remove'
    removeBtn.innerHTML = '&times;'
    removeBtn.title = 'Remove property'
    removeBtn.onclick = (e) => {
      e.stopPropagation()
      onRemove()
    }
    row.appendChild(removeBtn)

    return row
  }

  renderInput(
    property: ExtractedProperty,
    onChange: (value: string) => void,
    onFocus?: () => void,
    onBlur?: () => void
  ): HTMLElement {
    const container = document.createElement('div')
    container.className = 'property-panel-input-container'

    // Color swatch for color properties
    if (property.type === 'color' && property.value) {
      const swatch = document.createElement('span')
      swatch.className = 'property-panel-color-swatch'
      swatch.style.backgroundColor = property.value
      swatch.setAttribute('data-color-trigger', 'true')
      container.appendChild(swatch)
    }

    // Input element
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'property-panel-input'
    input.value = property.value || ''
    input.placeholder = ''
    input.setAttribute('data-property', property.name)

    // Handle changes
    input.addEventListener('change', () => {
      onChange(input.value)
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onChange(input.value)
        input.blur()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        input.value = property.value || ''
        input.blur()
      }
    })

    if (onFocus) input.addEventListener('focus', onFocus)
    if (onBlur) input.addEventListener('blur', onBlur)

    container.appendChild(input)
    return container
  }

  renderChildList(
    children: ChildElement[],
    onSelect?: (childId: string) => void
  ): HTMLElement {
    const section = document.createElement('div')
    section.className = 'property-panel-children'

    const header = document.createElement('div')
    header.className = 'property-panel-children-header'
    header.textContent = `Children (${children.length})`
    section.appendChild(header)

    const list = document.createElement('ul')
    list.className = 'property-panel-children-list'

    for (const child of children) {
      const item = document.createElement('li')
      item.className = 'property-panel-child-item'
      item.setAttribute('data-child-id', child.id)

      const name = document.createElement('span')
      name.className = 'property-panel-child-name'
      name.textContent = child.name || child.type
      item.appendChild(name)

      const type = document.createElement('span')
      type.className = 'property-panel-child-type'
      type.textContent = child.type
      item.appendChild(type)

      if (onSelect) {
        item.onclick = () => onSelect(child.id)
        item.classList.add('clickable')
      }

      list.appendChild(item)
    }

    section.appendChild(list)
    return section
  }
}
