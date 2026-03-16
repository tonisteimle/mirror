/**
 * Navigation Feature Tests
 *
 * Tests für das Nav Primitiv und die route Property.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { toIR } from '../../ir'
import { generateDOM } from '../../backends/dom'

describe('Navigation', () => {
  describe('Parser: Nav Primitiv', () => {
    it('erkennt Nav als Primitiv', () => {
      const ast = parse(`
Nav
  Item "Home"
`)
      const navNode = ast.components.find(c => c.name === 'Nav')
      expect(navNode).toBeDefined()
      expect(navNode?.primitive).toBe('nav')
    })

    it('unterstützt Vererbung von Nav', () => {
      const ast = parse(`
Sidebar as Nav:
  pad 16
`)
      const sidebarDef = ast.components.find(c => c.name === 'Sidebar')
      expect(sidebarDef).toBeDefined()
      expect(sidebarDef?.extends).toBe('Nav')
    })
  })

  describe('Parser: route Property', () => {
    it('parst route Property', () => {
      const ast = parse(`
Item "Home" route Home
`)
      const item = ast.components.find(c => c.name === 'Item')
      expect(item?.route).toBe('Home')
    })

    it('parst route mit anderen Properties', () => {
      const ast = parse(`
NavItem "About" pad 12, route About
`)
      const item = ast.components.find(c => c.name === 'NavItem')
      expect(item?.route).toBe('About')
      expect(item?.properties).toContainEqual({ name: 'pad', value: 12 })
    })
  })

  describe('IR: Navigation Transformation', () => {
    it('setzt primitive: nav auf Nav-Nodes', () => {
      const ast = parse(`
Nav
  Item "Home"
`)
      const ir = toIR(ast)
      const navNode = ir.nodes.find(n => n.name === 'Nav')
      expect(navNode?.primitive).toBe('nav')
    })

    it('transformiert route Property', () => {
      const ast = parse(`
Nav
  Item "Home" route Home
`)
      const ir = toIR(ast)
      const navNode = ir.nodes.find(n => n.name === 'Nav')
      const itemNode = navNode?.children.find(c => c.name === 'Item')
      expect(itemNode?.route).toBe('Home')
    })

    it('propagiert navContainer zu Kindern', () => {
      const ast = parse(`
Nav
  Group
    Item "Home" route Home
`)
      const ir = toIR(ast)
      const navNode = ir.nodes.find(n => n.name === 'Nav')
      const groupNode = navNode?.children.find(c => c.name === 'Group')
      const itemNode = groupNode?.children.find(c => c.name === 'Item')
      expect(itemNode?.navContainer).toBe(navNode?.id)
    })

    it('generiert click-Event für route', () => {
      const ast = parse(`
Item "Home" route Home
`)
      const ir = toIR(ast)
      const itemNode = ir.nodes.find(n => n.name === 'Item')
      const clickEvent = itemNode?.events.find(e => e.name === 'click')
      expect(clickEvent).toBeDefined()
      expect(clickEvent?.actions).toContainEqual({
        type: 'navigate',
        target: 'Home'
      })
    })
  })

  describe('DOM Backend: Nav Rendering', () => {
    it('rendert Nav als <nav> Element', () => {
      const ast = parse(`
Nav
  Item "Home"
`)
      const code = generateDOM(ast)
      expect(code).toContain("document.createElement('nav')")
    })

    it('setzt data-nav-container Attribut', () => {
      const ast = parse(`
Nav
  Item "Home"
`)
      const code = generateDOM(ast)
      expect(code).toContain('dataset.navContainer')
    })

    it('setzt data-route Attribut', () => {
      const ast = parse(`
Item "Home" route Home
`)
      const code = generateDOM(ast)
      expect(code).toContain("dataset.route = 'Home'")
    })
  })

  describe('DOM Backend: Runtime', () => {
    it('generiert navigate Funktion', () => {
      const ast = parse(`
Nav
  Item "Home" route Home
`)
      const code = generateDOM(ast)
      expect(code).toContain('navigate(')
    })

    it('generiert updateNavSelection Funktion', () => {
      const ast = parse(`
Nav
  Item "Home" route Home
`)
      const code = generateDOM(ast)
      expect(code).toContain('updateNavSelection(')
    })
  })

  describe('Verhalten', () => {
    it.todo('Klick auf Element mit route zeigt Ziel-Komponente')
    it.todo('Klick auf Element mit route versteckt Geschwister der Ziel-Komponente')
    it.todo('Element mit route bekommt selected State wenn Route aktiv')
    it.todo('Erste Ziel-Komponente ist initial sichtbar')
    it.todo('Erstes Element mit route hat initial selected State')
  })

  describe('Navigation außerhalb Nav', () => {
    it('route funktioniert auch außerhalb von Nav', () => {
      const ast = parse(`
Link "Home" route Home
`)
      const ir = toIR(ast)
      const linkNode = ir.nodes.find(n => n.name === 'Link')
      expect(linkNode?.route).toBe('Home')
    })

    it('Element außerhalb Nav hat kein navContainer', () => {
      const ast = parse(`
Link "Home" route Home
`)
      const ir = toIR(ast)
      const linkNode = ir.nodes.find(n => n.name === 'Link')
      expect(linkNode?.navContainer).toBeUndefined()
    })
  })
})
