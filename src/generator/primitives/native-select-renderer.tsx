/**
 * Native Select Renderer
 *
 * Renders a fully styleable native <select> element using CSS `appearance: base-select`.
 * This provides a native select with customizable trigger, picker, and options.
 *
 * Features:
 * - Native <select> with appearance: base-select CSS opt-in
 * - Custom trigger styling via Trigger slot
 * - Custom picker (dropdown) styling via Picker slot
 * - Option styling with hover/checked states
 *
 * Limitations:
 * - Icons inside <option> elements are not supported (HTML spec limitation)
 * - Use a custom dropdown component for icon support
 *
 * Browser Support:
 * - Chrome 134+, Edge 134+ (full support)
 * - Firefox, Safari (in development)
 *
 * @see https://developer.chrome.com/blog/styling-select
 */

import React from 'react'
import type { ASTNode } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'
import { isOptionPrimitive } from './primitive-checkers'

/**
 * Dark UI Default Styles for Select
 * Applied when user doesn't specify styles.
 */
const SELECT_DEFAULTS = {
  select: {
    backgroundColor: '#2A2A2A',
    color: '#E0E0E0',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '13px',
    fontWeight: 400,
    outline: 'none',
    minWidth: '120px',
  } as React.CSSProperties,

  // CSS strings for pseudo-elements (can't be applied via React style prop)
  pickerCSS: `
  background-color: #333;
  border: none;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`,
  optionCSS: `
  padding: 6px 10px;
  border-radius: 3px;
  color: #E0E0E0;
  font-size: 13px;
`,
  optionHoverCSS: `
  background-color: #444;
`,
  optionCheckedCSS: `
  background-color: #3B82F6;
  color: #FFF;
`,
}

