/**
 * Centralized Component Mocks
 *
 * All component mocks in one place to avoid duplication.
 */
import { vi } from 'vitest'

// Mock implementations
export const mockImplementations = {
  PromptPanel: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  // LazyPromptPanel renders the same mock (no lazy loading in tests)
  LazyPromptPanel: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}

// Mock factories (return vi.fn wrapped implementations)
export const mocks = {
  PromptPanel: vi.fn(mockImplementations.PromptPanel),
  LazyPromptPanel: vi.fn(mockImplementations.LazyPromptPanel),
}

/**
 * Setup all standard mocks.
 * Call this at the top of test files that need component mocks.
 */
export function setupMocks() {
  vi.mock('../../components/PromptPanel', () => ({
    PromptPanel: mocks.PromptPanel,
  }))
  vi.mock('../../components/LazyPromptPanel', () => ({
    LazyPromptPanel: mocks.LazyPromptPanel,
  }))
}

/**
 * Reset all mocks between tests.
 */
export function resetMocks() {
  Object.values(mocks).forEach(mock => mock.mockClear())
}
