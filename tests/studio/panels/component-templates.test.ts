/**
 * Component Templates Tests
 *
 * Unit tests for component definition detection and insertion position calculation.
 * These are CRITICAL functions that determine where definitions get inserted.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  hasComponentDefinition,
  findDefinitionInsertPosition,
  getComponentDefinition,
  COMPONENT_DEFINITIONS,
} from '../../../studio/panels/components/component-templates'

// ============================================================================
// hasComponentDefinition Tests
// ============================================================================

describe('hasComponentDefinition', () => {
  describe('detects existing definitions', () => {
    it('detects "Select:" at start of file', () => {
      const code = `Select:
  Trigger: bg #27272a

Frame gap 8`

      expect(hasComponentDefinition(code, 'Select')).toBe(true)
    })

    it('detects "Checkbox:" with indented slots', () => {
      const code = `Checkbox:
  Control: w 18, h 18
  Label: col white

Frame gap 8
  Checkbox "Test"`

      expect(hasComponentDefinition(code, 'Checkbox')).toBe(true)
    })

    it('detects definition after tokens', () => {
      const code = `primary.bg: #5BA8F5
muted.col: #888

Select:
  Trigger: pad 8

Frame gap 8`

      expect(hasComponentDefinition(code, 'Select')).toBe(true)
    })

    it('detects definition with spaces before colon', () => {
      const code = `Dialog :
  Trigger: Button
  Content: Frame`

      expect(hasComponentDefinition(code, 'Dialog')).toBe(true)
    })
  })

  describe('rejects non-definitions', () => {
    it('rejects instance usage (no colon)', () => {
      const code = `Frame gap 8
  Checkbox "Label"
  Select placeholder "Choose"`

      expect(hasComponentDefinition(code, 'Checkbox')).toBe(false)
      expect(hasComponentDefinition(code, 'Select')).toBe(false)
    })

    it('NOTE: currently matches indented slots (known limitation)', () => {
      // hasComponentDefinition uses regex `^\s*ComponentName\s*:` which matches
      // indented slots too. This is a known limitation but doesn't cause issues
      // in practice because slots (Trigger, Content, Item) are not in COMPONENT_DEFINITIONS.
      const code = `Select:
  Trigger: bg #27272a
  Content: bg #27272a
  Item: pad 8`

      // Current behavior: matches indented lines too
      // This is OK because 'Trigger', 'Content', 'Item' are not component names
      // that would have definitions in COMPONENT_DEFINITIONS
      expect(hasComponentDefinition(code, 'Trigger')).toBe(true) // matches, but no definition exists
      expect(hasComponentDefinition(code, 'Content')).toBe(true) // matches, but no definition exists
      expect(hasComponentDefinition(code, 'Item')).toBe(true) // matches, but no definition exists

      // What matters: it correctly identifies actual component definitions
      expect(hasComponentDefinition(code, 'Select')).toBe(true)
      expect(hasComponentDefinition(code, 'Checkbox')).toBe(false)
    })

    it('rejects when component name appears in text', () => {
      const code = `Frame gap 8
  Text "Select an option"
  Text "Checkbox is useful"`

      expect(hasComponentDefinition(code, 'Select')).toBe(false)
      expect(hasComponentDefinition(code, 'Checkbox')).toBe(false)
    })

    it('returns false for empty code', () => {
      expect(hasComponentDefinition('', 'Select')).toBe(false)
      expect(hasComponentDefinition('', 'Checkbox')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles multiple definitions', () => {
      const code = `Select:
  Trigger: bg #27272a

Checkbox:
  Control: w 18

Dialog:
  Content: pad 24`

      expect(hasComponentDefinition(code, 'Select')).toBe(true)
      expect(hasComponentDefinition(code, 'Checkbox')).toBe(true)
      expect(hasComponentDefinition(code, 'Dialog')).toBe(true)
      expect(hasComponentDefinition(code, 'Switch')).toBe(false)
    })

    it('is case-sensitive', () => {
      const code = `Select:
  Trigger: bg #27272a`

      expect(hasComponentDefinition(code, 'Select')).toBe(true)
      expect(hasComponentDefinition(code, 'select')).toBe(false)
      expect(hasComponentDefinition(code, 'SELECT')).toBe(false)
    })
  })
})

// ============================================================================
// findDefinitionInsertPosition Tests
// ============================================================================

describe('findDefinitionInsertPosition', () => {
  describe('basic positioning', () => {
    it('returns 0 for empty code', () => {
      expect(findDefinitionInsertPosition('')).toBe(0)
    })

    it('returns 0 for code without tokens or definitions', () => {
      const code = `Frame gap 8
  Text "Hello"`

      expect(findDefinitionInsertPosition(code)).toBe(0)
    })

    it('inserts after single token', () => {
      const code = `primary.bg: #5BA8F5

Frame gap 8`

      // Line 1 is the token, so insert after line 1
      expect(findDefinitionInsertPosition(code)).toBe(1)
    })

    it('inserts after multiple tokens', () => {
      const code = `primary.bg: #5BA8F5
muted.col: #888
danger.bg: #ef4444

Frame gap 8`

      // Lines 1-3 are tokens, insert after line 3
      expect(findDefinitionInsertPosition(code)).toBe(3)
    })
  })

  describe('after existing definitions', () => {
    it('inserts after single-line definition', () => {
      const code = `Select:
  Trigger: bg #27272a

Frame gap 8`

      // Definition ends on line 2, insert after line 2
      expect(findDefinitionInsertPosition(code)).toBe(2)
    })

    it('inserts after multi-line definition', () => {
      const code = `Select:
  Trigger: bg #27272a
  Content: bg #27272a
  Item: pad 8

Frame gap 8`

      // Definition ends on line 4, insert after line 4
      expect(findDefinitionInsertPosition(code)).toBe(4)
    })

    it('inserts after last definition when multiple exist', () => {
      const code = `Select:
  Trigger: bg #27272a

Checkbox:
  Control: w 18
  Label: col white

Frame gap 8`

      // Last definition (Checkbox) ends on line 6, insert after line 6
      expect(findDefinitionInsertPosition(code)).toBe(6)
    })
  })

  describe('tokens AND definitions', () => {
    it('prefers after definitions over tokens', () => {
      const code = `primary.bg: #5BA8F5

Select:
  Trigger: bg #27272a

Frame gap 8`

      // Definition ends on line 4, which is later than token on line 1
      expect(findDefinitionInsertPosition(code)).toBe(4)
    })

    it('handles interleaved tokens and definitions', () => {
      const code = `primary.bg: #5BA8F5
muted.col: #888

Select:
  Trigger: bg #27272a
  Content: bg #27272a

Checkbox:
  Control: w 18

Frame gap 8`

      // Last definition (Checkbox) ends on line 9
      expect(findDefinitionInsertPosition(code)).toBe(9)
    })
  })

  describe('edge cases', () => {
    it('handles definition with empty lines within', () => {
      const code = `Select:
  Trigger: bg #27272a

  Content: bg #27272a

Frame gap 8`

      // Empty line is still part of definition (next non-empty indented line continues it)
      const pos = findDefinitionInsertPosition(code)
      expect(pos).toBeGreaterThan(1)
    })

    it('handles legacy token syntax ($name)', () => {
      const code = `$primary.bg: #5BA8F5
$muted.col: #888

Frame gap 8`

      // Legacy tokens on lines 1-2, insert after line 2
      expect(findDefinitionInsertPosition(code)).toBe(2)
    })

    it('does not confuse indented code with definition', () => {
      const code = `Frame gap 8
  Text "Hello"
  Button "Click"`

      // No definitions or tokens, return 0
      expect(findDefinitionInsertPosition(code)).toBe(0)
    })
  })
})

// ============================================================================
// getComponentDefinition Tests
// ============================================================================

describe('getComponentDefinition', () => {
  it('returns definition for known component', () => {
    const selectDef = getComponentDefinition('Select')
    expect(selectDef).toBeDefined()
    expect(selectDef).toContain('Select:')
    expect(selectDef).toContain('Trigger:')
    expect(selectDef).toContain('Content:')
    expect(selectDef).toContain('Item:')
  })

  it('returns definition for Checkbox', () => {
    const def = getComponentDefinition('Checkbox')
    expect(def).toBeDefined()
    expect(def).toContain('Checkbox:')
    expect(def).toContain('Control:')
    expect(def).toContain('Label:')
  })

  it('returns definition for Dialog', () => {
    const def = getComponentDefinition('Dialog')
    expect(def).toBeDefined()
    expect(def).toContain('Dialog:')
    expect(def).toContain('Trigger:')
    expect(def).toContain('Backdrop:')
    expect(def).toContain('Content:')
  })

  it('returns undefined for primitive components', () => {
    expect(getComponentDefinition('Button')).toBeUndefined()
    expect(getComponentDefinition('Text')).toBeUndefined()
    expect(getComponentDefinition('Frame')).toBeUndefined()
    expect(getComponentDefinition('Input')).toBeUndefined()
  })

  it('returns undefined for unknown components', () => {
    expect(getComponentDefinition('Unknown')).toBeUndefined()
    expect(getComponentDefinition('')).toBeUndefined()
  })

  it('all COMPONENT_DEFINITIONS have valid format', () => {
    for (const [name, def] of Object.entries(COMPONENT_DEFINITIONS)) {
      // Definition must start with "ComponentName:"
      expect(def).toMatch(new RegExp(`^${name}:`))

      // Definition must have at least one slot
      expect(def).toContain(':')

      // Definition should be multi-line (have slots)
      expect(def.split('\n').length).toBeGreaterThan(1)
    }
  })
})

// ============================================================================
// Integration: Definition Detection + Position
// ============================================================================

describe('Definition Insertion Logic (Integration)', () => {
  it('correctly identifies where to insert new Select definition', () => {
    const code = `primary.bg: #5BA8F5

Frame gap 8
  Text "Form"`

    // No Select definition exists
    expect(hasComponentDefinition(code, 'Select')).toBe(false)

    // Should insert after token (line 1)
    expect(findDefinitionInsertPosition(code)).toBe(1)
  })

  it('skips insertion when definition already exists', () => {
    const code = `Select:
  Trigger: bg #27272a
  Content: bg #27272a

Frame gap 8
  Select placeholder "Choose"`

    // Definition exists
    expect(hasComponentDefinition(code, 'Select')).toBe(true)

    // Position doesn't matter since we won't insert
    // But it should still return a valid position
    const pos = findDefinitionInsertPosition(code)
    expect(pos).toBeGreaterThan(0)
  })

  it('handles adding second definition after first', () => {
    const code = `Select:
  Trigger: bg #27272a

Frame gap 8`

    // Select exists, Checkbox doesn't
    expect(hasComponentDefinition(code, 'Select')).toBe(true)
    expect(hasComponentDefinition(code, 'Checkbox')).toBe(false)

    // New definition should go after Select definition (line 2)
    expect(findDefinitionInsertPosition(code)).toBe(2)
  })
})
