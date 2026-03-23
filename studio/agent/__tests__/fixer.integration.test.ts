/**
 * Fixer Integration Tests
 *
 * Tests the complete Fixer pipeline using the test harness.
 * Run with: npm test -- --testPathPattern="fixer.integration"
 *
 * Test modes:
 * - Mock mode (default): Fast, deterministic, no external dependencies
 * - CLI mode: Slow, requires Claude CLI installed, tests real integration
 *
 * To run CLI tests: USE_REAL_CLI=true npm test -- --testPathPattern="fixer.integration"
 */

import {
  createFixerTestHarness,
  createMockFixerResponse,
  wait,
  createTestHarnesses,
  disposeHarnesses,
  FixerTestHarness
} from './fixer-harness'

// Check if we should use real CLI
const USE_REAL_CLI = process.env.USE_REAL_CLI === 'true'

describe('Fixer Integration Tests', () => {
  let harness: FixerTestHarness

  afterEach(() => {
    if (harness) {
      harness.dispose()
    }
  })

  // ============================================
  // BASIC FUNCTIONALITY
  // ============================================

  describe('Basic Functionality', () => {
    test('should initialize with default config', () => {
      harness = createFixerTestHarness()

      expect(harness.getCurrentFile()).toBe('app.mir')
      expect(harness.getFiles()).toEqual({ 'app.mir': '' })
      expect(harness.isBusy()).toBe(false)
    })

    test('should initialize with custom files', () => {
      harness = createFixerTestHarness({
        files: {
          'app.mir': 'Button "Click"',
          'tokens.tok': '$primary: #3b82f6'
        },
        currentFile: 'tokens.tok'
      })

      expect(harness.getCurrentFile()).toBe('tokens.tok')
      expect(harness.getFiles()).toEqual({
        'app.mir': 'Button "Click"',
        'tokens.tok': '$primary: #3b82f6'
      })
    })

    test('should report as available in mock mode', async () => {
      harness = createFixerTestHarness({ useMockCli: true })

      const available = await harness.isAvailable()
      expect(available).toBe(true)
    })

    test('should get and set file content', () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': 'initial' }
      })

      expect(harness.getFileContent('app.mir')).toBe('initial')

      harness.setFileContent('app.mir', 'updated')
      expect(harness.getFileContent('app.mir')).toBe('updated')
    })

    test('should switch current file', () => {
      harness = createFixerTestHarness({
        files: {
          'app.mir': 'Button',
          'other.mir': 'Card'
        }
      })

      harness.setCurrentFile('other.mir')
      expect(harness.getCurrentFile()).toBe('other.mir')
    })
  })

  // ============================================
  // MOCK MODE TESTS (Fast, Deterministic)
  // ============================================

  describe('Mock Mode', () => {
    test('should apply mock response', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': 'Button "Click"' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'app.mir', action: 'replace', code: 'Button "Klick" bg red' }
        ], 'Button rot gemacht')
      })

      const result = await harness.runPrompt('/roter Button')

      expect(result.success).toBe(true)
      expect(result.filesChanged).toContain('app.mir')
      expect(harness.getFileContent('app.mir')).toBe('Button "Klick" bg red')
    })

    test('should create new file from mock response', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': 'Box' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'button.com', action: 'create', code: 'PrimaryButton as Button:\n  bg $primary' },
          { file: 'app.mir', action: 'replace', code: 'Box\n  PrimaryButton "Click"' }
        ])
      })

      const result = await harness.runPrompt('/erstelle PrimaryButton Komponente')

      expect(result.success).toBe(true)
      expect(result.filesCreated).toContain('button.com')
      expect(harness.getFileContent('button.com')).toContain('PrimaryButton as Button')
    })

    test('should handle insert action', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': 'Box\n  Text "Hello"' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'app.mir', action: 'insert', code: 'Button "Click"', position: { line: 3 } }
        ])
      })

      const result = await harness.runPrompt('/füge Button hinzu')

      expect(result.success).toBe(true)
      const content = harness.getFileContent('app.mir')
      expect(content).toContain('Button "Click"')
    })

    test('should handle append action', async () => {
      harness = createFixerTestHarness({
        files: { 'tokens.tok': '$primary: #3b82f6' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'tokens.tok', action: 'append', code: '$secondary: #22c55e' }
        ])
      })

      const result = await harness.runPrompt('/neues Token hinzufügen')

      expect(result.success).toBe(true)
      const content = harness.getFileContent('tokens.tok')
      expect(content).toContain('$secondary: #22c55e')
    })

    test('should handle mock error', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        mockError: 'Test error message'
      })

      const result = await harness.runPrompt('/something')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    test('should change mock response between calls', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true
      })

      // First call
      harness.setMockResponse(createMockFixerResponse([
        { file: 'app.mir', action: 'replace', code: 'First' }
      ]))
      await harness.runPrompt('/first')
      expect(harness.getFileContent('app.mir')).toBe('First')

      // Second call with different mock
      harness.setMockResponse(createMockFixerResponse([
        { file: 'app.mir', action: 'replace', code: 'Second' }
      ]))
      await harness.runPrompt('/second')
      expect(harness.getFileContent('app.mir')).toBe('Second')
    })
  })

  // ============================================
  // QUICK FIX TESTS
  // ============================================

  describe('Quick Fix', () => {
    test('should work with quickFix API', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': 'Button' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'app.mir', action: 'replace', code: 'Button bg red' }
        ])
      })

      const result = await harness.quickFix('/red')

      expect(result.success).toBe(true)
      expect(harness.getFileContent('app.mir')).toBe('Button bg red')
    })
  })

  // ============================================
  // MULTI-FILE TESTS
  // ============================================

  describe('Multi-File Changes', () => {
    test('should handle changes to multiple files', async () => {
      harness = createFixerTestHarness({
        files: {
          'app.mir': 'Button',
          'tokens.tok': '$primary: #fff'
        },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6' },
          { file: 'app.mir', action: 'replace', code: 'Button bg $primary' }
        ])
      })

      const result = await harness.runPrompt('/Button mit primary Farbe')

      expect(result.success).toBe(true)
      expect(result.filesChanged).toContain('app.mir')
      expect(result.filesChanged).toContain('tokens.tok')
      expect(harness.getFileContent('tokens.tok')).toContain('#3b82f6')
      expect(harness.getFileContent('app.mir')).toContain('$primary')
    })

    test('should create component and use it', async () => {
      harness = createFixerTestHarness({
        files: {
          'app.mir': 'Box',
          'components.com': ''
        },
        useMockCli: true,
        mockResponse: createMockFixerResponse([
          { file: 'components.com', action: 'replace', code: 'Card as Box:\n  pad 20\n  rad 12' },
          { file: 'app.mir', action: 'replace', code: 'Box\n  Card' }
        ])
      })

      const result = await harness.runPrompt('/Card Komponente erstellen und nutzen')

      expect(result.success).toBe(true)
      expect(harness.getFileContent('components.com')).toContain('Card as Box')
      expect(harness.getFileContent('app.mir')).toContain('Card')
    })
  })

  // ============================================
  // CONVERSATION HISTORY TESTS
  // ============================================

  describe('Conversation History', () => {
    test('should maintain history across calls', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([])
      })

      await harness.runPrompt('/first')
      await harness.runPrompt('/second')

      const history = harness.getHistory()
      expect(history.length).toBeGreaterThan(0)
    })

    test('should clear history on clearSession', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([])
      })

      await harness.runPrompt('/test')
      harness.clearSession()

      const history = harness.getHistory()
      expect(history.length).toBe(0)
    })
  })

  // ============================================
  // EVENT STREAMING TESTS
  // ============================================

  describe('Event Streaming', () => {
    test('should emit events during processing', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        mockResponse: createMockFixerResponse([])
      })

      const result = await harness.runPrompt('/test')

      expect(result.events.length).toBeGreaterThan(0)

      // Should have thinking events
      const thinkingEvents = result.events.filter(e => e.type === 'thinking')
      expect(thinkingEvents.length).toBeGreaterThan(0)

      // Should have done event
      const doneEvents = result.events.filter(e => e.type === 'done')
      expect(doneEvents.length).toBe(1)
    })
  })

  // ============================================
  // CONCURRENT PROCESSING TESTS
  // ============================================

  describe('Concurrent Processing', () => {
    test('should prevent concurrent processing', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        responseDelay: 100,
        mockResponse: createMockFixerResponse([])
      })

      // Start first prompt (don't await)
      const promise1 = harness.runPrompt('/first')

      // Wait a bit for first to start
      await wait(10)

      // Verify it's busy
      expect(harness.isBusy()).toBe(true)

      // Second prompt should fail
      const result2 = await harness.runPrompt('/second')
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('aktiv')

      // Wait for first to complete
      await promise1
    })
  })

  // ============================================
  // TIMING TESTS
  // ============================================

  describe('Timing', () => {
    test('should track duration', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: true,
        responseDelay: 50,
        mockResponse: createMockFixerResponse([])
      })

      const result = await harness.runPrompt('/test')

      expect(result.duration).toBeGreaterThanOrEqual(50)
    })
  })

  // ============================================
  // CLEANUP TESTS
  // ============================================

  describe('Cleanup', () => {
    test('should dispose cleanly', () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' }
      })

      expect(() => harness.dispose()).not.toThrow()
    })

    test('should handle multiple disposes', () => {
      harness = createFixerTestHarness()

      harness.dispose()
      expect(() => harness.dispose()).not.toThrow()
    })
  })

  // ============================================
  // HELPER FUNCTION TESTS
  // ============================================

  describe('Helper Functions', () => {
    test('createMockFixerResponse should create valid response', () => {
      const response = createMockFixerResponse([
        { code: 'Button' },
        { file: 'other.mir', action: 'create', code: 'Card' }
      ], 'Test explanation')

      expect(response.explanation).toBe('Test explanation')
      expect(response.changes).toHaveLength(2)
      expect(response.changes[0].file).toBe('app.mir')
      expect(response.changes[0].action).toBe('replace')
      expect(response.changes[1].file).toBe('other.mir')
      expect(response.changes[1].action).toBe('create')
    })

    test('createTestHarnesses should create multiple harnesses', () => {
      const harnesses = createTestHarnesses(3, { useMockCli: true })

      try {
        expect(harnesses).toHaveLength(3)
        harnesses.forEach(h => {
          expect(h.isBusy()).toBe(false)
        })
      } finally {
        disposeHarnesses(harnesses)
      }
    })
  })
})

