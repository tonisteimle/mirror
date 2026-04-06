/**
 * Base Picker Types
 */

export type PickerPosition = 'below' | 'above' | 'left' | 'right' | 'auto'

export interface PickerConfig {
  container?: HTMLElement
  position: PickerPosition
  offsetX?: number
  offsetY?: number
  closeOnSelect?: boolean
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
  animate?: boolean
  zIndex?: number
  /**
   * When true, disables the picker's internal keyboard handling (Enter, Escape, arrows).
   * Use this when an external system (like TriggerManager) is handling keyboard navigation.
   */
  externalKeyboardHandling?: boolean
}

export interface PickerCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onSelect: (value: string) => void
  onChange?: (value: string) => void
}

export interface PickerState {
  isOpen: boolean
  anchor: HTMLElement | null
  value: string
}

export const DEFAULT_CONFIG: Required<PickerConfig> = {
  container: document.body,
  position: 'below',
  offsetX: 0,
  offsetY: 4,
  closeOnSelect: true,
  closeOnClickOutside: true,
  closeOnEscape: true,
  animate: true,
  zIndex: 1000,
  externalKeyboardHandling: false,
}
