/**
 * Tests for Table improvements:
 * - Sort icons and runtime sorting
 * - Sticky header
 * - Pagination
 * - Group slot fix
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../compiler/index'

describe('Table Improvements', () => {
  describe('Sorting', () => {
    it('renders sort icons for sortable columns', () => {
      const code = `
Table $tasks
  Column title, sortable
  Column status
`
      const js = compile(code)
      expect(js).toContain('mirror-sort-icon')
      expect(js).toContain('_runtime.tableSort')
    })

    it('adds click handler for sortable columns', () => {
      const code = `
Table $tasks
  Column name, sortable
`
      const js = compile(code)
      expect(js).toContain("addEventListener('click'")
      expect(js).toContain("_runtime.tableSort")
    })

    it('handles sortable with desc flag', () => {
      const code = `
Table $tasks
  Column priority, sortable, desc
`
      const js = compile(code)
      expect(js).toContain('sortable')
    })
  })

  describe('Sticky Header', () => {
    it('applies sticky styles when stickyHeader is set', () => {
      const code = `
Table $tasks, stickyHeader
  Column title
  Column done
`
      const js = compile(code)
      expect(js).toContain("position: 'sticky'")
      expect(js).toContain("top: '0'")
      expect(js).toContain("zIndex: '10'")
    })

    it('does not apply sticky styles without flag', () => {
      const code = `
Table $tasks
  Column title
`
      const js = compile(code)
      expect(js).not.toContain("position: 'sticky'")
    })
  })

  describe('Pagination', () => {
    it('renders paginator when pageSize is set', () => {
      const code = `Table $tasks, pageSize 10`
      const js = compile(code)
      expect(js).toContain('mirror-table-paginator')
      expect(js).toContain('_runtime.tablePrev')
      expect(js).toContain('_runtime.tableNext')
    })

    it('renders page info display', () => {
      const code = `Table $tasks, pageSize 5`
      const js = compile(code)
      expect(js).toContain('mirror-paginator-info')
      expect(js).toContain('Page 1 of')
    })

    it('stores page state on table element', () => {
      const code = `Table $tasks, pageSize 20`
      const js = compile(code)
      expect(js).toContain('_pageState')
      expect(js).toContain('size: 20')
    })
  })

  describe('Group Slot', () => {
    it('renders custom Group slot content', () => {
      const code = `
Table $tasks grouped by status
  Group: hor, spread, pad 12
    Text group.key
    Text group.count
`
      const js = compile(code)
      // Should define group object with key and count
      expect(js).toContain('const group = { key:')
      expect(js).toContain('count:')
    })

    it('uses default group header when no slot defined', () => {
      const code = `Table $tasks grouped by status`
      const js = compile(code)
      expect(js).toContain('mirror-table-group-header')
      // XSS-safe: uses createElement and textContent instead of innerHTML
      expect(js).toContain('groupKeySpan.textContent')
      expect(js).toContain('groupHeader.appendChild')
    })
  })

  describe('Combined Features', () => {
    it('combines sortable, stickyHeader, and pageSize', () => {
      const code = `
Table $tasks, stickyHeader, pageSize 10
  Column title, sortable
  Column priority, sortable, desc
  Column done
`
      const js = compile(code)
      // Verify all features present
      expect(js).toContain("position: 'sticky'")  // sticky header
      expect(js).toContain('mirror-sort-icon')     // sort icons
      expect(js).toContain('mirror-table-paginator') // pagination
    })
  })

  describe('Sorting Bug Fixes', () => {
    it('adds data-field attribute to cells for sorting', () => {
      const code = `
Table $tasks
  Column title, sortable
  Column status
`
      const js = compile(code)
      // Cells should have data-field for runtime sorting to work
      expect(js).toContain(".dataset.field = 'title'")
      expect(js).toContain(".dataset.field = 'status'")
    })
  })

  describe('Pagination Bug Fixes', () => {
    it('calls _updateTablePage on init to hide rows beyond first page', () => {
      const code = `Table $tasks, pageSize 10`
      const js = compile(code)
      // Should call _updateTablePage after initializing state
      expect(js).toContain('_runtime._updateTablePage')
    })
  })

  describe('Custom Sort Icons', () => {
    it('supports SortAsc and SortDesc slot syntax', () => {
      // Test that the syntax is parsed without errors
      const code = `
Table $tasks
  SortAsc: Icon "chevron-up"
  SortDesc: Icon "chevron-down"
  Column title, sortable
`
      const js = compile(code)
      // Should compile without errors and have sort functionality
      expect(js).toContain('mirror-sort-icon')
      expect(js).toContain('tableSort')
    })

    it('supports SortIcon slot syntax', () => {
      // Test that single SortIcon syntax is parsed
      const code = `
Table $tasks
  SortIcon: Icon "arrow-up-down"
  Column title, sortable
`
      const js = compile(code)
      // Should compile without errors
      expect(js).toContain('mirror-sort-icon')
    })
  })
})