// ============================================
// REAL CLI TESTS (Conditional)
// ============================================

if (USE_REAL_CLI) {
  describe('Real CLI Integration (Slow)', () => {
    let harness: FixerTestHarness

    beforeAll(() => {
      console.log('Running real CLI tests - this requires Claude CLI to be installed')
    })

    afterEach(() => {
      if (harness) {
        harness.dispose()
      }
    })

    test('should check CLI availability', async () => {
      harness = createFixerTestHarness({
        files: { 'app.mir': '' },
        useMockCli: false
      })

      const available = await harness.isAvailable()
      console.log('CLI available:', available)
      expect(typeof available).toBe('boolean')
    }, 10000)

    test('should generate button component', async () => {
      harness = createFixerTestHarness({
        files: {
          'app.mir': 'Box\n  Text "Hello"'
        },
        useMockCli: false,
        debug: true
      })

      const available = await harness.isAvailable()
      if (!available) {
        console.log('Skipping: Claude CLI not available')
        return
      }

      const result = await harness.runPrompt('/füge einen blauen Button hinzu')

      console.log('Result:', {
        success: result.success,
        filesChanged: result.filesChanged,
        duration: result.duration
      })

      expect(result.success).toBe(true)
      expect(result.duration).toBeLessThan(60000)
    }, 120000) // 2 minute timeout
  })
}
