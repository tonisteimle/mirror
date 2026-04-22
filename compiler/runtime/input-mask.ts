/**
 * Input Mask - Pattern-based input formatting
 *
 * Pattern characters:
 * - # = digit (0-9)
 * - A = letter (a-z, A-Z)
 * - * = alphanumeric (a-z, A-Z, 0-9)
 * - All others = literal (inserted automatically)
 *
 * Examples:
 * - "###.####.####.##" → AHV: 756.1234.5678.90
 * - "##'###.##" → Currency: 12'345.67
 * - "(###) ###-####" → Phone: (079) 123-4567
 * - "####-##-##" → Date: 2024-01-15
 */

type MaskCharType = 'digit' | 'letter' | 'alphanum' | 'literal'

interface MaskChar {
  type: MaskCharType
  char: string
}

function parseMask(pattern: string): MaskChar[] {
  return pattern.split('').map(c => {
    if (c === '#') return { type: 'digit' as const, char: c }
    if (c === 'A') return { type: 'letter' as const, char: c }
    if (c === '*') return { type: 'alphanum' as const, char: c }
    return { type: 'literal' as const, char: c }
  })
}

function isValid(char: string, type: MaskCharType): boolean {
  if (type === 'digit') return /\d/.test(char)
  if (type === 'letter') return /[a-zA-Z]/.test(char)
  if (type === 'alphanum') return /[a-zA-Z0-9]/.test(char)
  return false
}

/**
 * Format a raw value with a mask pattern
 */
export function formatWithMask(value: string, pattern: string): string {
  const mask = parseMask(pattern)
  const raw = value.replace(/[^a-zA-Z0-9]/g, '').split('')
  let result = ''
  let ri = 0

  for (const m of mask) {
    if (ri >= raw.length) break
    if (m.type === 'literal') {
      result += m.char
    } else {
      while (ri < raw.length && !isValid(raw[ri], m.type)) ri++
      if (ri < raw.length) result += raw[ri++]
    }
  }
  return result
}

/**
 * Extract raw value from a masked string (all alphanumeric chars)
 */
export function getRawValue(masked: string, pattern: string): string {
  // Simply extract all alphanumeric characters, regardless of formatting
  return masked.replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * Adjust cursor position after formatting
 */
function adjustCursor(oldVal: string, newVal: string, oldPos: number, pattern: string): number {
  const mask = parseMask(pattern)
  // Count input chars before cursor
  let inputChars = 0
  for (let i = 0; i < oldPos && i < mask.length; i++) {
    if (mask[i].type !== 'literal') inputChars++
  }
  // Find same position in new value
  let newPos = 0
  let counted = 0
  for (let i = 0; i < newVal.length && i < mask.length; i++) {
    newPos = i + 1
    if (mask[i].type !== 'literal') {
      counted++
      if (counted >= inputChars) break
    }
  }
  // Skip trailing literals
  while (newPos < mask.length && mask[newPos]?.type === 'literal') newPos++
  return Math.min(newPos, newVal.length)
}

/**
 * Apply mask to an input element
 */
export function applyMask(input: HTMLInputElement, pattern: string): void {
  // Store pattern for later retrieval
  ;(input as any)._maskPattern = pattern

  // Format initial value if present
  if (input.value) {
    input.value = formatWithMask(input.value, pattern)
  }

  // Handle input events
  input.addEventListener('input', () => {
    const pos = input.selectionStart ?? 0
    const old = input.value
    const raw = getRawValue(old, pattern)
    const formatted = formatWithMask(raw, pattern)

    if (formatted !== old) {
      input.value = formatted
      const newPos = adjustCursor(old, formatted, pos, pattern)
      input.setSelectionRange(newPos, newPos)
    }
  })

  // Validate keypress
  input.addEventListener('keypress', e => {
    if (e.ctrlKey || e.metaKey || e.key.length > 1) return
    const pos = input.selectionStart ?? 0
    const mask = parseMask(pattern)

    // Find next input position
    let maskIdx = 0
    for (let i = 0; i < pos && maskIdx < mask.length; i++) {
      maskIdx++
    }
    while (maskIdx < mask.length && mask[maskIdx].type === 'literal') maskIdx++

    if (maskIdx >= mask.length || !isValid(e.key, mask[maskIdx].type)) {
      e.preventDefault()
    }
  })

  // Handle paste
  input.addEventListener('paste', e => {
    e.preventDefault()
    const data = e.clipboardData?.getData('text') ?? ''
    input.value = formatWithMask(data, pattern)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/**
 * Get raw value from a masked input
 */
export function getMaskRawValue(input: HTMLInputElement): string {
  const pattern = (input as any)._maskPattern
  return pattern ? getRawValue(input.value, pattern) : input.value
}
