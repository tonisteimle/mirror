/**
 * Studio Test Harness
 *
 * Simulates the complete drag-drop flow for testing:
 *   simulateDrop → DropService → CodeModifier → MockEditor → compile → SourceMap
 *
 * Enables realistic E2E tests without a real browser.
 */

import { DropService, getDropService, DropResultApplier } from './index'
import type { DropResult, DropContext, ModificationResult, DropSource } from './types'
import { CodeModifier } from '../../compiler/studio/code-modifier'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import type { SourceMap } from '../../compiler/ir'

/**
 * Mock Editor that tracks code changes
 */
export class MockEditor {
  private code: string
  private changes: EditorChange[] = []

  constructor(initialCode: string) {
    this.code = initialCode
  }

  get state() {
    return {
      doc: {
        length: this.code.length,
        toString: () => this.code,
        lineAt: (pos: number) => {
          const lines = this.code.substring(0, pos).split('\n')
          return { number: lines.length }
        },
      },
    }
  }

  dispatch(spec: { changes: EditorChange; annotations?: unknown }): void {
    const change = spec.changes
    this.changes.push(change)

    // Apply change to code
    const before = this.code.substring(0, change.from)
    const after = this.code.substring(change.to)
    this.code = before + change.insert + after
  }

  getCode(): string {
    return this.code
  }

  getChanges(): EditorChange[] {
    return [...this.changes]
  }

  clearChanges(): void {
    this.changes = []
  }
}

interface EditorChange {
  from: number
  to: number
  insert: string
}

/**
 * Mock Event Bus for capturing events
 */
export class MockEventBus {
  private events: Array<{ name: string; data: unknown }> = []

  emit(event: string, data: unknown): void {
    this.events.push({ name: event, data })
  }

  getEvents(): Array<{ name: string; data: unknown }> {
    return [...this.events]
  }

  getEventsByType(type: string): unknown[] {
    return this.events.filter(e => e.name === type).map(e => e.data)
  }

  clear(): void {
    this.events = []
  }
}

/**
 * Mock Command Executor for undo tracking
 */
export class MockExecutor {
  private commands: unknown[] = []

  execute(command: unknown): void {
    this.commands.push(command)
  }

  getCommands(): unknown[] {
    return [...this.commands]
  }

  clear(): void {
    this.commands = []
  }
}

/**
 * Result of a test drop operation
 */
export interface TestDropResult {
  success: boolean
  error?: string
  codeBefore: string
  codeAfter: string
  sourceMap: SourceMap | null
  events: Array<{ name: string; data: unknown }>
  changes: EditorChange[]
  modificationResult: ModificationResult | null
}

/**
 * Configuration for StudioTestHarness
 */
export interface HarnessConfig {
  initialCode: string
  preludeCode?: string
  currentFile?: string
}

/**
 * Studio Test Harness
 *
 * Simulates complete drop flow for testing.
 */
export class StudioTestHarness {
  private editor: MockEditor
  private events: MockEventBus
  private executor: MockExecutor
  private dropService: DropService
  private preludeCode: string
  private currentFile: string
  private pendingSelection: unknown = null

  constructor(config: HarnessConfig) {
    this.editor = new MockEditor(config.initialCode)
    this.events = new MockEventBus()
    this.executor = new MockExecutor()
    this.dropService = getDropService()
    this.preludeCode = config.preludeCode || ''
    this.currentFile = config.currentFile || 'test.mir'
  }

  /**
   * Get current code
   */
  getCode(): string {
    return this.editor.getCode()
  }

  /**
   * Set code directly
   */
  setCode(code: string): void {
    this.editor = new MockEditor(code)
    this.events.clear()
    this.executor.clear()
  }

  /**
   * Get SourceMap for current code
   */
  getSourceMap(): SourceMap | null {
    try {
      const fullCode = this.preludeCode + this.editor.getCode()
      const ast = parse(fullCode)
      const { sourceMap } = toIR(ast, true)
      return sourceMap
    } catch {
      return null
    }
  }

