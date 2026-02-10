/**
 * Error Boundary Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child content')).toBeDefined()
  })

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeDefined()
    expect(screen.getByText('Test error message')).toBeDefined()
  })

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error fallback')).toBeDefined()
  })

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('Test error message')
  })

  it('should have retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText('Erneut versuchen')
    expect(retryButton).toBeDefined()
    expect(retryButton.tagName).toBe('BUTTON')
  })
})
