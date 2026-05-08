/**
 * Parser test — `from path/to/file` clause on instance.
 *
 * Documented in `examples/task-app/README.md` as
 *   `show DashboardScreen from screens/dashboard`
 * to mark which file the referenced component lives in. Pre-fix the
 * parser silently dropped the clause; post-fix the path is captured
 * on `Instance.from` so tooling (validator, studio) can navigate to
 * the source file.
 *
 * Same shape as `route` — slash-separated path, no quoting.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import type { Instance } from '../../compiler/parser/ast'

describe('parser — `from path/to/file` clause', () => {
  it('captures the path into Instance.from', () => {
    const ast = parse(`Frame name DashboardView
  DashboardScreen from screens/dashboard
`)
    const view = ast.instances[0]
    if (view.type !== 'Instance') throw new Error('expected Frame instance')
    const child = view.children[0]
    expect(child.type).toBe('Instance')
    if (child.type !== 'Instance') return
    expect(child.component).toBe('DashboardScreen')
    expect((child as Instance).from).toBe('screens/dashboard')
  })

  it('handles multi-segment paths', () => {
    const ast = parse(`Page from src/views/admin/dashboard
`)
    const inst = ast.instances[0]
    if (inst.type !== 'Instance') throw new Error('expected Instance')
    expect(inst.from).toBe('src/views/admin/dashboard')
  })

  it('co-exists with other inline clauses', () => {
    const ast = parse(`Screen name Home, navigate(HomeView) from screens/home
`)
    const inst = ast.instances[0]
    if (inst.type !== 'Instance') throw new Error('expected Instance')
    expect(inst.from).toBe('screens/home')
    expect(inst.name).toBe('Home')
  })

  it('does not appear as a property', () => {
    const ast = parse(`MyScreen from screens/x
`)
    const inst = ast.instances[0]
    if (inst.type !== 'Instance') throw new Error('expected Instance')
    // Marker should be lifted to instance.from, not left as a `_from` prop.
    expect(inst.properties.find(p => p.name === '_from')).toBeUndefined()
    expect(inst.properties.find(p => p.name === 'from')).toBeUndefined()
  })

  it('absent `from` leaves Instance.from undefined', () => {
    const ast = parse(`PlainScreen
`)
    const inst = ast.instances[0]
    if (inst.type !== 'Instance') throw new Error('expected Instance')
    expect(inst.from).toBeUndefined()
  })
})