  /**
   * Simulate a palette drop (component from palette to canvas)
   */
  async simulatePaletteDrop(params: {
    componentName: string
    targetNodeId: string
    insertionIndex?: number
    template?: string
    properties?: string
    textContent?: string
    children?: unknown[]
  }): Promise<TestDropResult> {
    const codeBefore = this.editor.getCode()

    // Check if template is multi-line (has newlines) -> use mirTemplate
    const isMultiLineTemplate = params.template && params.template.includes('\n')

    const dropResult: DropResult = {
      source: {
        type: 'palette',
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        children: params.children,
        // Multi-line templates go to mirTemplate for TemplateDropHandler
        mirTemplate: isMultiLineTemplate ? params.template : undefined,
      },
      targetNodeId: params.targetNodeId,
      placement: 'inside',
      insertionIndex: params.insertionIndex ?? 0,
    }

    return this.executeDropFlow(dropResult, codeBefore)
  }

  /**
   * Simulate a canvas move (element from one container to another)
   */
  async simulateCanvasMove(params: {
    sourceNodeId: string
    targetNodeId: string
    insertionIndex?: number
  }): Promise<TestDropResult> {
    const codeBefore = this.editor.getCode()

    const dropResult: DropResult = {
      source: {
        type: 'element',
        nodeId: params.sourceNodeId,
      },
      targetNodeId: params.targetNodeId,
      placement: 'inside',
      insertionIndex: params.insertionIndex ?? 0,
    }

    return this.executeDropFlow(dropResult, codeBefore)
  }

  /**
   * Execute the complete drop flow
   */
  private async executeDropFlow(
    dropResult: DropResult,
    codeBefore: string
  ): Promise<TestDropResult> {
    try {
      // Create context with CodeModifier
      const context = this.createDropContext()

      // Execute drop via DropService
      const modResult = await this.dropService.handleDrop(dropResult, context)

      if (!modResult?.success) {
        return {
          success: false,
          error: modResult?.error || 'Drop handler returned no result',
          codeBefore,
          codeAfter: this.editor.getCode(),
          sourceMap: null,
          events: this.events.getEvents(),
          changes: this.editor.getChanges(),
          modificationResult: modResult,
        }
      }

      // Apply result to editor
      const applier = this.createApplier()
      const componentName = this.getComponentName(dropResult.source)
      applier.apply(modResult, componentName)

      // Get new SourceMap after modification
      const sourceMap = this.getSourceMap()

      return {
        success: true,
        codeBefore,
        codeAfter: this.editor.getCode(),
        sourceMap,
        events: this.events.getEvents(),
        changes: this.editor.getChanges(),
        modificationResult: modResult,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        codeBefore,
        codeAfter: this.editor.getCode(),
        sourceMap: null,
        events: this.events.getEvents(),
        changes: this.editor.getChanges(),
        modificationResult: null,
      }
    }
  }

  /**
   * Create DropContext with real CodeModifier
   */
  private createDropContext(): DropContext {
    const fullCode = this.preludeCode + this.editor.getCode()
    const ast = parse(fullCode)
    const { sourceMap } = toIR(ast, true)
    const codeModifier = new CodeModifier(fullCode, sourceMap)

    return {
      codeModifier,
      robustModifier: null as unknown as DropContext['robustModifier'],
      previewContainer: null as unknown as HTMLElement,
      currentFile: this.currentFile,
      zoomScale: 1,
      isComponentsFile: () => false,
      findExistingZagDefinition: () => ({ exists: false }),
      generateZagComponentName: (name: string) => name,
      generateZagDefinitionCode: () => '',
      generateZagInstanceCode: () => '',
      addZagDefinitionToCode: () => {},
      findOrCreateComponentsFile: async () => null,
      addZagDefinitionToComponentsFile: async () => false,
      isZagComponent: () => false,
      emitNotification: (type, message) => {
        this.events.emit(`notification:${type}`, { message })
      },
    }
  }

