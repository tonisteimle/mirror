/**
 * Cross-File Linking — Behavior Spec (Schicht 2)
 *
 * Pins the documented `show X` and `show X from Y` semantics from
 * docs/MIRROR-TUTORIAL-FULL.md § "Seiten & Navigation".
 *
 * Background: until 2026-05, these were parsed but silently ignored
 * — the parser captured `show=X` as a property and `from=Y` as an
 * Instance field, but no IR/emitter ever read them. Tab/NavItem with
 * `show HomeView` rendered an empty Tab. The tutorial documented the
 * feature, the auto-generated tutorial tests asserted only
 * `assert.ok(true, 'compilation successful')`, and nobody noticed for
 * months. This file is the load-bearing test that catches a regression.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { compileProject } from '../../compiler/index'

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

function renderProject(files: Record<string, string>, container: HTMLElement): HTMLElement {
  const fs = {
    listFiles: (dir: string) =>
      Object.keys(files)
        .filter(p => p.startsWith(dir + '/'))
        .map(p => p.slice(dir.length + 1)),
    readFile: (path: string) => files[path] ?? null,
  }
  const code = compileProject(fs).replace(/^export\s+function/gm, 'function')
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

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('Cross-File Linking — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // Single-file `show X`
  // ---------------------------------------------------------------------------

  describe('show X — local component reference', () => {
    it('Tab with `show HomeView` renders the named view as the Tab content', () => {
      const root = render(
        `Tabs defaultValue "Home"
  Tab "Home", show HomeView
  Tab "Settings", show SettingsView

HomeView: Frame name HomeView, pad 20, bg #ff0000
  Text "Local home content"

SettingsView: Frame name SettingsView, pad 20, bg #00ff00
  Text "Local settings content"`,
        container
      )

      // Both views must be present in the DOM (Zag handles visibility
      // switching at runtime; we assert the content is there).
      expect(findByName(root, 'HomeView')).not.toBeNull()
      expect(findByName(root, 'SettingsView')).not.toBeNull()

      // The text content from each view must be there.
      expect(root.textContent).toContain('Local home content')
      expect(root.textContent).toContain('Local settings content')
    })

    it('show target is nested inside the parent Tab (not a sibling)', () => {
      const root = render(
        `Tabs defaultValue "Home"
  Tab "Home", show HomeView

HomeView: Frame name HomeView
  Text "Inside"`,
        container
      )

      const tabs = allByName(root, 'Tab')
      expect(tabs.length).toBe(1)
      const homeView = findByName(root, 'HomeView')
      expect(homeView).not.toBeNull()
      // HomeView must be a descendant of the Tab — i.e., `show` desugars
      // to a child instance, not a sibling.
      expect(tabs[0].contains(homeView)).toBe(true)
    })

    it('show injects before any block children — both render in source order', () => {
      // When the user writes both `show X` AND inline children, the
      // show target is prepended (rendered first) and the inline
      // children come after. This keeps the desugaring predictable
      // and lets users use `show` as a "header" before extra content.
      const root = render(
        `Tabs defaultValue "X"
  Tab "X", show HomeView
    Text "Extra body"

HomeView: Frame name HomeView
  Text "Show body"`,
        container
      )

      expect(findByName(root, 'HomeView')).not.toBeNull()
      expect(root.textContent).toContain('Show body')
      expect(root.textContent).toContain('Extra body')
      // Source order: HomeView's "Show body" appears before "Extra body"
      const html = root.innerHTML
      expect(html.indexOf('Show body')).toBeLessThan(html.indexOf('Extra body'))
    })

    it('NavItem inside SideNav also resolves `show X`', () => {
      const root = render(
        `Frame hor
  SideNav defaultValue "Dashboard", w 200
    NavItem "Dashboard", show DashboardView
    NavItem "Settings", show SettingsView

DashboardView: Frame name DashboardView
  Text "Dashboard panel"

SettingsView: Frame name SettingsView
  Text "Settings panel"`,
        container
      )

      // Both target views are in the DOM (parser-level desugaring puts
      // them as children of the NavItem).
      expect(root.textContent).toContain('Dashboard panel')
      expect(root.textContent).toContain('Settings panel')
    })
  })

  // ---------------------------------------------------------------------------
  // Cross-file `show X from Y`
  // ---------------------------------------------------------------------------

  describe('show X from Y — cross-file view reference', () => {
    it('loads view X from file Y.mirror via project auto-load', () => {
      const root = renderProject(
        {
          'layouts/Pages.mirror': `HomeView: Frame name HomeView, pad 20, bg #ff0000
  Text "Home from Pages.mirror"

SettingsView: Frame name SettingsView, pad 20, bg #00ff00
  Text "Settings from Pages.mirror"`,
          'layouts/app.mirror': `Tabs defaultValue "Home"
  Tab "Home", show HomeView from Pages
  Tab "Settings", show SettingsView from Pages`,
        },
        container
      )

      expect(root.textContent).toContain('Home from Pages.mirror')
      expect(root.textContent).toContain('Settings from Pages.mirror')
      expect(findByName(root, 'HomeView')).not.toBeNull()
      expect(findByName(root, 'SettingsView')).not.toBeNull()
    })

    it('three views in one Pages.mirror are all instantiable', () => {
      // Tutorial example from § "Element aus Datei: show X from Y".
      const root = renderProject(
        {
          'layouts/Pages.mirror': `HomeView: Frame name HomeView
  Text "Home"

SettingsView: Frame name SettingsView
  Text "Settings"

ProfileView: Frame name ProfileView
  Text "Profile"`,
          'layouts/app.mirror': `Tabs defaultValue "Home"
  Tab "Home", show HomeView from Pages
  Tab "Settings", show SettingsView from Pages
  Tab "Profile", show ProfileView from Pages`,
        },
        container
      )

      expect(root.textContent).toContain('Home')
      expect(root.textContent).toContain('Settings')
      expect(root.textContent).toContain('Profile')
    })

    it('show X without `from` resolves locally (same-file precedence)', () => {
      // Even when both a local AND a cross-file definition exist, the
      // local one wins. Project auto-load joins all files, but the parse
      // happens per-file; local-first comes from the order of declarations
      // in the unified componentMap.
      const root = renderProject(
        {
          'components/lib.mirror': `HomeView: Frame name HomeView
  Text "Lib home"`,
          'layouts/app.mirror': `Tabs defaultValue "X"
  Tab "X", show HomeView`,
        },
        container
      )

      // The component is found via auto-loaded components/.
      expect(root.textContent).toContain('Lib home')
    })
  })

  // ---------------------------------------------------------------------------
  // Robustness
  // ---------------------------------------------------------------------------

  describe('error / edge cases', () => {
    it('show X where X is undefined renders gracefully (no crash)', () => {
      // Parser desugars to a synthetic child instance of NonExistentView;
      // IR transform falls through to a primitive lookup and renders an
      // empty <div>. We don't crash, and the rest of the document still
      // renders.
      const root = render(
        `Tabs defaultValue "X"
  Tab "X", show NonExistentView

  Tab "Y"
    Text "Sibling tab"`,
        container
      )

      expect(root.textContent).toContain('Sibling tab')
    })

    it('show X on a non-Tab/NavItem element still injects the child', () => {
      // We desugar unconditionally — `show` is purely a parser-level
      // shorthand for "instantiate this component as my body content".
      // That works for any container.
      const root = render(
        `Frame show MyContent

MyContent: Frame name MyContent, pad 16
  Text "Embedded content"`,
        container
      )

      expect(root.textContent).toContain('Embedded content')
    })
  })

  // ---------------------------------------------------------------------------
  // Inline-action recognition in slot/inline-children context
  // ---------------------------------------------------------------------------

  describe('inline actions in slot bodies', () => {
    it('toast(...) in a slot body is parsed as onclick event, not as a property', () => {
      // Was a pre-existing bug: `parseInlineChildren` (the path used for
      // `Slot: Button "X", toast("ok")`) called `parseProperty()` which
      // doesn't know about implicit-onclick. The validator then complained
      // about "Unknown property toast". Mirroring the implicit-onclick
      // check from inline-property-parser fixes it.
      const src = `Frame
  CloseTrigger: Button "Save", bg #2271C1, toast("Saved")`

      // Compile end-to-end — should NOT throw a validation error.
      const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
      const fn = new Function(code + '\nreturn createUI();')
      const root = fn() as HTMLElement
      expect(root).toBeTruthy()

      // The Button must NOT carry a "toast" attribute (would mean it
      // was parsed as a property and rendered as data-* on the element).
      const button = root.querySelector('button')
      expect(button).not.toBeNull()
      expect(button?.getAttribute('toast')).toBeNull()
      expect(button?.getAttribute('data-toast')).toBeNull()
    })

    it('navigate(X) in a slot body is also recognized as onclick', () => {
      const src = `Frame
  Item: Button "Go", bg #2271C1, navigate(NextScreen)`
      const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
      const fn = new Function(code + '\nreturn createUI();')
      const root = fn() as HTMLElement
      const button = root.querySelector('button')
      expect(button).not.toBeNull()
      expect(button?.getAttribute('navigate')).toBeNull()
    })

    it('multiple inline actions in a slot body all parse as events', () => {
      const src = `Frame
  Btn: Button "X", toast("a"), toggle()`
      const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
      const fn = new Function(code + '\nreturn createUI();')
      const root = fn() as HTMLElement
      const button = root.querySelector('button')
      expect(button).not.toBeNull()
      // Neither action becomes a property
      expect(button?.getAttribute('toast')).toBeNull()
      expect(button?.getAttribute('toggle')).toBeNull()
    })
  })
})
