/**
 * Image Resolver Utility
 *
 * Resolves image sources with the following priority:
 * 1. Full URLs (http://, https://, data:) - use as-is (validated)
 * 2. localStorage (for dropped images from drag-and-drop)
 * 3. /media/ path (default fallback)
 */

// Allowed protocols for image sources (security)
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:']

// Placeholder for invalid URLs
const INVALID_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%23666" font-size="12"%3EInvalid URL%3C/text%3E%3C/svg%3E'

/**
 * Validate if a URL is safe for use as an image source.
 * Prevents javascript:, file:, and other potentially dangerous protocols.
 */
export function isValidImageUrl(url: string): boolean {
  // Empty or whitespace-only
  if (!url || !url.trim()) {
    return false
  }

  // Relative paths are always allowed
  if (url.startsWith('/') || !url.includes(':')) {
    return true
  }

  // Data URLs - validate they're actually image data
  if (url.startsWith('data:')) {
    return url.startsWith('data:image/')
  }

  // Blob URLs are allowed (from file drops)
  if (url.startsWith('blob:')) {
    return true
  }

  // Parse and validate URL
  try {
    const parsed = new URL(url)
    return ALLOWED_PROTOCOLS.includes(parsed.protocol)
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Resolve image source - check localStorage first, then /media/, then use as-is for URLs.
 * Invalid URLs are replaced with a placeholder for security.
 */
export function resolveImageSrc(src: string): string {
  // Validate the URL first
  if (!isValidImageUrl(src)) {
    console.warn(`[Image] Invalid or unsafe URL blocked: ${src.substring(0, 50)}...`)
    return INVALID_IMAGE_PLACEHOLDER
  }

  // Already a full URL or data URL
  if (src.match(/^(https?:|data:|blob:)/)) {
    return src
  }

  // Check localStorage for dropped images
  const mediaKey = `mirror-media:${src}`
  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(mediaKey) : null
  if (storedUrl && isValidImageUrl(storedUrl)) {
    return storedUrl
  }

  // Fall back to /media/ path
  return `/media/${src}`
}
