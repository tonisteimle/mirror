/**
 * Zag Style Manager
 *
 * Manages CSS styles for Zag components, including state-based styling.
 * Generates CSS rules that work with Zag's data attributes.
 */

import type { IRStyle, IRZagNode, IRSlot } from '../../ir/types'
import { STATE_MAPPINGS } from '../../schema/zag-primitives'

/**
 * Style Manager for Zag components
 *
 * Handles the generation and injection of CSS styles that respond
 * to Zag's data attribute state system.
 */
export class StyleManager {
  private styleSheet: CSSStyleSheet | null = null
  private styleElement: HTMLStyleElement | null = null
  private ruleIndexes = new Map<string, number>()

  /**
   * Initialize the style manager
   *
   * Creates a style element and stylesheet for dynamic rule insertion.
   */
  init(): void {
    if (this.styleElement) return

    this.styleElement = document.createElement('style')
    this.styleElement.id = 'mirror-zag-styles'
    document.head.appendChild(this.styleElement)

    this.styleSheet = this.styleElement.sheet
  }

  /**
   * Generate CSS for a Zag component
   *
   * @param node The IR Zag node
   * @returns CSS string for the component
   */
  generateComponentCSS(node: IRZagNode): string {
    const rules: string[] = []
    const selector = `[data-mirror-id="${node.id}"]`

    // Generate slot styles
    for (const [slotName, slot] of Object.entries(node.slots)) {
      const slotSelector = `${selector} [data-slot="${slotName}"]`
      rules.push(...this.generateSlotCSS(slotSelector, slot))
    }

    return rules.join('\n')
  }

  /**
   * Generate CSS for a slot
   *
   * @param selector Base CSS selector for the slot
   * @param slot The IR slot definition
   * @returns Array of CSS rules
   */
  generateSlotCSS(selector: string, slot: IRSlot): string[] {
    const rules: string[] = []

    // Group styles by state
    const baseStyles: IRStyle[] = []
    const stateStyles: Map<string, IRStyle[]> = new Map()

    for (const style of slot.styles) {
      if (style.state) {
        if (!stateStyles.has(style.state)) {
          stateStyles.set(style.state, [])
        }
        stateStyles.get(style.state)!.push(style)
      } else {
        baseStyles.push(style)
      }
    }

    // Generate base styles
    if (baseStyles.length > 0) {
      rules.push(this.generateRule(selector, baseStyles))
    }

    // Generate state-specific styles
    for (const [state, styles] of stateStyles) {
      const stateSelector = this.getStateSelector(selector, state)
      rules.push(this.generateRule(stateSelector, styles))
    }

    return rules
  }

  /**
   * Get the CSS selector for a state
   *
   * @param baseSelector Base element selector
   * @param state Mirror state name (e.g., 'hover', 'selected')
   * @returns CSS selector including state
   */
  getStateSelector(baseSelector: string, state: string): string {
    // Normalize state - remove trailing colon if present
    const normalizedState = state.endsWith(':') ? state.slice(0, -1) : state

    // Check for Zag data attribute mapping (keys have colon suffix)
    const zagSelector = STATE_MAPPINGS[`${normalizedState}:`]
    if (zagSelector) {
      return `${baseSelector}${zagSelector}`
    }

    // Fallback to CSS pseudo-classes for system states
    const pseudoStates: Record<string, string> = {
      'hover': ':hover',
      'focus': ':focus',
      'active': ':active',
      'disabled': ':disabled',
      'focus-visible': ':focus-visible',
    }

    const pseudo = pseudoStates[normalizedState]
    if (pseudo) {
      return `${baseSelector}${pseudo}`
    }

    // Fallback to data-state attribute
    return `${baseSelector}[data-state="${normalizedState}"]`
  }

  /**
   * Generate a CSS rule from styles
   *
   * @param selector CSS selector
   * @param styles Array of IR styles
   * @returns CSS rule string
   */
  generateRule(selector: string, styles: IRStyle[]): string {
    const declarations = styles
      .map(s => `  ${s.property}: ${s.value};`)
      .join('\n')

    return `${selector} {\n${declarations}\n}`
  }

  /**
   * Inject CSS into the document
   *
   * @param nodeId Component node ID
   * @param css CSS string to inject
   */
  inject(nodeId: string, css: string): void {
    this.init()

    if (!this.styleSheet) return

    // Remove existing rules for this node
    this.remove(nodeId)

    try {
      const index = this.styleSheet.insertRule(css, this.styleSheet.cssRules.length)
      this.ruleIndexes.set(nodeId, index)
    } catch (e) {
      console.warn(`Failed to inject CSS for ${nodeId}:`, e)
    }
  }

  /**
   * Remove CSS for a component
   *
   * @param nodeId Component node ID
   */
  remove(nodeId: string): void {
    if (!this.styleSheet) return

    const index = this.ruleIndexes.get(nodeId)
    if (index !== undefined) {
      try {
        this.styleSheet.deleteRule(index)

        // Update indexes for rules after the deleted one
        for (const [id, i] of this.ruleIndexes) {
          if (i > index) {
            this.ruleIndexes.set(id, i - 1)
          }
        }

        this.ruleIndexes.delete(nodeId)
      } catch (e) {
        console.warn(`Failed to remove CSS for ${nodeId}:`, e)
      }
    }
  }

  /**
   * Apply inline styles to an element
   *
   * @param element DOM element
   * @param styles Array of IR styles (base only, no state)
   */
  applyInlineStyles(element: HTMLElement, styles: IRStyle[]): void {
    for (const style of styles) {
      if (!style.state) {
        element.style.setProperty(style.property, style.value)
      }
    }
  }

  /**
   * Generate CSS variables from styles
   *
   * Useful for dynamic theming and state transitions.
   *
   * @param styles Array of IR styles
   * @returns Object mapping CSS variable names to values
   */
  generateCSSVariables(styles: IRStyle[]): Record<string, string> {
    const vars: Record<string, string> = {}

    for (const style of styles) {
      const varName = `--mirror-${style.property.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`
      vars[varName] = style.value
    }

    return vars
  }

  /**
   * Dispose of the style manager
   */
  dispose(): void {
    if (this.styleElement) {
      this.styleElement.remove()
      this.styleElement = null
      this.styleSheet = null
    }
    this.ruleIndexes.clear()
  }
}

/**
 * Create a new style manager
 */
export function createStyleManager(): StyleManager {
  return new StyleManager()
}
