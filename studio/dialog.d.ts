export interface DialogOptions {
  title?: string
  message?: string
  okText?: string
  cancelText?: string
  defaultValue?: string
  placeholder?: string
}

export function alert(message: string, options?: DialogOptions): Promise<void>
export function confirm(message: string, options?: DialogOptions): Promise<boolean>
export function prompt(message: string, options?: DialogOptions): Promise<string | null>
export function confirmDelete(itemName: string, options?: DialogOptions): Promise<boolean>
export function choose<T = string>(
  message: string,
  choices: Array<{ label: string; value: T }>,
  options?: DialogOptions
): Promise<T | null>
