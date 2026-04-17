/**
 * Content Section - Text, Icon, Placeholder, Href, Src
 *
 * Renders content controls based on element type:
 * - Text, Button: text content
 * - Link: text, href
 * - Icon: icon name with picker
 * - Input, Textarea: placeholder
 * - Image: src
 * - Frame: (section hidden)
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'

/**
 * Element types that support content editing
 * Maps component name to array of property fields to show
 *
 * Property names must match the schema:
 * - content: Text content (for Text, Button, Link, Icon, etc.)
 * - placeholder: Input placeholder text
 * - href: Link URL
 * - src: Image source URL
 */
const CONTENT_ELEMENTS: Record<string, ContentField[]> = {
  Text: [{ field: 'content', label: 'Text', placeholder: 'Enter text...' }],
  Button: [{ field: 'content', label: 'Text', placeholder: 'Button text...' }],
  Link: [
    { field: 'content', label: 'Text', placeholder: 'Link text...' },
    { field: 'href', label: 'URL', placeholder: 'https://...' },
  ],
  Icon: [{ field: 'content', label: 'Icon', placeholder: 'search', isIcon: true }],
  Input: [{ field: 'placeholder', label: 'Placeholder', placeholder: 'Placeholder text...' }],
  Textarea: [{ field: 'placeholder', label: 'Placeholder', placeholder: 'Placeholder text...' }],
  Image: [{ field: 'src', label: 'Path', placeholder: './assets/image.jpg' }],
  Label: [{ field: 'content', label: 'Text', placeholder: 'Label text...' }],
  H1: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
  H2: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
  H3: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
  H4: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
  H5: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
  H6: [{ field: 'content', label: 'Text', placeholder: 'Heading...' }],
}

/**
 * Content field configuration
 */
interface ContentField {
  field: string // Property name in schema
  label: string // Display label
  placeholder: string // Input placeholder
  isIcon?: boolean // Show icon picker button
}

/**
 * Icon picker button SVG (search/magnifying glass)
 */
const PICKER_ICON =
  '<path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'

/**
 * Content Section class
 */
export class ContentSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Content' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const element = data.currentElement
    if (!element) return ''

    // Get supported fields for this element type
    const fields = this.getFieldsForElement(element.componentName)
    if (fields.length === 0) return ''

    // Get current property values
    const allProps = data.allProperties || []
    const rows = fields.map(field => this.renderField(field, allProps)).join('')

    return `
      <div class="section">
        <div class="section-label">Content</div>
        <div class="section-content">
          ${rows}
        </div>
      </div>
    `
  }

  /**
   * Get the content fields for a given element type
   */
  private getFieldsForElement(componentName: string): ContentField[] {
    // Check direct mapping
    if (CONTENT_ELEMENTS[componentName]) {
      return CONTENT_ELEMENTS[componentName]
    }

    // Check if it might be a custom component extending a primitive
    // For now, treat unknown components as having no content fields
    return []
  }

  /**
   * Render a single content field
   */
  private renderField(
    fieldConfig: ContentField,
    allProps: Array<{ name: string; value: string }>
  ): string {
    const { field, label, placeholder, isIcon } = fieldConfig
    const prop = allProps.find(p => p.name === field)
    const value = prop?.value || ''

    // Icon field with picker button
    if (isIcon) {
      return `
        <div class="prop-row">
          <span class="prop-label">${this.deps.escapeHtml(label)}</span>
          <div class="prop-content pp-icon-field">
            <input type="text" class="prop-input" value="${this.deps.escapeHtml(value)}" data-content-field="${field}" placeholder="${this.deps.escapeHtml(placeholder)}" autocomplete="off">
            <button class="pp-icon-picker-btn" data-open-icon-picker title="Choose icon">
              <svg class="icon" viewBox="0 0 24 24">${PICKER_ICON}</svg>
            </button>
          </div>
        </div>
      `
    }

    // Regular text input
    return `
      <div class="prop-row">
        <span class="prop-label">${this.deps.escapeHtml(label)}</span>
        <div class="prop-content">
          <input type="text" class="prop-input wide" value="${this.deps.escapeHtml(value)}" data-content-field="${field}" placeholder="${this.deps.escapeHtml(placeholder)}" autocomplete="off">
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      'input[data-content-field]': {
        input: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const field = input.dataset.contentField
          if (field) {
            this.deps.onPropertyChange(field, input.value, 'input')
          }
        },
      },
      'button[data-open-icon-picker]': {
        click: (e: Event, target: HTMLElement) => {
          // Emit event to open the existing IconPicker
          // The PropertyPanelView will handle this and connect to the existing picker
          this.deps.onPropertyChange('__OPEN_ICON_PICKER__', '', 'button')
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createContentSection(deps: SectionDependencies): ContentSection {
  return new ContentSection(deps)
}
