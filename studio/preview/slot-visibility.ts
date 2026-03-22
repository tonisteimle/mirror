/**
 * SlotVisibilityService - Manages .filled class on slot elements
 *
 * Uses MutationObserver to detect when children are added/removed from slots
 * and toggles the 'filled' class accordingly.
 */

export interface SlotVisibilityConfig {
  /** The container to observe for slot elements */
  container: HTMLElement
  /** Class name for slots (default: 'mirror-slot') */
  slotClass?: string
  /** Class name for filled state (default: 'filled') */
  filledClass?: string
  /** Class name for slot labels to exclude from child count (default: 'mirror-slot-label') */
  labelClass?: string
}

export class SlotVisibilityService {
  private container: HTMLElement
  private slotClass: string
  private filledClass: string
  private labelClass: string
  private observer: MutationObserver | null = null

  // Debouncing for performance (PREV-010)
  private pendingUpdate: number | null = null
  private pendingSlots: Set<HTMLElement> = new Set()

  constructor(config: SlotVisibilityConfig) {
    this.container = config.container
    this.slotClass = config.slotClass ?? 'mirror-slot'
    this.filledClass = config.filledClass ?? 'filled'
    this.labelClass = config.labelClass ?? 'mirror-slot-label'
  }

  /**
   * Start observing the container for slot changes
   */
  attach(): void {
    if (this.observer) return

    this.observer = new MutationObserver(this.handleMutations.bind(this))
    this.observer.observe(this.container, {
      childList: true,
      subtree: true,
    })

    // Initial update for all existing slots
    this.updateAllSlots()
  }

  /**
   * Stop observing and cleanup
   */
  detach(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  /**
   * Manually refresh all slot states
   * Call this after preview content is replaced
   */
  refresh(): void {
    this.updateAllSlots()
  }

  /**
   * Handle mutations from MutationObserver
   * Uses requestAnimationFrame debouncing for performance (PREV-010)
   */
  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      try {
        if (mutation.type === 'childList') {
          // Check if the mutation target is a slot
          const target = mutation.target as HTMLElement
          if (target.classList?.contains(this.slotClass)) {
            this.pendingSlots.add(target)
          }

          // Check if any added/removed nodes affect a slot parent
          const checkNodes = [...mutation.addedNodes, ...mutation.removedNodes]
          for (const node of checkNodes) {
            if (node instanceof HTMLElement) {
              const parentSlot = node.closest(`.${this.slotClass}`) as HTMLElement | null
              // Ensure parentSlot is within our container (not from outside)
              if (parentSlot && this.container.contains(parentSlot)) {
                this.pendingSlots.add(parentSlot)
              }
            }
          }
        }
      } catch (error) {
        // Don't let errors in mutation handling disconnect the observer
        console.warn('[SlotVisibility] Error processing mutation:', error)
      }
    }

    // Debounce updates using requestAnimationFrame (~60fps)
    this.scheduleUpdate()
  }

  /**
   * Schedule a batched update for pending slots
   */
  private scheduleUpdate(): void {
    if (this.pendingUpdate !== null) return

    this.pendingUpdate = requestAnimationFrame(() => {
      this.pendingUpdate = null
      // Process all pending slots in one batch
      for (const slot of this.pendingSlots) {
        try {
          this.updateSlotState(slot)
        } catch (error) {
          console.warn('[SlotVisibility] Error updating slot:', error)
        }
      }
      this.pendingSlots.clear()
    })
  }

  /**
   * Update all slots in the container
   */
  private updateAllSlots(): void {
    const slots = this.container.querySelectorAll<HTMLElement>(`.${this.slotClass}`)
    slots.forEach(slot => this.updateSlotState(slot))
  }

  /**
   * Update the filled state of a single slot
   */
  private updateSlotState(slot: HTMLElement): void {
    const hasContent = this.hasVisibleChildren(slot)
    slot.classList.toggle(this.filledClass, hasContent)
  }

  /**
   * Check if slot has visible children (excluding the label)
   */
  private hasVisibleChildren(slot: HTMLElement): boolean {
    for (const child of Array.from(slot.children)) {
      // Skip slot labels
      if (child.classList.contains(this.labelClass)) {
        continue
      }
      // Any other child means the slot is filled
      return true
    }
    return false
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    // Cancel any pending animation frame
    if (this.pendingUpdate !== null) {
      cancelAnimationFrame(this.pendingUpdate)
      this.pendingUpdate = null
    }
    this.pendingSlots.clear()
    this.detach()
  }
}

/**
 * Create a SlotVisibilityService instance
 */
export function createSlotVisibilityService(config: SlotVisibilityConfig): SlotVisibilityService {
  return new SlotVisibilityService(config)
}
