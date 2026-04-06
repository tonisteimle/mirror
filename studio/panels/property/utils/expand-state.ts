/**
 * Expanded State Persistence
 *
 * Manages localStorage persistence for section expand/collapse states.
 */

const STORAGE_KEY = 'mirror-pp-expanded'

/**
 * Get all expanded states from localStorage
 */
function getExpandedStates(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save expanded states to localStorage
 */
function saveExpandedStates(states: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a section is expanded
 * Default: sections are expanded (true) unless explicitly collapsed
 */
export function isExpanded(sectionKey: string): boolean {
  const states = getExpandedStates()
  return states[sectionKey] ?? true
}

/**
 * Set expanded state for a section
 */
export function setExpanded(sectionKey: string, expanded: boolean): void {
  const states = getExpandedStates()
  states[sectionKey] = expanded
  saveExpandedStates(states)
}

/**
 * Toggle expanded state for a section
 * Returns the new state
 */
export function toggleExpanded(sectionKey: string): boolean {
  const current = isExpanded(sectionKey)
  const newState = !current
  setExpanded(sectionKey, newState)
  return newState
}

/**
 * Apply expanded state to a container element
 * Call this after rendering to restore persisted state
 */
export function applyExpandedState(
  container: HTMLElement,
  sectionKey: string,
  containerSelector: string = `[data-expand-container="${sectionKey}"]`
): void {
  if (isExpanded(sectionKey)) {
    const expandContainer = container.querySelector(containerSelector)
    if (expandContainer) {
      expandContainer.classList.add('expanded')
      const section = expandContainer.closest('.pp-section')
      if (section) {
        section.classList.add('expanded')
      }
    }
  }
}
