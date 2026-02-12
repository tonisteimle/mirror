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
}

// Mock factories (return vi.fn wrapped implementations)
export const mocks = {
  PromptPanel: vi.fn(mockImplementations.PromptPanel),
}

/**
 * Setup all standard mocks.
 * Call this at the top of test files that need component mocks.
 */
export function setupMocks() {
  vi.mock('../../components/PromptPanel', () => ({
    PromptPanel: mocks.PromptPanel,
  }))
}

/**
 * Reset all mocks between tests.
 */
export function resetMocks() {
  Object.values(mocks).forEach(mock => mock.mockClear())
}
