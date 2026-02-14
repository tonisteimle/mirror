/**
 * Select Primitive Types
 *
 * Type definitions for select-primitive.tsx
 */

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  [key: string]: unknown // Allow additional data
}

export interface SelectProps {
  /** Current selected value */
  value?: string | null
  /** Callback when value changes */
  onChange?: (value: string, option: SelectOption) => void
  /** Options to display */
  options: SelectOption[]
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Whether the select is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
  /** Children (slots) */
  children?: React.ReactNode
}