  /**
   * Create DropResultApplier with mock dependencies
   */
  private createApplier(): DropResultApplier {
    return new DropResultApplier({
      editor: this.editor as unknown as Parameters<
        typeof DropResultApplier.prototype.apply
      >[0] extends void
        ? never
        : unknown as Parameters<ConstructorParameters<typeof DropResultApplier>[0]['editor']>,
      preludeOffset: this.preludeCode.length,
      executor: this.executor as unknown as ConstructorParameters<
        typeof DropResultApplier
      >[0]['executor'],
      events: this.events as unknown as ConstructorParameters<
        typeof DropResultApplier
      >[0]['events'],
      compile: () => {},
      save: () => {},
      setPendingSelection: sel => {
        this.pendingSelection = sel
      },
    } as ConstructorParameters<typeof DropResultApplier>[0])
  }

  private getComponentName(source: DropSource): string {
    if (source.type === 'element') {
      return 'Element'
    }
    return source.componentName || 'Component'
  }

  /**
   * Get all captured events
   */
  getEvents(): Array<{ name: string; data: unknown }> {
    return this.events.getEvents()
  }

  /**
   * Get all recorded commands (for undo)
   */
  getCommands(): unknown[] {
    return this.executor.getCommands()
  }

  /**
   * Get pending selection
   */
  getPendingSelection(): unknown {
    return this.pendingSelection
  }

  /**
   * Reset harness state
   */
  reset(initialCode?: string): void {
    this.editor = new MockEditor(initialCode || '')
    this.events.clear()
    this.executor.clear()
    this.pendingSelection = null
  }
}

/**
 * Create a test harness with initial code
 */
export function createTestHarness(code: string, prelude?: string): StudioTestHarness {
  return new StudioTestHarness({
    initialCode: code,
    preludeCode: prelude,
  })
}

/**
 * Assertion helpers for test results
 */
export const assertions = {
  /**
   * Check if code contains expected string
   */
  codeContains(result: TestDropResult, expected: string): boolean {
    return result.codeAfter.includes(expected)
  },

  /**
   * Check if code matches pattern
   */
  codeMatches(result: TestDropResult, pattern: RegExp): boolean {
    return pattern.test(result.codeAfter)
  },

  /**
   * Check correct indentation (spaces before component)
   */
  hasIndentation(result: TestDropResult, componentName: string, spaces: number): boolean {
    const pattern = new RegExp(`^${' '.repeat(spaces)}${componentName}`, 'm')
    return pattern.test(result.codeAfter)
  },

  /**
   * Check component order
   */
  componentOrder(result: TestDropResult, components: string[]): boolean {
    const lines = result.codeAfter.split('\n')
    const positions = components.map(c => lines.findIndex(l => l.includes(c)))
    for (let i = 0; i < positions.length - 1; i++) {
      if (positions[i] >= positions[i + 1]) return false
    }
    return true
  },

  /**
   * Check SourceMap contains node
   */
  sourceMapHasNode(result: TestDropResult, nodeId: string): boolean {
    return result.sourceMap?.getNodeById(nodeId) !== undefined
  },

  /**
   * Generate diff between before and after
   */
  generateDiff(result: TestDropResult): string {
    const beforeLines = result.codeBefore.split('\n')
    const afterLines = result.codeAfter.split('\n')
    const diff: string[] = []

    // Simple diff - show added/removed lines
    for (const line of beforeLines) {
      if (!afterLines.includes(line)) {
        diff.push(`- ${line}`)
      }
    }
    for (const line of afterLines) {
      if (!beforeLines.includes(line)) {
        diff.push(`+ ${line}`)
      }
    }

    return diff.join('\n')
  },
}
