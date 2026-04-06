/**
 * Scrubbing Utility - Drag-to-adjust values on labels
 *
 * Enables Figma/Webflow-style value adjustment by dragging on labels.
 * - Drag left/right to decrease/increase
 * - Shift = 10x steps (coarse)
 * - Alt/Option = 0.1x steps (fine)
 */

export interface ScrubOptions {
  /** The label element to make scrubbable */
  label: HTMLElement
  /** The input element to update */
  input: HTMLInputElement
  /** Callback when value changes */
  onChange: (value: number) => void
  /** Callback when scrubbing ends */
  onEnd?: () => void
  /** Minimum allowed value (default: -Infinity) */
  min?: number
  /** Maximum allowed value (default: Infinity) */
  max?: number
  /** Base step size per pixel (default: 1) */
  step?: number
  /** Allow decimal values (default: true) */
  allowDecimals?: boolean
}

export interface ScrubInstance {
  /** Remove all event listeners */
  destroy: () => void
}

/**
 * Make a label scrubbable
 */
export function makeScrubable(options: ScrubOptions): ScrubInstance {
  const {
    label,
    input,
    onChange,
    onEnd,
    min = -Infinity,
    max = Infinity,
    step = 1,
    allowDecimals = true
  } = options

  let isDragging = false
  let startX = 0
  let startValue = 0

  // Add scrubbable class for CSS cursor
  label.classList.add('pp-scrubbable')

  function parseCurrentValue(): number {
    const val = parseFloat(input.value)
    return isNaN(val) ? 0 : val
  }

  function clamp(value: number): number {
    return Math.min(max, Math.max(min, value))
  }

  function formatValue(value: number): number {
    if (!allowDecimals) {
      return Math.round(value)
    }
    // Round to 1 decimal place for fine adjustments
    return Math.round(value * 10) / 10
  }

  function getModifierMultiplier(e: MouseEvent): number {
    if (e.shiftKey) return 10  // Coarse: 10x
    if (e.altKey) return 0.1   // Fine: 0.1x
    return 1                    // Normal: 1x
  }

  function handleMouseDown(e: MouseEvent) {
    // Only left click
    if (e.button !== 0) return

    // Don't interfere with text selection
    e.preventDefault()

    isDragging = true
    startX = e.clientX
    startValue = parseCurrentValue()

    // Add active state
    label.classList.add('pp-scrubbing')
    input.classList.add('pp-scrub-target')
    document.body.style.cursor = 'ew-resize'

    // Prevent text selection while dragging
    document.body.style.userSelect = 'none'

    // Add global listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const multiplier = getModifierMultiplier(e)
    const delta = deltaX * step * multiplier

    let newValue = startValue + delta
    newValue = clamp(newValue)
    newValue = formatValue(newValue)

    // Update input visually
    input.value = String(newValue)

    // Notify change
    onChange(newValue)
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging) return

    isDragging = false

    // Remove active state
    label.classList.remove('pp-scrubbing')
    input.classList.remove('pp-scrub-target')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    // Remove global listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    // Notify end
    onEnd?.()
  }

  // Attach listener
  label.addEventListener('mousedown', handleMouseDown)

  // Return cleanup function
  return {
    destroy() {
      label.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      label.classList.remove('pp-scrubbable', 'pp-scrubbing')
      input.classList.remove('pp-scrub-target')
    }
  }
}

/**
 * Setup scrubbing for all matching label-input pairs in a container
 */
export function setupScrubbing(
  container: HTMLElement,
  onChange: (property: string, value: number) => void,
  onEnd?: () => void
): () => void {
  const instances: ScrubInstance[] = []

  // Find all rows with scrubbable labels
  const rows = container.querySelectorAll('.pp-row[data-scrub]')

  rows.forEach(row => {
    const label = row.querySelector('.pp-row-label') as HTMLElement
    const input = row.querySelector('input[type="text"]') as HTMLInputElement
    const property = row.getAttribute('data-scrub')

    if (!label || !input || !property) return

    // Get options from data attributes
    const min = row.hasAttribute('data-scrub-min')
      ? parseFloat(row.getAttribute('data-scrub-min')!)
      : undefined
    const max = row.hasAttribute('data-scrub-max')
      ? parseFloat(row.getAttribute('data-scrub-max')!)
      : undefined
    const step = row.hasAttribute('data-scrub-step')
      ? parseFloat(row.getAttribute('data-scrub-step')!)
      : 1

    const instance = makeScrubable({
      label,
      input,
      min,
      max,
      step,
      onChange: (value) => onChange(property, value),
      onEnd
    })

    instances.push(instance)
  })

  // Return cleanup function
  return () => {
    instances.forEach(i => i.destroy())
  }
}

/**
 * Check if scrubbing is currently active
 */
export function isScrubbing(): boolean {
  return document.body.style.cursor === 'ew-resize'
}
