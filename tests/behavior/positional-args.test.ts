/**
 * Positional Arguments — Behavior Spec (Schicht 2)
 *
 * Sub-features (per docs/concepts/positional-args.md):
 *   PA1 Container hex bg
 *   PA2 Container number → w
 *   PA3 Container size pair → w/h
 *   PA4 Button full mix (string content + size + size + color)
 *   PA5 Text → col, not bg
 *   PA6 Icon → ic + is (single size slot)
 *   PA7 Image → w/h only (no color slot)
 *   PA8 Mixed positional + explicit
 *   PA9 Named color
 *   PA10 rgba color
 *   PA11 Errors (too many sizes / two colors / w-conflict)
 *   PA12 Tokens are NOT positional (Phase 1 limitation)
 *   PA13 Components pass through unchanged
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { resolvePositionalArgs } from '../../compiler/positional-resolver'

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  const fn = new Function(code + '\nreturn createUI();')
  const root = fn() as HTMLElement
  container.appendChild(root)
  return root
}

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

describe('Positional Arguments — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // -------------------------------------------------------------------------
  // PA1: Container hex bg
  // -------------------------------------------------------------------------

  describe('PA1: Container hex → bg', () => {
    it('Frame #2271C1 sets background', () => {
      const root = render(`Frame #2271C1, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(34, 113, 193)')
    })

    it('Button #ef4444 sets background', () => {
      const root = render(`Button "X", #ef4444, w 100, h 32`, container)
      const btn = findByName(root, 'Button') as HTMLElement
      expect(btn.style.background).toContain('rgb(239, 68, 68)')
    })
  })

  // -------------------------------------------------------------------------
  // PA2: Container number → w
  // -------------------------------------------------------------------------

  describe('PA2: Container single number → w', () => {
    it('Frame 100 sets width', () => {
      const root = render(`Frame 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('100px')
    })

    it('Frame hug sets w hug', () => {
      const root = render(`Frame hug, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('fit-content')
    })

    it('Frame full sets w 100%', () => {
      const root = render(`Frame full, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toMatch(/100%|stretch/)
    })
  })

  // -------------------------------------------------------------------------
  // PA3: Size pair
  // -------------------------------------------------------------------------

  describe('PA3: Size pair → w/h', () => {
    it('Frame 100, 50 sets both', () => {
      const root = render(`Frame 100, 50, bg #333`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('100px')
      expect(frame.style.height).toBe('50px')
    })

    it('Frame hug, 50 mixes keyword + number', () => {
      const root = render(`Frame hug, 50, bg #333`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('fit-content')
      expect(frame.style.height).toBe('50px')
    })
  })

  // -------------------------------------------------------------------------
  // PA4: Full mix
  // -------------------------------------------------------------------------

  describe('PA4: Button full positional mix', () => {
    it('compiles + renders Button "Save", hug, 32, #2271C1', () => {
      const root = render(`Button "Save", hug, 32, #2271C1`, container)
      const btn = findByName(root, 'Button') as HTMLElement
      expect(btn.textContent?.trim()).toBe('Save')
      expect(btn.style.width).toBe('fit-content')
      expect(btn.style.height).toBe('32px')
      expect(btn.style.background).toContain('rgb(34, 113, 193)')
    })
  })

  // -------------------------------------------------------------------------
  // PA5: Text → col, not bg
  // -------------------------------------------------------------------------

  describe('PA5: Text bare hex → col (not bg)', () => {
    it('Text "Hello", #2271C1 sets text color', () => {
      const root = render(`Text "Hello", #2271C1`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.color).toContain('rgb(34, 113, 193)')
    })

    it('Text "Hello", red sets text color from named color', () => {
      const root = render(`Text "Hello", red`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.color).toBe('red')
    })

    it('Text bg is NOT set (because the color went to col)', () => {
      const root = render(`Text "Hello", #2271C1`, container)
      const text = findByName(root, 'Text') as HTMLElement
      // background should be unset / empty / "none"
      const bg = text.style.background || text.style.backgroundColor
      expect(bg).not.toContain('rgb(34, 113, 193)')
    })
  })

  // -------------------------------------------------------------------------
  // PA6: Icon → ic + is
  // -------------------------------------------------------------------------

  describe('PA6: Icon bare hex → ic, bare number → is', () => {
    it('Icon "check", #10b981, 24 emits icon-color + icon-size data', () => {
      const root = render(`Icon "check", #10b981, 24`, container)
      const icon = findByName(root, 'Icon') as HTMLElement
      expect(icon.dataset.iconColor).toBe('#10b981')
      expect(icon.dataset.iconSize).toBe('24')
    })

    it('Icon has only one size slot — 2nd number is an error', () => {
      expect(() => resolvePositionalArgs(`Icon "x", #333, 24, 48`)).toThrow(/positional size/)
    })
  })

  // -------------------------------------------------------------------------
  // PA7: Image → w/h only
  // -------------------------------------------------------------------------

  describe('PA7: Image w/h positional, no color slot', () => {
    it('Image src "x.jpg", 200, 100 sets width + height', () => {
      const root = render(`Image src "photo.jpg", 200, 100`, container)
      const img = findByName(root, 'Image') as HTMLImageElement
      expect(img.style.width).toBe('200px')
      expect(img.style.height).toBe('100px')
    })

    it('Image with bare hex throws (no color slot)', () => {
      expect(() => resolvePositionalArgs(`Image src "x.jpg", #333`)).toThrow(/no color slot/)
    })
  })

  // -------------------------------------------------------------------------
  // PA8: Mixed positional + explicit
  // -------------------------------------------------------------------------

  describe('PA8: Mixing positional and explicit on different slots', () => {
    it('Frame 100, 50, bg #333 (sizes positional, color explicit)', () => {
      const root = render(`Frame 100, 50, bg #333`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('100px')
      expect(frame.style.height).toBe('50px')
      expect(frame.style.background).toContain('rgb(51, 51, 51)')
    })

    it('Frame w 100, #333 (w explicit, color positional)', () => {
      const root = render(`Frame w 100, #333, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('100px')
      expect(frame.style.background).toContain('rgb(51, 51, 51)')
    })
  })

  // -------------------------------------------------------------------------
  // PA9: Named colors
  // -------------------------------------------------------------------------

  describe('PA9: Named color → bg/col', () => {
    it('Frame red sets bg', () => {
      const root = render(`Frame red, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toBe('red')
    })

    it('Frame transparent works as named color', () => {
      const root = render(`Frame transparent, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('transparent')
    })
  })

  // -------------------------------------------------------------------------
  // PA10: rgba()
  // -------------------------------------------------------------------------

  describe('PA10: rgba() color positional', () => {
    it('Frame rgba(0,0,0,0.5) sets bg with alpha', () => {
      const root = render(`Frame rgba(0,0,0,0.5), w 200, h 100`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgba(0, 0, 0, 0.5)')
    })
  })

  // -------------------------------------------------------------------------
  // PA11: Errors
  // -------------------------------------------------------------------------

  describe('PA11: Errors and smart slot-filling', () => {
    it('three numbers on Frame → error (no free size slot)', () => {
      expect(() => resolvePositionalArgs(`Frame 100, 50, 24`)).toThrow(/positional size/)
    })

    it('two colors on Frame → error', () => {
      expect(() => resolvePositionalArgs(`Frame #111, #222`)).toThrow(/positional color/)
    })

    it('positional + explicit on the SAME color slot → error', () => {
      expect(() => resolvePositionalArgs(`Frame #333, bg #444`)).toThrow(
        /positionally.*and explicitly/
      )
    })

    it('positional + explicit w: smart-mode fills h with bare value', () => {
      // No error — bare 100 fills the free h slot
      expect(resolvePositionalArgs(`Frame w 200, 100`)).toBe(`Frame w 200, h 100`)
    })

    it('explicit fills both size slots → bare size errors with no free slot', () => {
      expect(() => resolvePositionalArgs(`Frame 100, 50, h 80`)).toThrow(
        /no free slot|positionally and explicitly/
      )
    })

    it('Frame 100, w 200 → smart-mode: bare 100 takes free h slot', () => {
      expect(resolvePositionalArgs(`Frame 100, w 200`)).toBe(`Frame h 100, w 200`)
    })
  })

  // -------------------------------------------------------------------------
  // PA12: Token references (Phase 1.5)
  // -------------------------------------------------------------------------

  describe('PA12: Token references with explicit suffix ($name.suffix)', () => {
    it('Frame $primary.bg → bg $primary.bg (var(--primary-bg))', () => {
      const root = render(`primary.bg: #2271C1\n\nFrame $primary.bg, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })

    it('Text $primary.col → col $primary.col', () => {
      const root = render(`primary.col: white\n\nText "Hi", $primary.col`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.color).toContain('var(--primary-col)')
    })

    it('Frame $space.pad, $radius.rad → pad + rad properties', () => {
      const root = render(
        `space.pad: 16\nradius.rad: 8\n\nFrame $space.pad, $radius.rad, w 100, h 50`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.padding).toContain('var(--space-pad)')
      expect(frame.style.borderRadius).toContain('var(--radius-rad)')
    })
  })

  describe('PA13: Token references with single suffix ($name auto-resolves)', () => {
    it('Frame $primary (only primary.bg defined) → bg $primary', () => {
      const root = render(`primary.bg: #2271C1\n\nFrame $primary, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })

    it('Frame $space (only space.pad defined) → pad $space', () => {
      const root = render(`space.pad: 16\n\nFrame $space, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.padding).toContain('var(--space-pad)')
    })
  })

  describe('PA14: Token references with multi-suffix (role-based pick)', () => {
    it('Frame $primary picks .bg (Container role)', () => {
      const root = render(
        `primary.bg: #2271C1\nprimary.col: white\n\nFrame $primary, w 100, h 50`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
    })

    it('Text $primary picks .col (Content role)', () => {
      const root = render(
        `primary.bg: #2271C1\nprimary.col: #ef4444\n\nText "Hi", $primary`,
        container
      )
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.color).toContain('var(--primary-col)')
    })

    it('Icon $primary picks .ic (Icon role)', () => {
      const root = render(
        `primary.bg: #2271C1\nprimary.ic: #888\n\nIcon "check", $primary, 24`,
        container
      )
      const icon = findByName(root, 'Icon') as HTMLElement
      expect(icon.dataset.iconColor).toBe('var(--primary-ic)')
    })
  })

  describe('PA15: Object property access ≠ token (passes through)', () => {
    it('Text $user.name (where user is an object) → textContent', () => {
      const root = render(`user:\n  name: "Max"\n\nText $user.name`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.textContent?.trim()).toBe('Max')
    })

    it('resolver does not transform $user.name when user is an object', () => {
      const out = resolvePositionalArgs(`user:\n  name: "Max"\n\nText $user.name`)
      // The line `Text $user.name` should NOT have a property-name prefix
      expect(out).toContain('Text $user.name')
      expect(out).not.toContain('Text name $user.name')
      expect(out).not.toContain('Text col $user.name')
    })
  })

  describe('PA16: Multiple token-refs on one element', () => {
    it('Frame $primary, $space, $radius → bg + pad + rad simultaneously', () => {
      const root = render(
        `space.pad: 16\nradius.rad: 8\nprimary.bg: #2271C1\n\nFrame $primary, $space, $radius, w 200, h 100`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--primary-bg)')
      expect(frame.style.padding).toContain('var(--space-pad)')
      expect(frame.style.borderRadius).toContain('var(--radius-rad)')
    })
  })

  // -------------------------------------------------------------------------
  // PA-Phase2: Custom Components support
  // -------------------------------------------------------------------------

  describe('PA-Phase2a: Custom components — default Container role', () => {
    it('Btn (no `as`) defaults to Container: 100, 50, #333 → w/h/bg', () => {
      const root = render(`Btn: pad 10, rad 6\n\nBtn 100, 50, #2271C1`, container)
      const btn = findByName(root, 'Btn') as HTMLElement
      expect(btn.style.width).toBe('100px')
      expect(btn.style.height).toBe('50px')
      expect(btn.style.background).toContain('rgb(34, 113, 193)')
    })

    it('Custom component definition itself is NOT transformed', () => {
      const out = resolvePositionalArgs(`Btn: 100, 50, #333\n\nBtn 50, 25`)
      expect(out).toContain('Btn: 100, 50, #333')
      expect(out).toContain('Btn w 50, h 25')
    })
  })

  describe('PA-Phase2b: Custom components — `as Text` inherits col role', () => {
    it('Headline (as Text): #2271C1 → col, not bg', () => {
      const root = render(
        `Headline as Text: fs 24, weight bold\n\nHeadline "Hello", #2271C1`,
        container
      )
      const headline = findByName(root, 'Headline') as HTMLElement
      expect(headline.style.color).toContain('rgb(34, 113, 193)')
    })

    it('Definition `Headline as Text:` itself is NOT transformed', () => {
      const out = resolvePositionalArgs(`Headline as Text: 24, #333`)
      expect(out).toContain('Headline as Text: 24, #333')
    })
  })

  describe('PA-Phase2c: Custom components — `as Icon` inherits ic + is', () => {
    it('DangerIcon (as Icon): #ff0000, 32 → ic + is', () => {
      const root = render(
        `DangerIcon as Icon: ic #ef4444\n\nDangerIcon "trash", #ff0000, 32`,
        container
      )
      const icon = findByName(root, 'DangerIcon') as HTMLElement
      expect(icon.dataset.iconColor).toBe('#ff0000')
      expect(icon.dataset.iconSize).toBe('32')
    })
  })

  describe('PA-Phase2d: Component inheritance chain', () => {
    it('DangerBtn as PrimaryBtn as Btn: still Container role', () => {
      const root = render(
        `Btn: pad 10\nPrimaryBtn as Btn: bg #2271C1\nDangerBtn as PrimaryBtn: bg #ef4444\n\nDangerBtn 200, 60, #c00`,
        container
      )
      const btn = findByName(root, 'DangerBtn') as HTMLElement
      expect(btn.style.width).toBe('200px')
      expect(btn.style.height).toBe('60px')
      expect(btn.style.background).toContain('rgb(204, 0, 0)')
    })
  })

  describe('PA-Phase2e: Slot definitions are NOT components', () => {
    it('`Title:` indented under `Card:` is a slot, leave Title positional alone', () => {
      const out = resolvePositionalArgs(`Card:\n  Title:\n    Text "X"\n\nCard\n  Title 100, #333`)
      // Title is a slot — NOT registered as component → leave untouched
      expect(out).toContain('Title 100, #333')
    })
  })

  describe('PA-Phase2f: Tokens + custom components combined', () => {
    it('PrimaryBtn $primary, 100, 32 → bg + w + h', () => {
      const root = render(
        `primary.bg: #2271C1\nPrimaryBtn as Button: pad 10\n\nPrimaryBtn $primary, 100, 32`,
        container
      )
      const btn = findByName(root, 'PrimaryBtn') as HTMLElement
      expect(btn.style.background).toContain('var(--primary-bg)')
      expect(btn.style.width).toBe('100px')
      expect(btn.style.height).toBe('32px')
    })
  })

  describe('PA17: Property-set refs still pass through (no token def → not transformed)', () => {
    it('Frame $cardstyle (no token, no object) → unchanged', () => {
      // cardstyle is a property-set, not a token. Without a token def
      // (`cardstyle.X:` flat), the resolver leaves it alone.
      const out = resolvePositionalArgs(`Frame $cardstyle, w 100`)
      expect(out).toBe(`Frame $cardstyle, w 100`)
    })

    it('Frame $cardstyle property-set still expands via existing parser', () => {
      const root = render(`cardstyle: bg #1a1a1a, pad 16, rad 8\n\nFrame $cardstyle`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(26, 26, 26)')
      expect(frame.style.padding).toBe('16px')
    })
  })

  // -------------------------------------------------------------------------
  // PA13: Components pass through unchanged
  // -------------------------------------------------------------------------

  describe('PA13: Component instances are not transformed', () => {
    it('PrimaryBtn 100, #ef4444 is left untouched (not in PRIMITIVE_ROLES)', () => {
      const out = resolvePositionalArgs(`PrimaryBtn 100, #ef4444`)
      expect(out).toBe(`PrimaryBtn 100, #ef4444`)
    })
  })

  // -------------------------------------------------------------------------
  // PA14: Equivalence — positional and explicit produce identical DOM
  // -------------------------------------------------------------------------

  describe('PA14: Positional ≡ explicit', () => {
    it('Frame 100, 50, #333 ≡ Frame w 100, h 50, bg #333', () => {
      const a = render(`Frame 100, 50, #333`, container).outerHTML
      container.innerHTML = ''
      const b = render(`Frame w 100, h 50, bg #333`, container).outerHTML
      // Both should produce the same DOM structure (modulo dynamic IDs)
      const stripIds = (s: string) => s.replace(/data-mirror-id="[^"]*"/g, '')
      expect(stripIds(a)).toBe(stripIds(b))
    })

    it('Icon "check", #888, 24 ≡ Icon "check", ic #888, is 24', () => {
      const a = render(`Icon "check", #888, 24`, container).outerHTML
      container.innerHTML = ''
      const b = render(`Icon "check", ic #888, is 24`, container).outerHTML
      const stripIds = (s: string) => s.replace(/data-mirror-id="[^"]*"/g, '')
      expect(stripIds(a)).toBe(stripIds(b))
    })
  })
})
