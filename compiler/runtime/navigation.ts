/**
 * Browser Navigation Functions
 *
 * History navigation and URL opening with security.
 */

// Allowed URL protocols for security
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Go back in browser history
 */
export function back(): void {
  window.history.back()
}

/**
 * Go forward in browser history
 */
export function forward(): void {
  window.history.forward()
}

/**
 * Check if URL has an allowed protocol
 */
function isAllowedProtocol(url: URL): boolean {
  return ALLOWED_URL_PROTOCOLS.includes(url.protocol)
}

/**
 * Check for dangerous URL protocols
 */
function isDangerousUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return lower.startsWith('javascript:') || lower.startsWith('data:')
}

/**
 * Validate URL for security
 */
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.href)
    if (!isAllowedProtocol(parsedUrl)) {
      console.warn(`[Security] Blocked unsafe URL protocol: ${parsedUrl.protocol}`)
      return false
    }
    return true
  } catch {
    if (isDangerousUrl(url)) {
      console.warn(`[Security] Blocked unsafe URL: ${url.slice(0, 50)}...`)
      return false
    }
    return true
  }
}

/**
 * Open a URL in a new tab or current window
 */
export function openUrl(url: string, options?: { newTab?: boolean }): void {
  const { newTab = true } = options || {}

  if (!validateUrl(url)) return

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}
