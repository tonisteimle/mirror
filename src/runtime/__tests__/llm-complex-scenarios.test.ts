/**
 * LLM Complex Scenarios Test
 *
 * Kann ein LLM mit dem M()-Framework komplexe UIs bauen?
 * - Vollständiges Dashboard
 * - Funktionales Dropdown
 * - Data Table
 * - Modal Dialog
 */

import { M } from '../mirror-runtime'
import { parse } from '../../parser'

function assertValidMirror(code: string): void {
  try {
    parse(code)
  } catch (e) {
    console.error('Invalid Mirror code:\n' + code)
    throw e
  }
}

describe('LLM Complex Scenarios', () => {

  // ============================================================
  // SCENARIO 1: Vollständiges Dashboard
  // ============================================================
  test('Complete Dashboard with Sidebar, Header, Stats, Table', () => {

    // LLM Prompt: "Baue ein Dashboard mit Sidebar-Navigation,
    // Header mit User-Menu, Statistik-Karten und einer Datentabelle"

    const dashboard = M('Box', { hor: true, w: 'full', h: 'full', bg: '#0a0a0f' }, [

      // === SIDEBAR ===
      M('Box', { w: 240, bg: '#1a1a23', pad: 16, gap: 8 }, [
        // Logo
        M('Box', { hor: true, gap: 12, pad: 8 }, [
          M('Icon', 'layout-dashboard', { is: 24, col: '#3B82F6' }),
          M('Text', 'Dashboard', { weight: 'bold', 'font-size': 18, col: 'white' })
        ]),

        // Divider
        M('Box', { h: 1, bg: '#333', margin: [16, 0] }),

        // Navigation Items
        M('Box', { gap: 4 }, [
          // Nav Item - Active
          M('Box', {
            hor: true,
            gap: 12,
            pad: 12,
            rad: 8,
            bg: '#3B82F6',
            cursor: 'pointer',
            states: { hover: { bg: '#2563EB' } }
          }, [
            M('Icon', 'home', { is: 20 }),
            M('Text', 'Overview', { col: 'white' })
          ]),

          // Nav Item - Inactive
          M('Box', {
            hor: true,
            gap: 12,
            pad: 12,
            rad: 8,
            cursor: 'pointer',
            states: { hover: { bg: '#333' } }
          }, [
            M('Icon', 'users', { is: 20, col: '#888' }),
            M('Text', 'Users', { col: '#888' })
          ]),

          M('Box', {
            hor: true,
            gap: 12,
            pad: 12,
            rad: 8,
            cursor: 'pointer',
            states: { hover: { bg: '#333' } }
          }, [
            M('Icon', 'file-text', { is: 20, col: '#888' }),
            M('Text', 'Reports', { col: '#888' })
          ]),

          M('Box', {
            hor: true,
            gap: 12,
            pad: 12,
            rad: 8,
            cursor: 'pointer',
            states: { hover: { bg: '#333' } }
          }, [
            M('Icon', 'settings', { is: 20, col: '#888' }),
            M('Text', 'Settings', { col: '#888' })
          ])
        ])
      ]),

      // === MAIN CONTENT ===
      M('Box', { w: 'full', gap: 24 }, [

        // === HEADER ===
        M('Box', {
          hor: true,
          spread: true,
          pad: [16, 24],
          bg: '#1a1a23',
          'border-color': '#333'
        }, [
          // Search
          M('Box', { hor: true, gap: 8, bg: '#0a0a0f', pad: [8, 16], rad: 8, w: 300 }, [
            M('Icon', 'search', { is: 18, col: '#666' }),
            M('Input', { placeholder: 'Search...', bg: 'transparent', col: 'white' })
          ]),

          // User Menu
          M('Box', { hor: true, gap: 16 }, [
            M('Box', { cursor: 'pointer', states: { hover: { opacity: 0.8 } } }, [
              M('Icon', 'bell', { is: 20, col: '#888' })
            ]),
            M('Box', { hor: true, gap: 8, cursor: 'pointer' }, [
              M('Box', { w: 32, h: 32, rad: 16, bg: '#3B82F6', center: true }, [
                M('Text', 'JD', { col: 'white', weight: 'bold', 'font-size': 12 })
              ]),
              M('Icon', 'chevron-down', { is: 16, col: '#888' })
            ])
          ])
        ]),

        // === CONTENT AREA ===
        M('Box', { pad: 24, gap: 24 }, [

          // Page Title
          M('Box', { gap: 4 }, [
            M('Text', 'Overview', { weight: 'bold', 'font-size': 24, col: 'white' }),
            M('Text', 'Welcome back, here\'s what\'s happening', { col: '#888' })
          ]),

          // === STATS CARDS ===
          M('Box', { hor: true, gap: 16 }, [
            // Stat Card 1
            M('Box', { w: 'full', bg: '#1a1a23', pad: 20, rad: 12, gap: 12 }, [
              M('Box', { hor: true, spread: true }, [
                M('Text', 'Total Users', { col: '#888', 'font-size': 14 }),
                M('Icon', 'users', { is: 20, col: '#3B82F6' })
              ]),
              M('Text', '12,456', { weight: 'bold', 'font-size': 28, col: 'white' }),
              M('Box', { hor: true, gap: 4 }, [
                M('Icon', 'trending-up', { is: 16, col: '#22C55E' }),
                M('Text', '+12.5%', { col: '#22C55E', 'font-size': 14 }),
                M('Text', 'from last month', { col: '#666', 'font-size': 14 })
              ])
            ]),

            // Stat Card 2
            M('Box', { w: 'full', bg: '#1a1a23', pad: 20, rad: 12, gap: 12 }, [
              M('Box', { hor: true, spread: true }, [
                M('Text', 'Revenue', { col: '#888', 'font-size': 14 }),
                M('Icon', 'dollar-sign', { is: 20, col: '#22C55E' })
              ]),
              M('Text', '$84,230', { weight: 'bold', 'font-size': 28, col: 'white' }),
              M('Box', { hor: true, gap: 4 }, [
                M('Icon', 'trending-up', { is: 16, col: '#22C55E' }),
                M('Text', '+8.2%', { col: '#22C55E', 'font-size': 14 }),
                M('Text', 'from last month', { col: '#666', 'font-size': 14 })
              ])
            ]),

            // Stat Card 3
            M('Box', { w: 'full', bg: '#1a1a23', pad: 20, rad: 12, gap: 12 }, [
              M('Box', { hor: true, spread: true }, [
                M('Text', 'Active Sessions', { col: '#888', 'font-size': 14 }),
                M('Icon', 'activity', { is: 20, col: '#F59E0B' })
              ]),
              M('Text', '1,892', { weight: 'bold', 'font-size': 28, col: 'white' }),
              M('Box', { hor: true, gap: 4 }, [
                M('Icon', 'trending-down', { is: 16, col: '#EF4444' }),
                M('Text', '-3.1%', { col: '#EF4444', 'font-size': 14 }),
                M('Text', 'from last hour', { col: '#666', 'font-size': 14 })
              ])
            ])
          ]),

          // === DATA TABLE ===
          M('Box', { bg: '#1a1a23', rad: 12, clip: true }, [
            // Table Header
            M('Box', { hor: true, spread: true, pad: 16, 'border-color': '#333' }, [
              M('Text', 'Recent Transactions', { weight: 'bold', col: 'white' }),
              M('Button', 'View All', {
                bg: 'transparent',
                col: '#3B82F6',
                'font-size': 14,
                cursor: 'pointer',
                states: { hover: { col: '#2563EB' } }
              })
            ]),

            // Table Column Headers
            M('Box', { hor: true, pad: [12, 16], bg: '#0a0a0f' }, [
              M('Text', 'Customer', { col: '#888', 'font-size': 12, w: 200 }),
              M('Text', 'Amount', { col: '#888', 'font-size': 12, w: 100 }),
              M('Text', 'Status', { col: '#888', 'font-size': 12, w: 100 }),
              M('Text', 'Date', { col: '#888', 'font-size': 12, w: 'full' })
            ]),

            // Table Rows
            M('Box', { gap: 0 }, [
              // Row 1
              M('Box', {
                hor: true,
                pad: [12, 16],
                cursor: 'pointer',
                states: { hover: { bg: '#222' } }
              }, [
                M('Box', { hor: true, gap: 12, w: 200 }, [
                  M('Box', { w: 32, h: 32, rad: 16, bg: '#3B82F6', center: true }, [
                    M('Text', 'AJ', { col: 'white', 'font-size': 12 })
                  ]),
                  M('Text', 'Alice Johnson', { col: 'white' })
                ]),
                M('Text', '$1,250.00', { col: 'white', w: 100 }),
                M('Box', { w: 100 }, [
                  M('Box', { bg: '#22C55E20', pad: [4, 8], rad: 4, w: 'hug' }, [
                    M('Text', 'Completed', { col: '#22C55E', 'font-size': 12 })
                  ])
                ]),
                M('Text', 'Mar 15, 2024', { col: '#888', w: 'full' })
              ]),

              // Row 2
              M('Box', {
                hor: true,
                pad: [12, 16],
                cursor: 'pointer',
                states: { hover: { bg: '#222' } }
              }, [
                M('Box', { hor: true, gap: 12, w: 200 }, [
                  M('Box', { w: 32, h: 32, rad: 16, bg: '#F59E0B', center: true }, [
                    M('Text', 'BS', { col: 'white', 'font-size': 12 })
                  ]),
                  M('Text', 'Bob Smith', { col: 'white' })
                ]),
                M('Text', '$890.00', { col: 'white', w: 100 }),
                M('Box', { w: 100 }, [
                  M('Box', { bg: '#F59E0B20', pad: [4, 8], rad: 4, w: 'hug' }, [
                    M('Text', 'Pending', { col: '#F59E0B', 'font-size': 12 })
                  ])
                ]),
                M('Text', 'Mar 14, 2024', { col: '#888', w: 'full' })
              ])
            ])
          ])
        ])
      ])
    ])

    const mirror = M.toMirror(dashboard)
    console.log('=== DASHBOARD ===\n' + mirror.substring(0, 2000) + '\n...(truncated)')

    // Validierung
    expect(mirror).toContain('Box hor, w full, h full')
    expect(mirror).toContain('Icon "layout-dashboard"')
    expect(mirror).toContain('Text "Overview"')
    expect(mirror).toContain('Text "$84,230"')
    expect(mirror).toContain('state hover')

    assertValidMirror(mirror)
  })

  // ============================================================
  // SCENARIO 2: Funktionales Dropdown
  // ============================================================
  test('Fully Functional Dropdown with Keyboard Navigation', () => {

    // LLM Prompt: "Baue ein Dropdown-Menu mit:
    // - Toggle via Click
    // - Keyboard: Escape schließt, Arrow Keys navigieren, Enter wählt aus
    // - Hover-Highlight auf Items
    // - Selected State"

    const dropdown = M('Box', {
      named: 'CountryDropdown',
      state: 'closed',
      w: 250,
      'onkeydown escape': 'close',
      'onkeydown arrow-down': 'highlight next',
      'onkeydown arrow-up': 'highlight prev',
      'onkeydown enter': ['select highlighted', 'close']
    }, [

      // Trigger Button
      M('Box', {
        hor: true,
        spread: true,
        pad: 12,
        bg: '#1a1a23',
        rad: 8,
        cursor: 'pointer',
        onclick: 'toggle',
        states: {
          hover: { bg: '#222' },
          focus: { 'border-color': '#3B82F6' }
        }
      }, [
        M('Box', { hor: true, gap: 8 }, [
          M('Icon', 'globe', { is: 18, col: '#888' }),
          M('Text', 'Select Country', { col: 'white' })
        ]),
        M('Icon', 'chevron-down', { is: 18, col: '#888' })
      ]),

      // Dropdown Menu
      M('Box', {
        hidden: true,
        'visible-when': 'open',
        bg: '#1a1a23',
        rad: 8,
        margin: [4, 0, 0, 0],
        shadow: 'lg',
        clip: true
      }, [
        // Search Input
        M('Box', { pad: 8, 'border-color': '#333' }, [
          M('Box', { hor: true, gap: 8, bg: '#0a0a0f', pad: 8, rad: 6 }, [
            M('Icon', 'search', { is: 16, col: '#666' }),
            M('Input', {
              placeholder: 'Search countries...',
              bg: 'transparent',
              col: 'white',
              'font-size': 14
            })
          ])
        ]),

        // Options List
        M('Box', { maxh: 200, scroll: true, pad: 4 }, [
          // Option 1
          M('Box', {
            hor: true,
            gap: 12,
            pad: 10,
            rad: 6,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: {
              highlighted: { bg: '#333' },
              selected: { bg: '#3B82F620' }
            }
          }, [
            M('Text', '🇺🇸', { 'font-size': 18 }),
            M('Box', { gap: 2 }, [
              M('Text', 'United States', { col: 'white' }),
              M('Text', 'North America', { col: '#666', 'font-size': 12 })
            ])
          ]),

          // Option 2
          M('Box', {
            hor: true,
            gap: 12,
            pad: 10,
            rad: 6,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: {
              highlighted: { bg: '#333' },
              selected: { bg: '#3B82F620' }
            }
          }, [
            M('Text', '🇬🇧', { 'font-size': 18 }),
            M('Box', { gap: 2 }, [
              M('Text', 'United Kingdom', { col: 'white' }),
              M('Text', 'Europe', { col: '#666', 'font-size': 12 })
            ])
          ]),

          // Option 3
          M('Box', {
            hor: true,
            gap: 12,
            pad: 10,
            rad: 6,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: {
              highlighted: { bg: '#333' },
              selected: { bg: '#3B82F620' }
            }
          }, [
            M('Text', '🇩🇪', { 'font-size': 18 }),
            M('Box', { gap: 2 }, [
              M('Text', 'Germany', { col: 'white' }),
              M('Text', 'Europe', { col: '#666', 'font-size': 12 })
            ])
          ]),

          // Option 4
          M('Box', {
            hor: true,
            gap: 12,
            pad: 10,
            rad: 6,
            cursor: 'pointer',
            onclick: ['select', 'close'],
            states: {
              highlighted: { bg: '#333' },
              selected: { bg: '#3B82F620' }
            }
          }, [
            M('Text', '🇯🇵', { 'font-size': 18 }),
            M('Box', { gap: 2 }, [
              M('Text', 'Japan', { col: 'white' }),
              M('Text', 'Asia', { col: '#666', 'font-size': 12 })
            ])
          ])
        ])
      ])
    ])

    const mirror = M.toMirror(dropdown)
    console.log('\n=== DROPDOWN ===\n' + mirror + '\n')

    // Validierungen
    expect(mirror).toContain('named CountryDropdown')
    expect(mirror).toContain('state closed')
    expect(mirror).toContain('onkeydown escape: close')
    expect(mirror).toContain('onkeydown arrow-down: highlight next')
    expect(mirror).toContain('onkeydown enter: select highlighted, close')
    expect(mirror).toContain('onclick toggle')
    expect(mirror).toContain('onclick select, close')
    expect(mirror).toContain('state highlighted bg #333')
    expect(mirror).toContain('state selected bg #3B82F620')

    assertValidMirror(mirror)
  })

  // ============================================================
  // SCENARIO 3: Modal Dialog
  // ============================================================
  test('Modal Dialog with Form', () => {

    // LLM Prompt: "Baue einen Modal-Dialog mit:
    // - Overlay-Hintergrund
    // - Zentrierter Dialog-Box
    // - Header mit Close-Button
    // - Formular mit Inputs
    // - Footer mit Cancel/Submit Buttons
    // - Escape schließt Modal"

    const modal = M('Box', {
      named: 'EditUserModal',
      state: 'closed',
      hidden: true,
      'visible-when': 'open',
      'onkeydown escape': 'close',
      // Full screen overlay
      w: 'full',
      h: 'full',
      center: true,
      bg: 'rgba(0,0,0,0.7)',
      z: 100
    }, [
      // Dialog Box
      M('Box', {
        w: 480,
        bg: '#1a1a23',
        rad: 12,
        shadow: 'lg',
        clip: true
      }, [
        // Header
        M('Box', {
          hor: true,
          spread: true,
          pad: 16,
          'border-color': '#333'
        }, [
          M('Text', 'Edit User', { weight: 'bold', 'font-size': 18, col: 'white' }),
          M('Box', {
            w: 32,
            h: 32,
            rad: 8,
            center: true,
            cursor: 'pointer',
            onclick: 'close',
            states: { hover: { bg: '#333' } }
          }, [
            M('Icon', 'x', { is: 18, col: '#888' })
          ])
        ]),

        // Form Body
        M('Box', { pad: 16, gap: 16 }, [
          // Name Field
          M('Box', { gap: 6 }, [
            M('Text', 'Full Name', { col: '#888', 'font-size': 14 }),
            M('Input', {
              placeholder: 'Enter full name',
              value: 'John Doe',
              pad: 12,
              bg: '#0a0a0f',
              col: 'white',
              rad: 8,
              states: {
                focus: { 'border-color': '#3B82F6' }
              }
            })
          ]),

          // Email Field
          M('Box', { gap: 6 }, [
            M('Text', 'Email Address', { col: '#888', 'font-size': 14 }),
            M('Input', {
              placeholder: 'Enter email',
              value: 'john@example.com',
              pad: 12,
              bg: '#0a0a0f',
              col: 'white',
              rad: 8,
              states: {
                focus: { 'border-color': '#3B82F6' },
                invalid: { 'border-color': '#EF4444' }
              }
            })
          ]),

          // Role Dropdown
          M('Box', { gap: 6 }, [
            M('Text', 'Role', { col: '#888', 'font-size': 14 }),
            M('Box', {
              hor: true,
              spread: true,
              pad: 12,
              bg: '#0a0a0f',
              rad: 8,
              cursor: 'pointer'
            }, [
              M('Text', 'Administrator', { col: 'white' }),
              M('Icon', 'chevron-down', { is: 16, col: '#888' })
            ])
          ])
        ]),

        // Footer
        M('Box', {
          hor: true,
          spread: true,
          pad: 16,
          bg: '#0a0a0f'
        }, [
          M('Button', 'Cancel', {
            pad: [10, 20],
            bg: 'transparent',
            col: '#888',
            rad: 8,
            cursor: 'pointer',
            onclick: 'close',
            states: { hover: { bg: '#333', col: 'white' } }
          }),
          M('Button', 'Save Changes', {
            pad: [10, 20],
            bg: '#3B82F6',
            col: 'white',
            rad: 8,
            cursor: 'pointer',
            onclick: 'call saveUser',
            states: { hover: { bg: '#2563EB' } }
          })
        ])
      ])
    ])

    const mirror = M.toMirror(modal)
    console.log('\n=== MODAL ===\n' + mirror + '\n')

    expect(mirror).toContain('named EditUserModal')
    expect(mirror).toContain('state closed')
    expect(mirror).toContain('onkeydown escape: close')
    expect(mirror).toContain('Text "Edit User"')
    expect(mirror).toContain('onclick close')
    expect(mirror).toContain('onclick call saveUser')
    expect(mirror).toContain('state hover')
    expect(mirror).toContain('state focus border-color #3B82F6')
    expect(mirror).toContain('state invalid border-color #EF4444')

    assertValidMirror(mirror)
  })

  // ============================================================
  // SCENARIO 4: Tabs Component
  // ============================================================
  test('Tabs with Content Panels', () => {

    // LLM Prompt: "Baue Tabs mit:
    // - Tab-Leiste mit aktiver Anzeige
    // - Content-Panels die wechseln
    // - Keyboard-Navigation"

    const tabs = M('Box', {
      named: 'SettingsTabs',
      gap: 16
    }, [
      // Tab List
      M('Box', {
        hor: true,
        gap: 4,
        pad: 4,
        bg: '#1a1a23',
        rad: 10,
        'onkeydown arrow-left': 'activate prev',
        'onkeydown arrow-right': 'activate next'
      }, [
        M('Box', {
          named: 'ProfileTab',
          pad: [8, 16],
          rad: 8,
          cursor: 'pointer',
          onclick: ['activate', 'deactivate-siblings', 'show ProfilePanel', 'hide AccountPanel', 'hide SecurityPanel'],
          states: {
            active: { bg: '#3B82F6', col: 'white' },
            inactive: { bg: 'transparent', col: '#888' }
          }
        }, [
          M('Text', 'Profile')
        ]),

        M('Box', {
          named: 'AccountTab',
          pad: [8, 16],
          rad: 8,
          cursor: 'pointer',
          onclick: ['activate', 'deactivate-siblings', 'show AccountPanel', 'hide ProfilePanel', 'hide SecurityPanel'],
          states: {
            active: { bg: '#3B82F6', col: 'white' },
            inactive: { bg: 'transparent', col: '#888' }
          }
        }, [
          M('Text', 'Account')
        ]),

        M('Box', {
          named: 'SecurityTab',
          pad: [8, 16],
          rad: 8,
          cursor: 'pointer',
          onclick: ['activate', 'deactivate-siblings', 'show SecurityPanel', 'hide ProfilePanel', 'hide AccountPanel'],
          states: {
            active: { bg: '#3B82F6', col: 'white' },
            inactive: { bg: 'transparent', col: '#888' }
          }
        }, [
          M('Text', 'Security')
        ])
      ]),

      // Tab Panels
      M('Box', [
        // Profile Panel (visible by default)
        M('Box', {
          named: 'ProfilePanel',
          bg: '#1a1a23',
          pad: 20,
          rad: 12,
          gap: 16
        }, [
          M('Text', 'Profile Settings', { weight: 'bold', 'font-size': 18, col: 'white' }),
          M('Text', 'Manage your public profile information.', { col: '#888' }),
          M('Box', { gap: 8 }, [
            M('Text', 'Display Name', { col: '#888', 'font-size': 14 }),
            M('Input', { placeholder: 'Your name', pad: 12, bg: '#0a0a0f', col: 'white', rad: 8 })
          ])
        ]),

        // Account Panel (hidden)
        M('Box', {
          named: 'AccountPanel',
          hidden: true,
          bg: '#1a1a23',
          pad: 20,
          rad: 12,
          gap: 16
        }, [
          M('Text', 'Account Settings', { weight: 'bold', 'font-size': 18, col: 'white' }),
          M('Text', 'Manage your account preferences.', { col: '#888' })
        ]),

        // Security Panel (hidden)
        M('Box', {
          named: 'SecurityPanel',
          hidden: true,
          bg: '#1a1a23',
          pad: 20,
          rad: 12,
          gap: 16
        }, [
          M('Text', 'Security Settings', { weight: 'bold', 'font-size': 18, col: 'white' }),
          M('Text', 'Manage your security options.', { col: '#888' })
        ])
      ])
    ])

    const mirror = M.toMirror(tabs)
    console.log('\n=== TABS ===\n' + mirror + '\n')

    expect(mirror).toContain('named SettingsTabs')
    expect(mirror).toContain('named ProfileTab')
    expect(mirror).toContain('named ProfilePanel')
    expect(mirror).toContain('onclick activate, deactivate-siblings')
    expect(mirror).toContain('state active bg #3B82F6')

    assertValidMirror(mirror)
  })

})
