/**
 * Page Route Tests
 *
 * Tests navigation to external pages (lowercase route = load .mirror file)
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'

describe('Page Route', () => {
  describe('Route Type Detection', () => {
    it('generates navigateToPage for lowercase route', () => {
      const code = `
Nav
  Item "Home" route home
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should use navigateToPage for lowercase
      expect(output).toContain("navigateToPage('home'")
    })

    it('generates navigate for uppercase route', () => {
      const code = `
Nav
  Item "Home" route Home
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should use navigate for uppercase
      expect(output).toContain("navigate('Home'")
      expect(output).not.toContain("navigateToPage('Home'")
    })

    it('handles path routes as page routes', () => {
      const code = `
Nav
  Item "Users" route admin/users
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Paths start with lowercase = page route
      expect(output).toContain("navigateToPage('admin/users'")
    })
  })

  describe('Runtime Functions', () => {
    it('includes navigateToPage runtime function', () => {
      const code = `
Nav
  Item "Home" route home
`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('navigateToPage(pageName, clickedElement)')
      expect(output).toContain('Mirror.compile')
      expect(output).toContain('getPageContainer')
    })

    it('includes getPageContainer runtime function', () => {
      const code = `
Nav
  Item "Home" route home
`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('getPageContainer()')
      expect(output).toContain('data-page-container')
    })
  })

  describe('Mixed Routes', () => {
    it('handles both component and page routes', () => {
      const code = `
Nav
  Item "Dashboard" route Dashboard
  Item "Home" route home
  Item "Settings" route settings
`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Dashboard = component route
      expect(output).toContain("navigate('Dashboard'")
      // home and settings = page routes
      expect(output).toContain("navigateToPage('home'")
      expect(output).toContain("navigateToPage('settings'")
    })
  })
})
