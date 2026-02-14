import type { LibraryComponent, LibraryCategory } from './types'

// Import library components
import { formFieldComponent } from './components/input'
// Doc-mode components
import { DocTextComponent } from './components/doc-text'
import { PlaygroundComponent } from './components/playground'
import { DocWrapperComponent } from './components/doc-wrapper'

// All library components
const LIBRARY_COMPONENTS: LibraryComponent[] = [
  // Form
  formFieldComponent,
  // Doc-mode
  DocTextComponent,
  PlaygroundComponent,
  DocWrapperComponent,
]

// Map for quick lookup by name
const componentMap = new Map<string, LibraryComponent>()
for (const component of LIBRARY_COMPONENTS) {
  componentMap.set(component.name, component)
}

// Set of all library component names (for quick checks)
export const LIBRARY_COMPONENT_NAMES = new Set(LIBRARY_COMPONENTS.map(c => c.name))

// Set of all slot names across all library components
export const LIBRARY_SLOT_NAMES = new Set(
  LIBRARY_COMPONENTS.flatMap(c => c.slots.map(s => s.name))
)

/**
 * Get a library component by name
 */
export function getLibraryComponent(name: string): LibraryComponent | undefined {
  return componentMap.get(name)
}

/**
 * Check if a component name is a library component
 */
export function isLibraryComponent(name: string): boolean {
  return componentMap.has(name)
}

/**
 * Check if a name is a valid slot for a library component
 */
export function isLibrarySlot(componentName: string, slotName: string): boolean {
  const component = componentMap.get(componentName)
  if (!component) return false
  return component.slots.some(s => s.name === slotName)
}

/**
 * Get all library components grouped by category
 */
export function getLibraryComponentsByCategory(): Map<LibraryCategory, LibraryComponent[]> {
  const grouped = new Map<LibraryCategory, LibraryComponent[]>()

  for (const component of LIBRARY_COMPONENTS) {
    const category = component.category as LibraryCategory
    const existing = grouped.get(category) || []
    existing.push(component)
    grouped.set(category, existing)
  }

  return grouped
}

/**
 * Get all library components
 */
export function getAllLibraryComponents(): LibraryComponent[] {
  return LIBRARY_COMPONENTS
}

/**
 * Get definitions for a library component (for auto-import)
 */
export function getLibraryDefinitions(name: string): string | undefined {
  const component = componentMap.get(name)
  return component?.definitions
}
