/**
 * Animation Parser
 *
 * Handles parsing of animation definitions.
 * Extracted from the main parser for better modularity.
 *
 * Syntax:
 * FadeUp as animation:
 *   0.00 opacity 0, y-offset 20
 *   0.30 all opacity 0.5
 *   1.00 all opacity 1, y-offset 0
 */

import type { Token, TokenType } from './lexer'
import type { AnimationDefinition, AnimationKeyframe, AnimationKeyframeProperty } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'

// Shorthand alias
const U = ParserUtils

/**
 * Local fallbacks for API methods that animation-parser was written against
 * but that don't exist on `ParserUtils`. Without these, even a syntactically
 * valid `Foo as animation:` block would crash with `U.expect is not a function`.
 *
 * `expect` consumes the token if it matches the expected type, otherwise
 * reports an error and returns false.
 * `addError` is a thin alias around `reportError` for legacy call sites.
 */
function expect(ctx: ParserContext, type: TokenType): boolean {
  if (U.check(ctx, type)) {
    U.advance(ctx)
    return true
  }
  U.reportError(ctx, `Expected ${type}`)
  return false
}
function addError(ctx: ParserContext, msg: string): void {
  U.reportError(ctx, msg)
}

/**
 * Parse an animation definition
 *
 * Called when we see: Name as animation:
 * The 'as' and 'animation' tokens should already be consumed.
 */
export function parseAnimationDefinition(
  ctx: ParserContext,
  nameToken: Token
): AnimationDefinition | null {
  U.advance(ctx) // consume 'as'
  U.advance(ctx) // consume 'animation'

  if (!expect(ctx, 'COLON')) {
    const lastError = ctx.errors[ctx.errors.length - 1]
    if (lastError) lastError.hint = 'Add a colon after "animation"'
    recoverToNextDefinition(ctx)
    return null
  }

  const animation: AnimationDefinition = {
    type: 'Animation',
    name: nameToken.value,
    keyframes: [],
    line: nameToken.line,
    column: nameToken.column,
  }

  // Parse optional easing on the same line: FadeUp as animation: ease-out
  if (U.check(ctx, 'IDENTIFIER') && !U.check(ctx, 'NEWLINE')) {
    animation.easing = U.advance(ctx).value
  }

  // Skip to indented block
  U.skipNewlines(ctx)

  if (!U.check(ctx, 'INDENT')) {
    addError(ctx, 'Animation definition must have an indented body with keyframes')
    return animation
  }

  U.advance(ctx) // consume INDENT

  // Parse animation body
  while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Skip commas
    if (U.check(ctx, 'COMMA') || U.check(ctx, 'SEMICOLON')) {
      U.advance(ctx)
      continue
    }

    // Parse roles: item1, item2, item3
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'roles') {
      U.advance(ctx) // consume 'roles'
      animation.roles = []
      while (!U.check(ctx, 'NEWLINE') && !U.isAtEnd(ctx)) {
        if (U.check(ctx, 'COMMA')) {
          U.advance(ctx)
          continue
        }
        if (U.check(ctx, 'IDENTIFIER')) {
          animation.roles.push(U.advance(ctx).value)
        } else {
          break
        }
      }
      continue
    }

    // Parse keyframe: 0.00 property value, property value
    // Keyframes start with a number (time)
    if (U.check(ctx, 'NUMBER')) {
      const keyframe = parseAnimationKeyframe(ctx)
      if (keyframe) {
        animation.keyframes.push(keyframe)
      }
      continue
    }

    // Skip unknown tokens
    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)

  // Calculate duration from last keyframe (if time is > 1.0, treat as ms)
  if (animation.keyframes.length > 0) {
    const lastKeyframe = animation.keyframes[animation.keyframes.length - 1]
    if (lastKeyframe.time > 1.0) {
      // Time is in milliseconds
      animation.duration = lastKeyframe.time
    }
  }

  return animation
}

/**
 * Parse a single keyframe line
 *
 * Syntax:
 * 0.00 opacity 0, y-offset 20
 * 0.30 item1 opacity 1
 * 1.00 all opacity 1, y-offset 0
 */
function parseAnimationKeyframe(ctx: ParserContext): AnimationKeyframe | null {
  if (U.isAtEnd(ctx)) {
    return null
  }

  // Time value (e.g., 0.00, 0.30, 1.00, or 300 for ms)
  const timeToken = U.advance(ctx)
  const time = parseFloat(timeToken.value)

  const keyframe: AnimationKeyframe = {
    time,
    properties: [],
  }

  // Parse properties on this line with loop guard
  let lastPos = ctx.pos
  const maxIterations = 100 // Reasonable limit for keyframe properties

  for (
    let i = 0;
    i < maxIterations && !U.check(ctx, 'NEWLINE') && !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx);
    i++
  ) {
    if (U.check(ctx, 'COMMA') || U.check(ctx, 'SEMICOLON')) {
      U.advance(ctx)
      continue
    }

    if (U.check(ctx, 'IDENTIFIER')) {
      const prop = parseAnimationKeyframeProperty(ctx)
      if (prop) {
        keyframe.properties.push(prop)
      }
    } else {
      break
    }

    // Verify progress to prevent infinite loop
    if (ctx.pos === lastPos) {
      break
    }
    lastPos = ctx.pos
  }

  return keyframe
}

/**
 * Parse a keyframe property
 *
 * Syntax:
 * opacity 0
 * y-offset 20
 * item1 opacity 0  (with role target)
 * all scale 1.2    (with 'all' target)
 */
function parseAnimationKeyframeProperty(ctx: ParserContext): AnimationKeyframeProperty | null {
  if (!U.check(ctx, 'IDENTIFIER')) return null

  const firstToken = U.advance(ctx)
  let target: string | undefined
  let propName: string
  let propValue: string | number

  // Check if this is a role target followed by property name
  // e.g., "item1 opacity 0" or "all scale 1.2"
  if (U.check(ctx, 'IDENTIFIER')) {
    // First token is the target, second is the property name
    target = firstToken.value
    propName = U.advance(ctx).value

    // Get value
    if (U.check(ctx, 'NUMBER')) {
      propValue = parseFloat(U.advance(ctx).value)
    } else if (U.check(ctx, 'STRING')) {
      propValue = U.advance(ctx).value
    } else if (U.check(ctx, 'IDENTIFIER')) {
      propValue = U.advance(ctx).value
    } else {
      return null
    }
  } else if (U.check(ctx, 'NUMBER') || U.check(ctx, 'STRING')) {
    // First token is the property name, directly followed by value
    propName = firstToken.value

    if (U.check(ctx, 'NUMBER')) {
      propValue = parseFloat(U.advance(ctx).value)
    } else {
      propValue = U.advance(ctx).value
    }
  } else {
    // No value found
    return null
  }

  return {
    target,
    name: propName,
    value: propValue,
  }
}

/**
 * Recover to the next definition after an error
 */
function recoverToNextDefinition(ctx: ParserContext): void {
  // Skip until we find a line at base indentation level
  while (!U.isAtEnd(ctx)) {
    if (U.check(ctx, 'NEWLINE')) {
      U.advance(ctx)
      // Check if next token is at column 1 (not indented)
      if (!U.isAtEnd(ctx) && (U.check(ctx, 'IDENTIFIER') || U.check(ctx, 'DEDENT'))) {
        break
      }
    } else {
      U.advance(ctx)
    }
  }
}
