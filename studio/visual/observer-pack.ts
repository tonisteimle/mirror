/**
 * ObserverPack — bundles the four observers/listeners that the spacing
 * handle managers (padding / margin / gap) all need: a ResizeObserver,
 * a MutationObserver, a scroll listener on the preview container, and
 * a window-resize listener. All four route through a single `onChange`
 * callback so the manager can debounce a single refresh.
 *
 * The helper does NOT pick an observation geometry (which elements to
 * watch). That choice is manager-specific — padding/margin watch the
 * element + parent + siblings, gap watches the element + children.
 * Each manager calls `pack.resize.observe(...)` / `pack.mutation.observe(...)`
 * with its own pattern.
 *
 * Usage:
 *   this.observerPack = new ObserverPack({
 *     container: this.container,
 *     onChange: () => this.debouncedRefresh(),
 *   })
 *   ...
 *   this.observerPack.resize?.observe(element)
 *   this.observerPack.mutation?.observe(element, { ... })
 *   ...
 *   this.observerPack.unobserveAll()  // hide handles
 *   this.observerPack.dispose()        // manager dispose
 */
export interface ObserverPackConfig {
  /** Preview container — used for the scroll listener. */
  container: HTMLElement
  /** Fires whenever any observer or listener detects a change. */
  onChange: () => void
}

export class ObserverPack {
  /** Watches element-size changes. Manager wires `.observe(el)` per geometry. */
  readonly resize: ResizeObserver | null = null
  /** Watches DOM mutations. Filtered to layout-relevant attribute/childList changes. */
  readonly mutation: MutationObserver | null = null

  private scrollUnsub: (() => void) | null = null
  private windowResizeUnsub: (() => void) | null = null

  constructor(private readonly config: ObserverPackConfig) {
    // Mutable typing during setup, frozen after.
    const self = this as { -readonly [K in keyof this]: this[K] }

    self.resize = new ResizeObserver(() => this.config.onChange())

    self.mutation = new MutationObserver(mutations => {
      // Only refresh on layout-relevant mutations — text-only content
      // changes don't move handles, so skip those.
      const hasLayoutMutation = mutations.some(
        m =>
          m.type === 'childList' ||
          (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class'))
      )
      if (hasLayoutMutation) this.config.onChange()
    })

    const scrollHandler = (): void => this.config.onChange()
    this.config.container.addEventListener('scroll', scrollHandler, { passive: true })
    this.scrollUnsub = (): void =>
      this.config.container.removeEventListener('scroll', scrollHandler)

    const resizeHandler = (): void => this.config.onChange()
    window.addEventListener('resize', resizeHandler, { passive: true })
    this.windowResizeUnsub = (): void => window.removeEventListener('resize', resizeHandler)
  }

  /** Disconnect resize + mutation observers (keeps scroll/resize listeners). */
  unobserveAll(): void {
    this.resize?.disconnect()
    this.mutation?.disconnect()
  }

  /** Full teardown: disconnect observers and remove DOM listeners. */
  dispose(): void {
    this.unobserveAll()
    this.scrollUnsub?.()
    this.scrollUnsub = null
    this.windowResizeUnsub?.()
    this.windowResizeUnsub = null
  }
}
