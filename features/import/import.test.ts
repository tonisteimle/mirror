/**
 * Import Feature - Integration Tests
 *
 * Tests the complete import workflow from preprocessing through compilation.
 */

import { describe, it, expect } from 'vitest'
import { compile, resolveImports, parse, generateDOM } from '../../packages/mirror-lang/src'

describe('Import Feature', () => {
  // Helper to create a virtual file system
  const createFS = (files: Record<string, string>) => {
    return (path: string) => files[path] || null
  }

  describe('Basic Workflow', () => {
    it('compiles with imported tokens', () => {
      const files: Record<string, string> = {
        'tokens.mirror': 'primary: #3B82F6'
      }

      const code = `import tokens

Button bg primary
  "Click"`

      const resolvedCode = resolveImports(code, createFS(files))

      expect(resolvedCode).toContain('primary: #3B82F6')
      expect(resolvedCode).toContain('Button bg primary')

      // Should compile without errors
      const ast = parse(resolvedCode)
      expect(ast.errors).toHaveLength(0)
    })

    it('compiles with imported components', () => {
      const files: Record<string, string> = {
        'components.mirror': 'Button: pad 12, bg #3B82F6, rad 6'
      }

      const code = `import components

App
  Button "Click me"`

      const output = compile(code, { readFile: createFS(files) })

      expect(output).toContain('createUI')
      expect(output).toContain('padding')
      expect(output).toContain('border-radius')
    })
  })

  describe('Multi-File Project', () => {
    it('handles typical project structure', () => {
      const files: Record<string, string> = {
        'tokens.mirror': `$primary: #3B82F6
$surface: #1a1a23`,
        'components.mirror': `Card: pad 16, bg $surface, rad 8
Button: pad 12, bg $primary, rad 6`
      }

      const code = `import tokens, components

App
  Card
    Title "Welcome"
    Button "Start"`

      const output = compile(code, { readFile: createFS(files) })

      expect(output).toContain('#3B82F6') // primary color
      expect(output).toContain('#1a1a23') // surface color
    })
  })

  describe('Nested Imports', () => {
    it('resolves imports within imports', () => {
      const files: Record<string, string> = {
        'base.mirror': '$bg: #1a1a23',
        'components.mirror': `import base
Panel: bg $bg`
      }

      const code = 'import components'
      const resolved = resolveImports(code, createFS(files))

      expect(resolved).toContain('$bg: #1a1a23')
      expect(resolved).toContain('Panel: bg $bg')
    })
  })

  describe('Indented Import', () => {
    it('imports as children with correct indentation', () => {
      const files: Record<string, string> = {
        'menu-items.mirror': `Item "Home"
Item "About"
Item "Contact"`
      }

      const code = `Nav
  import menu-items`

      const resolved = resolveImports(code, createFS(files))

      // Check that items are indented under Nav
      const lines = resolved.split('\n')
      expect(lines[0]).toBe('Nav')
      expect(lines[1]).toBe('  Item "Home"')
      expect(lines[2]).toBe('  Item "About"')
      expect(lines[3]).toBe('  Item "Contact"')
    })
  })

  describe('Error Handling', () => {
    it('continues compilation with missing imports', () => {
      const code = `import missing

App
  Text "Still works"`

      const resolved = resolveImports(code, () => null)

      expect(resolved).toContain('// Import not found')
      expect(resolved).toContain('App')

      // Should still compile
      const ast = parse(resolved)
      expect(ast.instances.some(i => i.name === 'App')).toBe(true)
    })
  })
})
