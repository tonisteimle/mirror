/**
 * Property Panel Component Types
 *
 * Shared types for all property panel UI components.
 */

// ============================================
// Base Types
// ============================================

export interface BaseComponentConfig {
  /** CSS class to add to root element */
  className?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Test ID for automated testing */
  testId?: string
}

// ============================================
// Section
// ============================================

export interface SectionConfig extends BaseComponentConfig {
  /** Section label text */
  label: string
  /** Icon name (without 'icon-' prefix) */
  icon?: string
  /** Whether section starts collapsed */
  collapsed?: boolean
  /** Called when collapse state changes */
  onToggle?: (collapsed: boolean) => void
}

// ============================================
// PropRow
// ============================================

export interface PropRowConfig extends BaseComponentConfig {
  /** Label text */
  label: string
  /** Tooltip for the label */
  tooltip?: string
  /** Whether label indicates an override (from template) */
  isOverride?: boolean
}

// ============================================
// ToggleGroup
// ============================================

export interface ToggleOption<T = string> {
  /** Value when selected */
  value: T
  /** Display label (optional if icon provided) */
  label?: string
  /** Icon SVG content or icon name */
  icon?: string
  /** Tooltip text */
  title?: string
  /** Whether this option is disabled */
  disabled?: boolean
}

export interface ToggleGroupConfig<T = string> extends BaseComponentConfig {
  /** Available options */
  options: ToggleOption<T>[]
  /** Currently selected value(s) */
  value: T | T[]
  /** Called when selection changes */
  onChange: (value: T) => void
  /** Allow multiple selections */
  multiSelect?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
}

// ============================================
// ColorInput
// ============================================

export interface ColorInputConfig extends BaseComponentConfig {
  /** Current color value (hex) */
  value: string
  /** Called when color changes */
  onChange: (color: string) => void
  /** Show color picker button */
  showPicker?: boolean
  /** Called when picker should open */
  onPickerOpen?: (anchor: HTMLElement) => void
  /** Placeholder text */
  placeholder?: string
}

// ============================================
// AlignGrid
// ============================================

export type AlignPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface AlignGridConfig extends BaseComponentConfig {
  /** Currently selected position */
  value: AlignPosition | null
  /** Called when position changes */
  onChange: (position: AlignPosition) => void
  /** Show only corners (4 cells) */
  cornersOnly?: boolean
}

// ============================================
// Select
// ============================================

export interface SelectOption<T = string> {
  /** Option value */
  value: T
  /** Display label */
  label: string
  /** Whether option is disabled */
  disabled?: boolean
}

export interface SelectConfig<T = string> extends BaseComponentConfig {
  /** Available options */
  options: SelectOption<T>[]
  /** Currently selected value */
  value: T | null
  /** Called when selection changes */
  onChange: (value: T) => void
  /** Placeholder when no selection */
  placeholder?: string
}

// ============================================
// Input
// ============================================

export interface InputConfig extends BaseComponentConfig {
  /** Current value */
  value: string
  /** Called when value changes (on blur/enter) */
  onChange: (value: string) => void
  /** Called on each keystroke */
  onInput?: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Input type */
  type?: 'text' | 'number'
  /** Unit suffix (e.g., 'px', '%') */
  unit?: string
  /** Validation state */
  invalid?: boolean
}

// ============================================
// IconButton
// ============================================

export interface IconButtonConfig extends BaseComponentConfig {
  /** Icon SVG content */
  icon: string
  /** Button title/tooltip */
  title: string
  /** Called on click */
  onClick: () => void
  /** Whether button is in active/pressed state */
  active?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================
// Slider
// ============================================

export interface SliderConfig extends BaseComponentConfig {
  /** Current value */
  value: number
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Step increment */
  step?: number
  /** Called when value changes */
  onChange: (value: number) => void
  /** Show value label */
  showValue?: boolean
}

// ============================================
// Component Instance Interface
// ============================================

export interface ComponentInstance {
  /** Get the root DOM element */
  getElement(): HTMLElement
  /** Update the component value */
  setValue?(value: any): void
  /** Get the current value */
  getValue?(): any
  /** Enable the component */
  enable?(): void
  /** Disable the component */
  disable?(): void
  /** Clean up resources */
  dispose(): void
}
