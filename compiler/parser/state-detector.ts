/**
 * State Block Detector
 *
 * Pure read-only lookahead that decides whether the current token sequence
 * starts a Mirror state block (vs. an event, slot, child override, or
 * ordinary property).
 *
 * Recognises:
 *   - Simple state colon: `selected:`, `hover:`, `open:`
 *   - Inline duration: `hover 0.2s:`, `hover 0.3s ease-out:`
 *   - External state ref: `MenuBtn.open:`
 *   - Modifier prefix: `exclusive selected:`, `toggle on:`
 *   - When-clause: `visible when Menu open:`, `visible when A open and B closed:`
 *   - Trigger event: `selected onclick:`, `selected onkeydown enter:`
 *   - Trigger + animation: `selected onclick 0.2s ease-out:`
 *
 * Extracted from parser.ts (Phase 5 — second incremental cut). Pure function:
 * does not mutate ctx.pos, ctx.errors, or anything else.
 */

import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { MAX_CONDITION_DEPTH } from './ops/limits'
import {
  EVENT_NAMES,
  STATE_MODIFIERS,
  EASING_FUNCTIONS,
  KEYBOARD_KEYS,
} from '../schema/parser-helpers'

const U = ParserUtils

/** True if `value` looks like a CSS-style duration (`0.2s`, `200ms`). */
function isDurationValue(value: string): boolean {
  return value.endsWith('s') || value.endsWith('ms')
}

/** State names are lowercase identifiers (slots are uppercase). */
function looksLikeStateName(name: string): boolean {
  return name.length > 0 && name[0] === name[0].toLowerCase()
}

/**
 * Decide whether `ctx.pos` points to the start of a state block.
 * Pure: does not advance ctx.pos.
 */
export function isStateBlockStart(ctx: ParserContext): boolean {
  let offset = 1

  const token1 = U.peekAt(ctx, offset)
  const currentName = U.current(ctx)?.value || ''

  // Direct colon: `selected:`, `hover:`. Reject if it's an event or slot.
  if (token1?.type === 'COLON') {
    if (EVENT_NAMES.has(currentName)) return false
    return looksLikeStateName(currentName)
  }

  // Duration directly after state name: `hover 0.2s:`, `hover 0.3s ease-out:`.
  if (token1?.type === 'NUMBER' && isDurationValue(token1.value)) {
    let durationOffset = 2
    const easingToken = U.peekAt(ctx, durationOffset)
    if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
      durationOffset++
    }
    const colonToken = U.peekAt(ctx, durationOffset)
    if (colonToken?.type === 'COLON') {
      return looksLikeStateName(currentName) && !EVENT_NAMES.has(currentName)
    }
  }

  // External state reference: `ElementName.state:` (e.g. `MenuBtn.open:`).
  if (token1?.type === 'DOT') {
    const token2 = U.peekAt(ctx, 2)
    const token3 = U.peekAt(ctx, 3)
    if (token2?.type === 'IDENTIFIER' && token3?.type === 'COLON') {
      return true
    }
  }

  // Optional modifier prefix: `exclusive`, `toggle`, `initial`.
  if (token1?.type === 'IDENTIFIER' && STATE_MODIFIERS.has(token1.value)) {
    offset++
  }

  // When-clause: `visible when Element state [and/or Element state]* :`.
  const tokenWhen = U.peekAt(ctx, offset)
  if (tokenWhen?.type === 'IDENTIFIER' && tokenWhen.value === 'when') {
    offset++ // skip 'when'

    const targetToken = U.peekAt(ctx, offset)
    if (targetToken?.type !== 'IDENTIFIER') return false
    offset++

    const stateToken = U.peekAt(ctx, offset)
    if (stateToken?.type !== 'IDENTIFIER') return false
    offset++

    // Walk additional `and`/`or` conditions.
    let depth = 0
    while (depth++ < MAX_CONDITION_DEPTH) {
      const t = U.peekAt(ctx, offset)
      if (t?.type === 'COLON') return true
      if (t?.type === 'AND' || t?.type === 'OR') {
        offset += 3 // skip and/or + Element + state
      } else {
        break
      }
    }

    // Optional animation duration after the when clause.
    const tokenAfterWhen = U.peekAt(ctx, offset)
    if (tokenAfterWhen?.type === 'NUMBER' && isDurationValue(tokenAfterWhen.value)) {
      offset++
      const easingToken = U.peekAt(ctx, offset)
      if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
        offset++
      }
    }

    return U.peekAt(ctx, offset)?.type === 'COLON'
  }

  // Trigger event: `selected onclick:`, `selected onkeydown enter:`.
  const tokenAfterModifier = U.peekAt(ctx, offset)
  if (tokenAfterModifier?.type === 'COLON') return true

  if (tokenAfterModifier?.type === 'IDENTIFIER' && EVENT_NAMES.has(tokenAfterModifier.value)) {
    offset++
    // Keyboard events optionally take a key name.
    if (tokenAfterModifier.value === 'onkeydown' || tokenAfterModifier.value === 'onkeyup') {
      const keyToken = U.peekAt(ctx, offset)
      if (keyToken?.type === 'IDENTIFIER' && KEYBOARD_KEYS.has(keyToken.value)) {
        offset++
      }
    }
  }

  // Optional animation config after trigger: `selected onclick 0.2s ease-out:`.
  const tokenAfterTrigger = U.peekAt(ctx, offset)
  if (tokenAfterTrigger?.type === 'NUMBER' && isDurationValue(tokenAfterTrigger.value)) {
    offset++
    const easingToken = U.peekAt(ctx, offset)
    if (easingToken?.type === 'IDENTIFIER' && EASING_FUNCTIONS.has(easingToken.value)) {
      offset++
    }
  }

  return U.peekAt(ctx, offset)?.type === 'COLON'
}
