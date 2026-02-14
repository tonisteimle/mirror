/**
 * Sanitization utilities for XSS prevention
 */
import { logger } from '../services/logger'

/**
 * Dangerous URL protocols that could execute JavaScript
 */
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:text/html',
  'data:application/xhtml+xml',
]

/**
 * Allowed URL protocols for href attributes
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:', '#']

/**
 * Validate and sanitize a URL for use in href attributes.
 * Blocks dangerous protocols like javascript:, vbscript:, etc.
 *
 * @param url - The URL to validate
 * @returns The sanitized URL or '#' if invalid
 */
export function sanitizeHref(url: string | undefined): string {
  if (!url || typeof url !== 'string') {
    return '#'
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) {
      logger.security.warn(`Blocked dangerous URL: ${url.substring(0, 50)}...`)
      return '#'
    }
  }

  // Allow relative URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('#')) {
    return url
  }

  // Check if protocol is allowed
  try {
    const parsed = new URL(url, 'https://placeholder.local')
    const isAllowed = ALLOWED_PROTOCOLS.some(p => parsed.protocol === p || parsed.href.startsWith(p))
    if (!isAllowed) {
      logger.security.warn(`Blocked URL with unknown protocol: ${parsed.protocol}`)
      return '#'
    }
  } catch {
    // If URL parsing fails, allow relative URLs that look safe
    if (/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/.test(url)) {
      return url
    }
    logger.security.warn(`Blocked malformed URL: ${url.substring(0, 50)}`)
    return '#'
  }

  return url
}

/**
 * Sanitize text content for safe rendering.
 * React's JSX already escapes content, but this provides additional safety
 * for edge cases and clearly documents the intent.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text safe for rendering
 */
export function sanitizeTextContent(text: string | undefined): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Remove null bytes and other dangerous characters
  return text
    .replace(/\0/g, '')  // Null bytes
    .replace(/\u2028/g, '') // Line separator
    .replace(/\u2029/g, '') // Paragraph separator
}

/**
 * Sanitize a placeholder attribute value.
 *
 * @param placeholder - The placeholder text
 * @returns Sanitized placeholder
 */
export function sanitizePlaceholder(placeholder: string | undefined): string {
  if (!placeholder || typeof placeholder !== 'string') {
    return ''
  }

  // Remove newlines and control characters from placeholders
  return placeholder
    .replace(/[\r\n\t]/g, ' ')
    // eslint-disable-next-line no-control-regex -- intentionally removing control characters for sanitization
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
}

/**
 * Validate that a component name is safe.
 * Component names should be valid identifiers.
 *
 * @param name - The component name
 * @returns true if the name is safe
 */
export function isValidComponentName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false
  }

  // Component names must be valid JavaScript identifiers
  return /^[A-Z][a-zA-Z0-9_]*$/.test(name)
}