interface NativeSelectProps {
  node: ASTNode
  style: React.CSSProperties
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Find a slot child by name (e.g., Trigger, Picker).
 */
function findSlot(node: ASTNode, slotName: string): ASTNode | undefined {
  return node.children.find(child =>
    child.name === slotName ||
    child.name.endsWith(slotName) ||
    child.properties._slotType === slotName
  )
}

/**
 * Find all Option children (direct or nested).
 */
function findOptions(node: ASTNode): ASTNode[] {
  const options: ASTNode[] = []

  for (const child of node.children) {
    if (isOptionPrimitive(child) || child._isListItem) {
      options.push(child)
    }
  }

  return options
}

/**
 * Get the icon from an Option node.
 */
function getOptionIcon(option: ASTNode): string | undefined {
  // Check for Icon child
  const iconChild = option.children.find(child =>
    child.name.toLowerCase() === 'icon' ||
    child.name.toLowerCase().endsWith('icon')
  )

  return iconChild?.content
}

/**
 * Get the label text from an Option node.
 */
function getOptionLabel(option: ASTNode): string {
  // Use content if present
  if (option.content) {
    return option.content
  }

  // Look for text children
  const textChild = option.children.find(child => child.name === '_text')
  if (textChild?.content) {
    return textChild.content
  }

  // Fallback to value
  return (option.properties.value as string) || ''
}

/**
 * Get the value from an Option node.
 */
function getOptionValue(option: ASTNode): string {
  if (typeof option.properties.value === 'string') {
    return option.properties.value
  }

  // Fallback to content or label
  return option.content || getOptionLabel(option)
}

/**
 * Render the native select element.
 */
export function renderNativeSelect({
  node,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick
}: NativeSelectProps): React.JSX.Element {
  const triggerSlot = findSlot(node, 'Trigger')
  const pickerSlot = findSlot(node, 'Picker')
  const options = findOptions(node)

  const placeholder = (node.properties.placeholder as string) || 'Select...'
  const disabled = node.properties.disabled === true

  // Build trigger styles
  const triggerStyle: React.CSSProperties = triggerSlot
    ? propertiesToStyle(triggerSlot.properties, false, triggerSlot.name)
    : {}

  // Base select styles with appearance: base-select
  // Note: Picker icon is styled via CSS ::picker-icon pseudo-element, not JSX
  const selectStyle: React.CSSProperties = {
    appearance: 'base-select' as React.CSSProperties['appearance'],
    // Dark UI defaults first
    ...SELECT_DEFAULTS.select,
    // Apply trigger styles directly to select
    ...triggerStyle,
    // Override with node's own styles
    ...style,
    // Ensure proper display
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  // Generate unique class name for CSS targeting
  const selectClassName = node.name

  return (
    <select
      key={node.id}
      data-id={node.id}
      className={selectClassName}
      style={selectStyle}
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      defaultValue=""
    >
      {/* Note: appearance: base-select customizes the trigger via CSS pseudo-elements.
          The <selectedcontent> element and picker icon are styled via:
          - ::picker-icon for the dropdown chevron
          - ::picker(select) for the dropdown container
          No <button> element is needed inside <select>. */}

      {/* Placeholder option */}
      <option value="" disabled hidden>
        {placeholder}
      </option>

      {/* Option elements */}
      {options.map((option, index) => {
        const value = getOptionValue(option)
        const label = getOptionLabel(option)
        const icon = getOptionIcon(option)
        const isDisabled = option.properties.disabled === true

        // Note: HTML spec only allows text content inside <option> elements.
        // Icons cannot be rendered inside options - use CSS or custom select for icons.
        return (
          <option
            key={option.id || `option-${index}`}
            value={value}
            disabled={isDisabled}
            data-id={option.id}
            data-icon={icon || undefined}
          >
            {label}
          </option>
        )
      })}
    </select>
  )
}

/**
 * Generate CSS for native select with appearance: base-select.
 * This creates the necessary pseudo-element styles.
 * Dark UI defaults are applied, user styles override.
 */
export function generateSelectCSS(node: ASTNode): string {
  const className = node.name
  const triggerSlot = findSlot(node, 'Trigger')
  const pickerSlot = findSlot(node, 'Picker')
  const options = findOptions(node)
  const optionTemplate = options[0] // Use first option as template for styles

  const rules: string[] = []

  // Base appearance opt-in
  rules.push(`.${className}, .${className}::picker(select) {
  appearance: base-select;
}`)

  // Trigger styles (applied directly to select)
  if (triggerSlot) {
    const triggerStyles = propertiesToStyle(triggerSlot.properties, false, triggerSlot.name)
    const cssProps = Object.entries(triggerStyles)
      .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
      .join('\n  ')
    if (cssProps) {
      rules.push(`.${className} {
  ${cssProps}
}`)
    }
  }

  // Picker icon styles (chevron)
  rules.push(`.${className}::picker-icon {
  transition: rotate 0.2s ease;
  color: #888;
}

.${className}:open::picker-icon {
  rotate: 180deg;
}`)

  // Picker (dropdown) styles - dark defaults + user overrides
  const pickerStyles = pickerSlot
    ? propertiesToStyle(pickerSlot.properties, true, pickerSlot.name)
    : {}
  const pickerCssProps = Object.entries(pickerStyles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join('\n  ')

  rules.push(`.${className}::picker(select) {
${SELECT_DEFAULTS.pickerCSS}${pickerCssProps ? '\n  ' + pickerCssProps : ''}
}`)

  // Option styles - dark defaults + user overrides
  const optionStyles = optionTemplate
    ? propertiesToStyle(optionTemplate.properties, false, optionTemplate.name)
    : {}
  const optionCssProps = Object.entries(optionStyles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join('\n  ')

  rules.push(`.${className} option {
${SELECT_DEFAULTS.optionCSS}${optionCssProps ? '\n  ' + optionCssProps : ''}
}`)

  // Hover state - dark defaults + user overrides
  const hoverState = optionTemplate?.states?.find(s => s.name === 'hover')
  const hoverStyles = hoverState
    ? propertiesToStyle(hoverState.properties, false, optionTemplate!.name)
    : {}
  const hoverCssProps = Object.entries(hoverStyles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join('\n  ')

  rules.push(`.${className} option:hover {
${SELECT_DEFAULTS.optionHoverCSS}${hoverCssProps ? '\n  ' + hoverCssProps : ''}
}`)

  // Checked/selected state - dark defaults + user overrides
  const checkedState = optionTemplate?.states?.find(s => s.name === 'checked' || s.name === 'selected')
  const checkedStyles = checkedState
    ? propertiesToStyle(checkedState.properties, false, optionTemplate!.name)
    : {}
  const checkedCssProps = Object.entries(checkedStyles)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join('\n  ')

  rules.push(`.${className} option:checked {
${SELECT_DEFAULTS.optionCheckedCSS}${checkedCssProps ? '\n  ' + checkedCssProps : ''}
}`)

  return rules.join('\n\n')
}

/**
 * Convert camelCase to kebab-case.
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
