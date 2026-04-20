/**
 * Section Header Component
 *
 * Shared collapsible section header used across panels.
 * Ensures consistent styling between Components Panel and Property Panel.
 *
 * CSS Classes:
 * - .section-header (root)
 * - .section-header-label
 * - .section-header-toggle
 * - .section-header-count
 */

export interface SectionHeaderConfig {
  /** Section label text */
  label: string
  /** Whether section is expanded */
  expanded?: boolean
  /** Item count to display */
  count?: number
  /** Called when toggle is clicked */
  onToggle?: (expanded: boolean) => void
  /** Additional CSS class */
  className?: string
}

// Chevron icons matching the Section component
const CHEVRON_RIGHT = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2L8 6L4 10"/></svg>`
const CHEVRON_DOWN = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4L6 8L10 4"/></svg>`

/**
 * Create a section header element
 *
 * Layout: [Label] [Count?] [Toggle]
 * Toggle button is on the RIGHT for better title readability.
 */
export function createSectionHeader(config: SectionHeaderConfig): HTMLElement {
  const { label, expanded = true, count, onToggle, className } = config

  const header = document.createElement('div')
  header.className = `section-header${className ? ` ${className}` : ''}`

  // Label (first, on the left)
  const labelEl = document.createElement('span')
  labelEl.className = 'section-header-label'
  labelEl.textContent = label
  header.appendChild(labelEl)

  // Count badge (optional, after label)
  if (count !== undefined) {
    const countEl = document.createElement('span')
    countEl.className = 'section-header-count'
    countEl.textContent = String(count)
    header.appendChild(countEl)
  }

  // Toggle button (chevron) - on the RIGHT
  if (onToggle) {
    const toggle = document.createElement('button')
    toggle.className = 'section-header-toggle'
    toggle.type = 'button'
    toggle.innerHTML = expanded ? CHEVRON_DOWN : CHEVRON_RIGHT
    toggle.setAttribute('aria-expanded', String(expanded))
    toggle.onclick = e => {
      e.stopPropagation()
      const newExpanded = toggle.getAttribute('aria-expanded') !== 'true'
      toggle.setAttribute('aria-expanded', String(newExpanded))
      toggle.innerHTML = newExpanded ? CHEVRON_DOWN : CHEVRON_RIGHT
      onToggle(newExpanded)
    }
    header.appendChild(toggle)
  }

  // Make entire header clickable for toggle
  if (onToggle) {
    header.style.cursor = 'pointer'
    header.onclick = () => {
      const toggle = header.querySelector('.section-header-toggle') as HTMLButtonElement
      toggle?.click()
    }
  }

  return header
}

/**
 * Update section header expanded state
 */
export function updateSectionHeaderState(header: HTMLElement, expanded: boolean): void {
  const toggle = header.querySelector('.section-header-toggle')
  if (toggle) {
    toggle.setAttribute('aria-expanded', String(expanded))
    toggle.innerHTML = expanded ? CHEVRON_DOWN : CHEVRON_RIGHT
  }
}
