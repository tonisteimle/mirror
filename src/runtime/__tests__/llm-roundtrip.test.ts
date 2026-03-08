/**
 * LLM Round-Trip Test
 *
 * Simuliert: LLM schreibt M()-Code → M.toMirror() → Mirror DSL
 * Testet ob die Reverse-Translation funktioniert.
 */

import { M } from '../mirror-runtime'
import { parse } from '../../parser'

describe('LLM Round-Trip: M() → Mirror DSL', () => {

  // Helper: Prüft ob generierter Mirror-Code parsebar ist
  function assertValidMirror(code: string): void {
    try {
      parse(code)
    } catch (e) {
      throw new Error(`Generated Mirror code is invalid:\n${code}\n\nError: ${e}`)
    }
  }

  // ============================================================
  // TEST 1: Einfache Box mit Text
  // ============================================================
  test('Simple Box with Text', () => {
    // LLM schreibt:
    const ui = M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [
      M('Text', 'Hello World', { weight: 'bold' })
    ])

    // Reverse Translation:
    const mirror = M.toMirror(ui)
    console.log('--- Simple Box ---\n' + mirror + '\n')

    // Erwartung (ungefähr):
    // Box bg #1a1a23, pad 16, rad 8
    //   Text "Hello World", weight bold

    expect(mirror).toContain('Box')
    expect(mirror).toContain('bg #1a1a23')
    expect(mirror).toContain('Text "Hello World"')
    expect(mirror).toContain('weight bold')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 2: Button mit Hover State
  // ============================================================
  test('Button with Hover State', () => {
    // LLM schreibt:
    const button = M('Button', 'Click me', {
      pad: 12,
      bg: '#3B82F6',
      col: 'white',
      rad: 6,
      cursor: 'pointer',
      states: {
        hover: { bg: '#2563EB' }
      }
    })

    const mirror = M.toMirror(button)
    console.log('--- Button with Hover ---\n' + mirror + '\n')

    expect(mirror).toContain('Button "Click me"')
    expect(mirror).toContain('bg #3B82F6')
    expect(mirror).toContain('state hover bg #2563EB')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 3: Card mit mehreren Children
  // ============================================================
  test('Card with multiple children', () => {
    // LLM schreibt:
    const card = M('Box', { bg: '#1a1a23', pad: 16, rad: 8, gap: 8 }, [
      M('Text', 'Card Title', { weight: 'bold', 'font-size': 18 }),
      M('Text', 'Card description goes here', { col: '#888' }),
      M('Button', 'Action', { bg: '#3B82F6', col: 'white', pad: 8, rad: 4 })
    ])

    const mirror = M.toMirror(card)
    console.log('--- Card ---\n' + mirror + '\n')

    expect(mirror).toContain('Box')
    expect(mirror).toContain('gap 8')
    expect(mirror).toContain('Text "Card Title"')
    expect(mirror).toContain('Text "Card description goes here"')
    expect(mirror).toContain('Button "Action"')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 4: Navigation mit Icons
  // ============================================================
  test('Navigation with Icons', () => {
    // LLM schreibt:
    const nav = M('Box', { hor: true, gap: 16, pad: 12, bg: '#1a1a23' }, [
      M('Box', { hor: true, gap: 8, cursor: 'pointer' }, [
        M('Icon', 'home', { is: 20 }),
        M('Text', 'Home')
      ]),
      M('Box', { hor: true, gap: 8, cursor: 'pointer' }, [
        M('Icon', 'settings', { is: 20 }),
        M('Text', 'Settings')
      ])
    ])

    const mirror = M.toMirror(nav)
    console.log('--- Navigation ---\n' + mirror + '\n')

    expect(mirror).toContain('hor')
    expect(mirror).toContain('Icon "home"')
    expect(mirror).toContain('Icon "settings"')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 5: Dropdown mit State und Events
  // ============================================================
  test('Dropdown with State and Events', () => {
    // LLM schreibt:
    const dropdown = M('Box', {
      state: 'closed',
      'onkeydown escape': 'close',
      'onkeydown arrow-down': 'highlight next',
      'onkeydown arrow-up': 'highlight prev',
      'onkeydown enter': ['select highlighted', 'close']
    }, [
      M('Box', {
        hor: true,
        gap: 8,
        cursor: 'pointer',
        onclick: 'toggle'
      }, [
        M('Text', 'Select option'),
        M('Icon', 'chevron-down')
      ]),
      M('Box', {
        hidden: true,
        'visible-when': 'open',
        bg: '#1a1a23',
        rad: 4
      }, [
        M('Box', {
          pad: 8,
          cursor: 'pointer',
          onclick: ['select', 'close'],
          states: { highlighted: { bg: '#333' } }
        }, [M('Text', 'Option 1')]),
        M('Box', {
          pad: 8,
          cursor: 'pointer',
          onclick: ['select', 'close'],
          states: { highlighted: { bg: '#333' } }
        }, [M('Text', 'Option 2')])
      ])
    ])

    const mirror = M.toMirror(dropdown)
    console.log('--- Dropdown ---\n' + mirror + '\n')

    expect(mirror).toContain('state closed')
    expect(mirror).toContain('onkeydown escape')
    expect(mirror).toContain('onclick toggle')
    expect(mirror).toContain('state highlighted bg #333')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 6: Form mit Inputs
  // ============================================================
  test('Form with Inputs', () => {
    // LLM schreibt:
    const form = M('Box', { gap: 16 }, [
      M('Box', { gap: 4 }, [
        M('Text', 'Email', { 'font-size': 12, col: '#888' }),
        M('Input', {
          placeholder: 'Enter email',
          pad: 8,
          rad: 4,
          bg: '#1a1a23',
          col: 'white'
        })
      ]),
      M('Box', { gap: 4 }, [
        M('Text', 'Password', { 'font-size': 12, col: '#888' }),
        M('Input', {
          type: 'password',
          placeholder: 'Enter password',
          pad: 8,
          rad: 4,
          bg: '#1a1a23',
          col: 'white'
        })
      ]),
      M('Button', 'Submit', {
        bg: '#3B82F6',
        col: 'white',
        pad: 12,
        rad: 6,
        onclick: 'call submitForm'
      })
    ])

    const mirror = M.toMirror(form)
    console.log('--- Form ---\n' + mirror + '\n')

    expect(mirror).toContain('Input')
    expect(mirror).toContain('Button "Submit"')
    expect(mirror).toContain('onclick call submitForm')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 7: Layout-Kombinationen
  // ============================================================
  test('Layout combinations', () => {
    // LLM schreibt:
    const layout = M('Box', { hor: true, w: 'full', h: 'full' }, [
      // Sidebar
      M('Box', { w: 200, bg: '#1a1a23', pad: 16, gap: 8 }, [
        M('Text', 'Sidebar', { weight: 'bold' })
      ]),
      // Content
      M('Box', { w: 'full', pad: 16, gap: 16 }, [
        M('Text', 'Main Content', { weight: 'bold', 'font-size': 24 }),
        M('Box', { grid: 3, gap: 16 }, [
          M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [M('Text', 'Card 1')]),
          M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [M('Text', 'Card 2')]),
          M('Box', { bg: '#1a1a23', pad: 16, rad: 8 }, [M('Text', 'Card 3')])
        ])
      ])
    ])

    const mirror = M.toMirror(layout)
    console.log('--- Layout ---\n' + mirror + '\n')

    expect(mirror).toContain('hor')
    expect(mirror).toContain('w full')
    expect(mirror).toContain('w 200')
    expect(mirror).toContain('grid 3')

    assertValidMirror(mirror)
  })

  // ============================================================
  // TEST 8: Component Definition (M.define)
  // ============================================================
  test('Component Definition', () => {
    // LLM definiert Komponente:
    M.define('Card', { bg: '#1a1a23', pad: 16, rad: 8 })
      .slots('Title', 'Content')
      .build()

    // LLM nutzt Komponente:
    const card = M('Card', {
      Title: 'Welcome',
      Content: M('Text', 'Description here', { col: '#888' })
    })

    const mirror = M.toMirror(card)
    console.log('--- Component Usage ---\n' + mirror + '\n')

    expect(mirror).toContain('Card')
    expect(mirror).toContain('Title "Welcome"')

    // Note: Parser validation might fail for custom components
    // That's expected - we're testing the M.toMirror output format
  })

})

// ============================================================
// STANDALONE TEST: Run with ts-node or in browser console
// ============================================================
if (typeof window !== 'undefined' || process.argv[1]?.includes('llm-roundtrip')) {
  console.log('\n=== LLM Round-Trip Manual Test ===\n')

  // Simuliere LLM-Output:
  const ui = M('Box', { bg: '#1a1a23', pad: 16, rad: 8, gap: 12 }, [
    M('Text', 'Dashboard', { weight: 'bold', 'font-size': 20 }),
    M('Box', { hor: true, gap: 8 }, [
      M('Button', 'New', { bg: '#3B82F6', col: 'white', pad: 8, rad: 4 }),
      M('Button', 'Export', { bg: '#333', col: 'white', pad: 8, rad: 4 })
    ]),
    M('Box', { bg: '#333', pad: 12, rad: 4 }, [
      M('Text', 'No items yet', { col: '#888' })
    ])
  ])

  console.log('Generated Mirror Code:')
  console.log('─'.repeat(40))
  console.log(M.toMirror(ui))
  console.log('─'.repeat(40))
}
