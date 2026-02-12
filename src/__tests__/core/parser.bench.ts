/**
 * Parser Performance Benchmarks
 *
 * Run with: npm run bench
 * (requires adding "bench": "vitest bench" to package.json scripts)
 */

import { describe, bench } from 'vitest'
import { parse } from '../../parser/parser'
import { tokenize } from '../../parser/lexer'

// Generate DSL of various sizes
function generateDSL(componentCount: number): string {
  const lines: string[] = []

  // Token definitions
  lines.push('$primary: #3B82F6')
  lines.push('$secondary: #6B7280')
  lines.push('$spacing: 16')
  lines.push('$radius: 8')
  lines.push('')

  // Component definitions
  lines.push('Card: pad 24 rad 8 col #1F2937')
  lines.push('  Title: size 18 weight bold')
  lines.push('  Body: size 14')
  lines.push('')

  // Generate component instances
  for (let i = 0; i < componentCount; i++) {
    lines.push(`Box pad 16 gap 8 hor`)
    lines.push(`  Text "Item ${i}" size 14`)
    lines.push(`  Button "Action" $primary-col pad 8 rad 4`)
    lines.push('')
  }

  return lines.join('\n')
}

// Generate deeply nested DSL
function generateNestedDSL(depth: number): string {
  const lines: string[] = []

  for (let i = 0; i < depth; i++) {
    const indent = '  '.repeat(i)
    lines.push(`${indent}Box pad ${i * 2}`)
  }
  lines.push(`${'  '.repeat(depth)}Text "Deep"`)

  return lines.join('\n')
}

// Generate DSL with many tokens
function generateTokenHeavyDSL(tokenCount: number): string {
  const lines: string[] = []

  // Generate token definitions
  for (let i = 0; i < tokenCount; i++) {
    lines.push(`$token${i}: ${i}`)
  }
  lines.push('')

  // Use the tokens
  lines.push('Box')
  for (let i = 0; i < Math.min(tokenCount, 100); i++) {
    lines.push(`  Text pad $token${i}`)
  }

  return lines.join('\n')
}

describe('Lexer Performance', () => {
  const smallDSL = generateDSL(10)      // ~50 lines
  const mediumDSL = generateDSL(100)    // ~500 lines
  const largeDSL = generateDSL(500)     // ~2500 lines

  bench('tokenize small DSL (~50 lines)', () => {
    tokenize(smallDSL)
  })

  bench('tokenize medium DSL (~500 lines)', () => {
    tokenize(mediumDSL)
  })

  bench('tokenize large DSL (~2500 lines)', () => {
    tokenize(largeDSL)
  })
})

describe('Parser Performance', () => {
  const smallDSL = generateDSL(10)
  const mediumDSL = generateDSL(100)
  const largeDSL = generateDSL(500)

  bench('parse small DSL (~50 lines)', () => {
    parse(smallDSL)
  })

  bench('parse medium DSL (~500 lines)', () => {
    parse(mediumDSL)
  })

  bench('parse large DSL (~2500 lines)', () => {
    parse(largeDSL)
  })
})

describe('Deep Nesting Performance', () => {
  const shallow = generateNestedDSL(10)
  const medium = generateNestedDSL(50)
  const deep = generateNestedDSL(100)

  bench('parse 10 levels deep', () => {
    parse(shallow)
  })

  bench('parse 50 levels deep', () => {
    parse(medium)
  })

  bench('parse 100 levels deep', () => {
    parse(deep)
  })
})

describe('Token Resolution Performance', () => {
  const fewTokens = generateTokenHeavyDSL(10)
  const manyTokens = generateTokenHeavyDSL(100)
  const lotsOfTokens = generateTokenHeavyDSL(500)

  bench('parse with 10 token definitions', () => {
    parse(fewTokens)
  })

  bench('parse with 100 token definitions', () => {
    parse(manyTokens)
  })

  bench('parse with 500 token definitions', () => {
    parse(lotsOfTokens)
  })
})

// Size info for reference
describe('DSL Size Reference', () => {
  const small = generateDSL(10)
  const medium = generateDSL(100)
  const large = generateDSL(500)

  console.log(`Small DSL:  ${small.length} chars, ${small.split('\n').length} lines`)
  console.log(`Medium DSL: ${medium.length} chars, ${medium.split('\n').length} lines`)
  console.log(`Large DSL:  ${large.length} chars, ${large.split('\n').length} lines`)

  bench('reference - empty', () => {
    // Baseline for benchmark overhead
  })
})
