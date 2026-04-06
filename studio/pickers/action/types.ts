/**
 * Action Picker Types
 */

export interface EventOption {
  name: string
  description: string
  acceptsKey?: boolean
  key?: string
}

export interface ActionOption {
  name: string
  description: string
  requiresTarget?: boolean
  targets?: string[]
  params?: string[]
}

export interface ActionPickerValue {
  event: string
  key?: string
  action: string
  target?: string
  arguments?: string[]
}

export interface ActionPickerConfig {
  initialValue?: ActionPickerValue
  availableElements?: string[]  // Named elements for targeting
}

export interface ActionPickerCallbacks {
  onSelect?: (value: ActionPickerValue) => void
  onCancel?: () => void
}
