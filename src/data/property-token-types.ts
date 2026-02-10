/**
 * Property to token type mapping.
 * Defines which token types are valid for each DSL property.
 */

import type { TokenValueType } from '../types/token-types'

/**
 * Maps property names to the token types they accept.
 * Properties not listed accept any token type.
 */
export const PROPERTY_TOKEN_TYPES: Record<string, TokenValueType[]> = {
  // Color properties
  bg: ['color'],
  col: ['color'],
  boc: ['color'],  // border color

  // Spacing properties
  pad: ['spacing'],
  mar: ['spacing'],
  gap: ['spacing'],

  // Size properties
  w: ['spacing', 'size'],
  h: ['spacing', 'size'],
  minw: ['spacing', 'size'],
  minh: ['spacing', 'size'],
  maxw: ['spacing', 'size'],
  maxh: ['spacing', 'size'],

  // Border properties
  bor: ['border', 'spacing', 'color'],
  bow: ['spacing'],  // border width
  rad: ['radius', 'spacing'],

  // Typography properties
  font: ['font'],
  fs: ['size', 'spacing'],     // font size
  fw: ['weight'],              // font weight
  lh: ['size', 'spacing'],     // line height
  ls: ['spacing'],             // letter spacing

  // Shadow
  shadow: ['shadow'],
  bs: ['shadow'],  // box shadow

  // Opacity
  op: ['opacity'],
  opacity: ['opacity'],
}

/**
 * Get the accepted token types for a property.
 * Returns null if the property accepts any token type.
 */
export function getAcceptedTokenTypes(property: string): TokenValueType[] | null {
  return PROPERTY_TOKEN_TYPES[property] || null
}

/**
 * Check if a token type is valid for a given property.
 */
export function isTokenTypeValidForProperty(
  property: string,
  tokenType: TokenValueType
): boolean {
  const acceptedTypes = PROPERTY_TOKEN_TYPES[property]
  if (!acceptedTypes) {
    return true // Property accepts any type
  }
  return acceptedTypes.includes(tokenType)
}
