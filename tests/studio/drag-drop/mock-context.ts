/**
 * Mock Context for Drag Test Runner
 *
 * Provides a mock DragTestContext for unit testing without a real editor.
 */

import type { DragTestContext } from '../../../studio/preview/drag/test-api/types'

/**
 * Create a mock test context with in-memory code storage
 */
export function createMockContext(initialCode: string = ''): DragTestContext & {
  /** Get all code changes history */
  getCodeHistory: () => string[]
  /** Get number of recompiles */
  getRecompileCount: () => number
} {
  let code = initialCode
  const codeHistory: string[] = [initialCode]
  let recompileCount = 0
  const nodeIdMap = new Map<string, string>()

  return {
    getCode() {
      return code
    },

    setCode(newCode: string) {
      code = newCode
      codeHistory.push(newCode)
    },

    async recompile() {
      recompileCount++
      // Simulate async recompilation
      await new Promise(resolve => setTimeout(resolve, 10))
    },

    getNodeIdByName(name: string) {
      return nodeIdMap.get(name) ?? null
    },

    getAllNodeIds() {
      return Array.from(nodeIdMap.values())
    },

    async waitFor(condition, timeout = 5000) {
      const startTime = performance.now()
      return new Promise((resolve, reject) => {
        const check = () => {
          if (condition()) {
            resolve()
          } else if (performance.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'))
          } else {
            setTimeout(check, 10)
          }
        }
        check()
      })
    },

    // Test helpers
    getCodeHistory() {
      return [...codeHistory]
    },

    getRecompileCount() {
      return recompileCount
    },
  }
}

/**
 * Create a mock context that simulates code modification on drop
 *
 * This mock simulates the behavior of a real editor where code changes
 * after a drop operation.
 */
export function createMockContextWithDropSimulation(initialCode: string = ''): DragTestContext & {
  /** Simulate a code change from drop */
  simulateCodeChange: (newCode: string) => void
  /** Get all code changes history */
  getCodeHistory: () => string[]
} {
  let code = initialCode
  const codeHistory: string[] = [initialCode]
  let pendingChange: string | null = null

  return {
    getCode() {
      // If there's a pending change, apply it (simulates async code modification)
      if (pendingChange !== null) {
        code = pendingChange
        codeHistory.push(code)
        pendingChange = null
      }
      return code
    },

    setCode(newCode: string) {
      code = newCode
      codeHistory.push(newCode)
    },

    async recompile() {
      await new Promise(resolve => setTimeout(resolve, 10))
    },

    getNodeIdByName(_name: string) {
      return null
    },

    getAllNodeIds() {
      return []
    },

    async waitFor(condition, timeout = 5000) {
      const startTime = performance.now()
      return new Promise((resolve, reject) => {
        const check = () => {
          if (condition()) {
            resolve()
          } else if (performance.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'))
          } else {
            setTimeout(check, 10)
          }
        }
        check()
      })
    },

    // Test helpers
    simulateCodeChange(newCode: string) {
      pendingChange = newCode
    },

    getCodeHistory() {
      return [...codeHistory]
    },
  }
}
