/**
 * Debug: Was produzieren die 9-Zone Alignments wirklich?
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('9-Zone Debug', () => {

  function logStyles(name: string, code: string) {
    const ir = toIR(parse(code))
    const styles = ir.nodes[0].styles
    const relevant = styles.filter((s: any) =>
      ['flex-direction', 'justify-content', 'align-items', 'display'].includes(s.property)
    )
    console.log(`${name}:`, relevant.map((s: any) => `${s.property}: ${s.value}`).join(', '))
  }

  test('Debug alle 9 Zonen', () => {
    logStyles('top-left', 'Frame top-left')
    logStyles('tc', 'Frame tc')
    logStyles('top-right', 'Frame top-right')
    logStyles('cl', 'Frame cl')
    logStyles('center', 'Frame center')
    logStyles('cr', 'Frame cr')
    logStyles('bl', 'Frame bl')
    logStyles('bc', 'Frame bc')
    logStyles('br', 'Frame br')

    expect(true).toBe(true) // Nur für Output
  })

})
