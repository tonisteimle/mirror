/**
 * Tests for M.each() and M.if()
 */

import { M } from '../mirror-runtime'

describe('M.each() - Data Binding', () => {

  test('Basic each loop', () => {
    const list = M.each('task', 'tasks', [
      M('Box', { pad: 8 }, [
        M('Text', '$task.title')
      ])
    ])

    const mirror = M.toMirror(list)
    console.log('--- Each Loop ---\n' + mirror + '\n')

    expect(mirror).toContain('each task in tasks')
    expect(mirror).toContain('Box pad 8')
    expect(mirror).toContain('Text "$task.title"')
  })

  test('Each with filter', () => {
    const list = M.each('task', 'tasks', [
      M('Box', [M('Text', '$task.title')])
    ], '!task.done')

    const mirror = M.toMirror(list)
    console.log('--- Each with Filter ---\n' + mirror + '\n')

    expect(mirror).toContain('each task in tasks where !task.done')
  })

  test('Complex each template', () => {
    const taskList = M.each('task', 'tasks', [
      M('Box', {
        hor: true,
        spread: true,
        pad: 12,
        bg: '#1a1a23',
        rad: 8,
        cursor: 'pointer',
        onclick: 'select',
        states: { selected: { bg: '#3B82F6' } }
      }, [
        M('Box', { hor: true, gap: 8 }, [
          M.if('task.done',
            [M('Icon', 'check-circle', { col: '#22C55E' })],
            [M('Icon', 'circle', { col: '#888' })]
          ),
          M('Text', '$task.title')
        ]),
        M('Text', '$task.date', { col: '#888', 'font-size': 12 })
      ])
    ])

    const mirror = M.toMirror(taskList)
    console.log('--- Complex Each ---\n' + mirror + '\n')

    expect(mirror).toContain('each task in tasks')
    expect(mirror).toContain('onclick select')
    expect(mirror).toContain('state selected bg #3B82F6')
    expect(mirror).toContain('if task.done')
    expect(mirror).toContain('Icon "check-circle"')
    expect(mirror).toContain('else')
    expect(mirror).toContain('Icon "circle"')
  })

})

describe('M.if() - Conditional Rendering', () => {

  test('Basic if', () => {
    const conditional = M.if('isLoggedIn', [
      M('Text', 'Welcome back!')
    ])

    const mirror = M.toMirror(conditional)
    console.log('--- Basic If ---\n' + mirror + '\n')

    expect(mirror).toContain('if isLoggedIn')
    expect(mirror).toContain('Text "Welcome back!"')
    expect(mirror).not.toContain('else')
  })

  test('If with else', () => {
    const conditional = M.if('isLoggedIn',
      [M('Avatar')],
      [M('Button', 'Login', { bg: '#3B82F6' })]
    )

    const mirror = M.toMirror(conditional)
    console.log('--- If/Else ---\n' + mirror + '\n')

    expect(mirror).toContain('if isLoggedIn')
    expect(mirror).toContain('Avatar')
    expect(mirror).toContain('else')
    expect(mirror).toContain('Button "Login"')
  })

  test('Complex condition', () => {
    const conditional = M.if('user.isAdmin && hasPermission', [
      M('Box', { pad: 16, bg: '#1a1a23' }, [
        M('Text', 'Admin Panel', { weight: 'bold' })
      ])
    ])

    const mirror = M.toMirror(conditional)
    console.log('--- Complex Condition ---\n' + mirror + '\n')

    expect(mirror).toContain('if user.isAdmin && hasPermission')
    expect(mirror).toContain('Text "Admin Panel"')
  })

  test('Nested conditionals', () => {
    const ui = M('Box', [
      M.if('isLoading',
        [M('Text', 'Loading...')],
        [
          M.if('hasError',
            [M('Text', 'Error!', { col: '#EF4444' })],
            [M('Text', 'Data loaded')]
          )
        ]
      )
    ])

    const mirror = M.toMirror(ui)
    console.log('--- Nested Conditionals ---\n' + mirror + '\n')

    expect(mirror).toContain('if isLoading')
    expect(mirror).toContain('if hasError')
    expect(mirror).toContain('Text "Error!"')
    expect(mirror).toContain('Text "Data loaded"')
  })

})

describe('Combined each + if', () => {

  test('Each with conditional items', () => {
    const list = M.each('item', 'items', [
      M.if('item.visible', [
        M('Box', { pad: 8 }, [
          M('Text', '$item.name'),
          M.if('item.isNew', [
            M('Box', { bg: '#3B82F6', pad: [2, 6], rad: 4 }, [
              M('Text', 'NEW', { col: 'white', 'font-size': 10 })
            ])
          ])
        ])
      ])
    ])

    const mirror = M.toMirror(list)
    console.log('--- Each with Conditionals ---\n' + mirror + '\n')

    expect(mirror).toContain('each item in items')
    expect(mirror).toContain('if item.visible')
    expect(mirror).toContain('if item.isNew')
    expect(mirror).toContain('Text "NEW"')
  })

})
