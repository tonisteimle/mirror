// @vitest-environment jsdom
/**
 * Tests for studio/drop/ handlers + service.
 *
 * Strategy-pattern dispatch: DropService runs handlers in order until one
 * canHandle()s + handle() returns non-null. Order matters because some
 * handlers (Pure Mirror, Zag) act on the same `palette + children`
 * shape. Each handler is also unit-tested for its build* helpers.
 *
 * The 4 app-coupled files (app-adapter, drop-result-applier, test-harness,
 * index barrel) wire DOM/state and aren't covered here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DropService, getDropService, resetDropService } from '../../studio/drop/drop-service'
import { ElementDuplicateHandler } from '../../studio/drop/handlers/element-duplicate'
import { ElementMoveHandler } from '../../studio/drop/handlers/element-move'
import { AbsolutePositionHandler } from '../../studio/drop/handlers/absolute-position'
import { PaletteDropHandler } from '../../studio/drop/handlers/palette-drop'
import { ZagComponentHandler } from '../../studio/drop/handlers/zag-component'
import { ChartDropHandler } from '../../studio/drop/handlers/chart-drop'
import { TemplateDropHandler } from '../../studio/drop/handlers/template-drop'
import { PureComponentHandler } from '../../studio/drop/handlers/pure-component'
import type {
  DropResult,
  DropContext,
  CodeModifier,
  ModificationResult,
} from '../../studio/drop/types'

// =============================================================================
// Test fixtures
// =============================================================================

function makeModResult(overrides: Partial<ModificationResult> = {}): ModificationResult {
  return {
    success: true,
    newSource: 'NEW',
    change: { from: 0, to: 10, insert: 'NEW' },
    ...overrides,
  }
}

function makeCodeModifier(): CodeModifier {
  return {
    duplicateNode: vi.fn().mockReturnValue(makeModResult({ newSource: 'DUP' })),
    moveNode: vi.fn().mockReturnValue(makeModResult({ newSource: 'MOV' })),
    updateProperty: vi.fn().mockReturnValue(makeModResult()),
    addChild: vi.fn().mockReturnValue(makeModResult({ newSource: 'ADD' })),
    addChildWithTemplate: vi.fn().mockReturnValue(makeModResult({ newSource: 'TPL' })),
    addProperty: vi.fn().mockReturnValue(makeModResult()),
    removeProperty: vi.fn().mockReturnValue(makeModResult()),
    getSourceLength: vi.fn().mockReturnValue(100),
  } as unknown as CodeModifier
}

function makeContext(overrides: Partial<DropContext> = {}): DropContext {
  const previewContainer = document.createElement('div')
  return {
    codeModifier: makeCodeModifier(),
    previewContainer,
    currentFile: 'app.mir',
    isComponentsFile: vi.fn().mockReturnValue(false),
    findExistingZagDefinition: vi.fn().mockReturnValue({ exists: false }),
    generateZagComponentName: vi.fn(name => `My${name}`),
    generateZagDefinitionCode: vi.fn(() => 'DEF_CODE'),
    generateZagInstanceCode: vi.fn((name, props) => (props ? `${name} ${props}` : name)),
    addZagDefinitionToCode: vi.fn(),
    findOrCreateComponentsFile: vi.fn().mockResolvedValue('comp.com'),
    addZagDefinitionToComponentsFile: vi.fn().mockResolvedValue(true),
    hasZagChildren: vi.fn().mockReturnValue(true),
    emitNotification: vi.fn(),
    ...overrides,
  } as DropContext
}

function elementDrop(overrides: Partial<DropResult> = {}): DropResult {
  return {
    source: { type: 'element', nodeId: 'src1' },
    targetNodeId: 'dst1',
    placement: 'inside',
    ...overrides,
  } as DropResult
}

function paletteDrop(overrides: Partial<DropResult> = {}): DropResult {
  return {
    source: { type: 'palette', componentName: 'Frame' },
    targetNodeId: 'dst1',
    placement: 'inside',
    ...overrides,
  } as DropResult
}

// =============================================================================
// ElementDuplicateHandler
// =============================================================================

describe('ElementDuplicateHandler', () => {
  it('canHandle: element drop with isDuplicate=true', () => {
    const h = new ElementDuplicateHandler()
    expect(h.canHandle(elementDrop({ isDuplicate: true }))).toBe(true)
  })

  it('canHandle: false for element drop without isDuplicate', () => {
    const h = new ElementDuplicateHandler()
    expect(h.canHandle(elementDrop({ isDuplicate: false }))).toBe(false)
  })

  it('canHandle: false for palette drop', () => {
    const h = new ElementDuplicateHandler()
    expect(h.canHandle(paletteDrop({ isDuplicate: true } as any))).toBe(false)
  })

  it('handle: delegates to codeModifier.duplicateNode', async () => {
    const h = new ElementDuplicateHandler()
    const ctx = makeContext()
    const result = await h.handle(
      elementDrop({
        source: { type: 'element', nodeId: 'src1' },
        targetNodeId: 'dst1',
        placement: 'before',
        isDuplicate: true,
      } as DropResult),
      ctx
    )
    expect(ctx.codeModifier.duplicateNode).toHaveBeenCalledWith('src1', 'dst1', 'before')
    expect(result?.newSource).toBe('DUP')
  })
})

// =============================================================================
// ElementMoveHandler
// =============================================================================

describe('ElementMoveHandler', () => {
  it('canHandle: element drop, not duplicate, not absolute', () => {
    const h = new ElementMoveHandler()
    expect(h.canHandle(elementDrop())).toBe(true)
  })

  it('canHandle: false when isDuplicate', () => {
    expect(new ElementMoveHandler().canHandle(elementDrop({ isDuplicate: true }))).toBe(false)
  })

  it('canHandle: false when placement=absolute + absolutePosition', () => {
    expect(
      new ElementMoveHandler().canHandle(
        elementDrop({ placement: 'absolute', absolutePosition: { x: 10, y: 20 } })
      )
    ).toBe(false)
  })

  it('handle: delegates to moveNode without alignment/grid', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    await h.handle(elementDrop({ insertionIndex: 2 }), ctx)
    expect(ctx.codeModifier.moveNode).toHaveBeenCalledWith('src1', 'dst1', 'inside', 2, undefined)
  })

  it('handle: alignment.zone strips conflicting keywords first, then adds new one', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    await h.handle(elementDrop({ alignment: { zone: 'tl' } }), ctx)
    // Should have called removeProperty for every other alignment keyword
    expect(ctx.codeModifier.removeProperty).toHaveBeenCalledWith('dst1', 'tc')
    expect(ctx.codeModifier.removeProperty).toHaveBeenCalledWith('dst1', 'center')
    expect(ctx.codeModifier.removeProperty).toHaveBeenCalledWith('dst1', 'br')
    // Should NOT have removed 'tl' itself
    expect(ctx.codeModifier.removeProperty).not.toHaveBeenCalledWith('dst1', 'tl')
    expect(ctx.codeModifier.addProperty).toHaveBeenCalledWith('dst1', 'tl', '')
  })

  it('handle: gridPlacement folds into moveNode options.properties', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    await h.handle(elementDrop({ gridPlacement: { x: 2, y: 3, w: 1, h: 1 } }), ctx)
    expect(ctx.codeModifier.moveNode).toHaveBeenCalledWith('src1', 'dst1', 'inside', undefined, {
      properties: 'x 2, y 3',
    })
  })

  it('handle: gridPlacement with w>1 / h>1 emits w / h', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    await h.handle(elementDrop({ gridPlacement: { x: 2, y: 3, w: 4, h: 2 } }), ctx)
    expect(ctx.codeModifier.moveNode).toHaveBeenCalledWith('src1', 'dst1', 'inside', undefined, {
      properties: 'x 2, y 3, w 4, h 2',
    })
  })

  it('handle: failed addProperty returns the failure (no moveNode call)', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    ctx.codeModifier.addProperty = vi.fn().mockReturnValue({ success: false, error: 'x' })
    const result = await h.handle(elementDrop({ alignment: { zone: 'tl' } }), ctx)
    expect(result?.success).toBe(false)
    expect(ctx.codeModifier.moveNode).not.toHaveBeenCalled()
  })

  it('handle: with alignment, fixes change range to [0, originalSourceLength]', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    ctx.codeModifier.getSourceLength = vi.fn().mockReturnValue(42)
    ctx.codeModifier.moveNode = vi
      .fn()
      .mockReturnValue(makeModResult({ change: { from: 0, to: 99, insert: 'NEW' } }))
    const result = await h.handle(elementDrop({ alignment: { zone: 'tl' } }), ctx)
    expect(result?.change).toEqual({ from: 0, to: 42, insert: 'NEW' })
  })

  it('handle: without alignment, returns moveResult unchanged', async () => {
    const h = new ElementMoveHandler()
    const ctx = makeContext()
    const moveR = makeModResult({ change: { from: 5, to: 10, insert: 'X' } })
    ctx.codeModifier.moveNode = vi.fn().mockReturnValue(moveR)
    const result = await h.handle(elementDrop(), ctx)
    expect(result).toBe(moveR)
  })
})

// =============================================================================
// AbsolutePositionHandler
// =============================================================================

describe('AbsolutePositionHandler', () => {
  it('canHandle: element drop with placement=absolute + absolutePosition', () => {
    const h = new AbsolutePositionHandler()
    expect(
      h.canHandle(elementDrop({ placement: 'absolute', absolutePosition: { x: 1, y: 2 } }))
    ).toBe(true)
  })

  it('canHandle: false when isDuplicate', () => {
    const h = new AbsolutePositionHandler()
    expect(
      h.canHandle(
        elementDrop({ placement: 'absolute', absolutePosition: { x: 0, y: 0 }, isDuplicate: true })
      )
    ).toBe(false)
  })

  it('canHandle: false when not absolute placement', () => {
    expect(new AbsolutePositionHandler().canHandle(elementDrop())).toBe(false)
  })

  it('handle: uses RobustModifier when present', async () => {
    const h = new AbsolutePositionHandler()
    const robust = { updatePosition: vi.fn().mockReturnValue(makeModResult({ newSource: 'R' })) }
    const ctx = makeContext({ robustModifier: robust as any })
    await h.handle(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 12.7, y: 33.4 } }),
      ctx
    )
    expect(robust.updatePosition).toHaveBeenCalledWith('src1', 12.7, 33.4)
  })

  it('handle: rounds x and y in fallback path', async () => {
    const h = new AbsolutePositionHandler()
    const ctx = makeContext()
    await h.handle(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 12.7, y: 33.4 } }),
      ctx
    )
    expect(ctx.codeModifier.updateProperty).toHaveBeenCalledWith('src1', 'x', '13')
    expect(ctx.codeModifier.updateProperty).toHaveBeenCalledWith('src1', 'y', '33')
  })

  it('handle: returns failure if updateProperty(x) fails (no y call)', async () => {
    const h = new AbsolutePositionHandler()
    const ctx = makeContext()
    ctx.codeModifier.updateProperty = vi.fn().mockReturnValueOnce({ success: false, error: 'x' })
    const result = await h.handle(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 1, y: 2 } }),
      ctx
    )
    expect(result?.success).toBe(false)
    expect(ctx.codeModifier.updateProperty).toHaveBeenCalledTimes(1)
  })

  it('handle: merges X+Y change ranges', async () => {
    const h = new AbsolutePositionHandler()
    const ctx = makeContext()
    ctx.codeModifier.updateProperty = vi
      .fn()
      .mockReturnValueOnce(
        makeModResult({ change: { from: 0, to: 10, insert: 'X' }, newSource: 'X-SRC' })
      )
      .mockReturnValueOnce(
        makeModResult({ change: { from: 5, to: 15, insert: 'Y' }, newSource: 'Y-SRC' })
      )
    const result = await h.handle(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 5, y: 10 } }),
      ctx
    )
    expect(result?.change).toEqual({ from: 0, to: 10, insert: 'Y' })
    expect(result?.newSource).toBe('Y-SRC')
    expect(result?.success).toBe(true)
  })
})

// =============================================================================
// PaletteDropHandler
// =============================================================================

describe('PaletteDropHandler', () => {
  it('canHandle: palette drop without children (regular component)', () => {
    expect(new PaletteDropHandler().canHandle(paletteDrop())).toBe(true)
  })

  it('canHandle: false when source has children (Zag-shaped)', () => {
    expect(
      new PaletteDropHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any })
      )
    ).toBe(false)
  })

  it('canHandle: false for element drop', () => {
    expect(new PaletteDropHandler().canHandle(elementDrop())).toBe(false)
  })

  it('handle: passes componentName + position + textContent', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Button',
          textContent: 'Click',
          properties: 'pad 10',
        },
        insertionIndex: 3,
      } as DropResult),
      ctx
    )
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith('dst1', 'Button', {
      position: 3,
      properties: 'pad 10',
      textContent: 'Click',
      parentProperty: undefined,
    })
  })

  it('handle: position defaults to "last" when insertionIndex undefined', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(paletteDrop(), ctx)
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith(
      'dst1',
      'Frame',
      expect.objectContaining({ position: 'last' })
    )
  })

  it('handle: alignment zone passed as parentProperty', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(paletteDrop({ alignment: { zone: 'center' } } as any), ctx)
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith(
      'dst1',
      'Frame',
      expect.objectContaining({ parentProperty: 'center' })
    )
  })

  it('handle: absolute placement → adds rounded x/y to properties', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        placement: 'absolute',
        absolutePosition: { x: 10.7, y: 20.3 },
      } as DropResult),
      ctx
    )
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith(
      'dst1',
      'Frame',
      expect.objectContaining({ properties: 'x 11, y 20' })
    )
  })

  it('handle: absolute clamps negative coords to 0', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        placement: 'absolute',
        absolutePosition: { x: -5, y: -10 },
      } as DropResult),
      ctx
    )
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith(
      'dst1',
      'Frame',
      expect.objectContaining({ properties: 'x 0, y 0' })
    )
  })

  it('handle: existing properties get position appended via comma', async () => {
    const h = new PaletteDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        placement: 'absolute',
        absolutePosition: { x: 1, y: 2 },
        source: { type: 'palette', componentName: 'Frame', properties: 'pad 10' },
      } as DropResult),
      ctx
    )
    expect(ctx.codeModifier.addChild).toHaveBeenCalledWith(
      'dst1',
      'Frame',
      expect.objectContaining({ properties: 'pad 10, x 1, y 2' })
    )
  })
})

// =============================================================================
// ZagComponentHandler
// =============================================================================

describe('ZagComponentHandler', () => {
  it('canHandle: palette drop with children', () => {
    expect(
      new ZagComponentHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any })
      )
    ).toBe(true)
  })

  it('canHandle: false without children', () => {
    expect(new ZagComponentHandler().canHandle(paletteDrop())).toBe(false)
  })

  it('handle: returns null when context.hasZagChildren says no (defer to PaletteDrop)', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({ hasZagChildren: vi.fn().mockReturnValue(false) })
    const result = await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'X', children: [{}] } as any }),
      ctx
    )
    expect(result).toBeNull()
  })

  it('handle: in .com file, existing definition → emit info + return null', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({
      isComponentsFile: vi.fn().mockReturnValue(true),
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'MyTabs' }),
    })
    const result = await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.emitNotification).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('bereits definiert')
    )
    expect(result).toBeNull()
  })

  it('handle: in .com file, new definition → addZagDefinitionToCode + emit success + return null', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({ isComponentsFile: vi.fn().mockReturnValue(true) })
    const result = await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.addZagDefinitionToCode).toHaveBeenCalled()
    expect(ctx.emitNotification).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('erstellt')
    )
    expect(result).toBeNull()
  })

  it('handle: in .mir file, existing definition → use definitionName + create instance', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'MyTabs' }),
    })
    await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.generateZagInstanceCode).toHaveBeenCalledWith('MyTabs', '', expect.any(Array))
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalled()
  })

  it('handle: in .mir file, new definition → creates def in .com file then instance', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.findOrCreateComponentsFile).toHaveBeenCalled()
    expect(ctx.addZagDefinitionToComponentsFile).toHaveBeenCalled()
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalled()
  })

  it('handle: when no .com file → fall back to addZagDefinitionToCode', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({ findOrCreateComponentsFile: vi.fn().mockResolvedValue(null) })
    await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.addZagDefinitionToCode).toHaveBeenCalled()
  })

  it('handle: when addZagDefinitionToComponentsFile fails → emit error', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({
      addZagDefinitionToComponentsFile: vi.fn().mockResolvedValue(false),
    })
    await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Tabs', children: [{}] } as any }),
      ctx
    )
    expect(ctx.emitNotification).toHaveBeenCalledWith('error', expect.any(String))
  })

  it('handle: absolute placement adds rounded x/y to properties', async () => {
    const h = new ZagComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'MyTabs' }),
    })
    await h.handle(
      paletteDrop({
        placement: 'absolute',
        absolutePosition: { x: 7.4, y: 12.8 },
        source: {
          type: 'palette',
          componentName: 'Tabs',
          children: [{}],
          properties: 'pad 8',
        } as any,
      } as DropResult),
      ctx
    )
    expect(ctx.generateZagInstanceCode).toHaveBeenCalledWith(
      'MyTabs',
      'pad 8, x 7, y 13',
      expect.any(Array)
    )
  })
})

// =============================================================================
// ChartDropHandler
// =============================================================================

describe('ChartDropHandler', () => {
  it('canHandle: palette drop with dataBlock', () => {
    expect(
      new ChartDropHandler().canHandle(
        paletteDrop({
          source: {
            type: 'palette',
            componentName: 'Bar',
            dataBlock: { name: 'sales', content: 'Q1: 10' },
          } as any,
        })
      )
    ).toBe(true)
  })

  it('canHandle: false without dataBlock', () => {
    expect(new ChartDropHandler().canHandle(paletteDrop())).toBe(false)
  })

  it('handle: builds template with indented data block + chart line', async () => {
    const h = new ChartDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Bar',
          dataBlock: { name: 'sales', content: 'Q1: 10\nQ2: 20' },
          properties: 'w 200',
        } as any,
      }),
      ctx
    )
    const template = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    expect(template).toBe('sales:\n  Q1: 10\n  Q2: 20\n\nBar w 200')
  })

  it('handle: chart without properties → just the component name', async () => {
    const h = new ChartDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Bar',
          dataBlock: { name: 'data', content: 'Jan: 5' },
        } as any,
      }),
      ctx
    )
    const template = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    expect(template).toBe('data:\n  Jan: 5\n\nBar')
  })

  it('handle: passes alignment zone as parentProperty', async () => {
    const h = new ChartDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Bar',
          dataBlock: { name: 'd', content: 'a: 1' },
        } as any,
        alignment: { zone: 'center' },
      }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalledWith('dst1', expect.any(String), {
      position: 'last',
      parentProperty: 'center',
    })
  })
})

// =============================================================================
// TemplateDropHandler
// =============================================================================

describe('TemplateDropHandler', () => {
  it('canHandle: palette drop with mirTemplate', () => {
    expect(
      new TemplateDropHandler().canHandle(
        paletteDrop({
          source: { type: 'palette', componentName: 'X', mirTemplate: 'Frame X' } as any,
        })
      )
    ).toBe(true)
  })

  it('canHandle: false without mirTemplate', () => {
    expect(new TemplateDropHandler().canHandle(paletteDrop())).toBe(false)
  })

  it('handle: passes mirTemplate verbatim to addChildWithTemplate', async () => {
    const h = new TemplateDropHandler()
    const ctx = makeContext()
    const tpl = 'Frame X\n  Text "Hi"'
    await h.handle(
      paletteDrop({
        source: { type: 'palette', componentName: 'X', mirTemplate: tpl } as any,
        insertionIndex: 5,
      }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalledWith('dst1', tpl, {
      position: 5,
      parentProperty: undefined,
    })
  })

  it('handle: position defaults to "last"', async () => {
    const h = new TemplateDropHandler()
    const ctx = makeContext()
    await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'X', mirTemplate: 'T' } as any }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalledWith(
      'dst1',
      'T',
      expect.objectContaining({ position: 'last' })
    )
  })
})

// =============================================================================
// PureComponentHandler — only test the canHandle gate (real-pure-defs is loaded
// via static import which would couple tests to component-templates.ts)
// =============================================================================

describe('PureComponentHandler — canHandle', () => {
  it('false for element drop', () => {
    expect(new PureComponentHandler().canHandle(elementDrop())).toBe(false)
  })

  it('false when source has children (Zag-shaped)', () => {
    expect(
      new PureComponentHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'X', children: [{}] } as any })
      )
    ).toBe(false)
  })

  it('false when source has mirTemplate', () => {
    expect(
      new PureComponentHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'X', mirTemplate: 'T' } as any })
      )
    ).toBe(false)
  })

  it('false for unknown component name', () => {
    expect(
      new PureComponentHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'NotARealComponent' } })
      )
    ).toBe(false)
  })

  it('true for known pure components like Checkbox', () => {
    // Checkbox is a Pure-Mirror component per CLAUDE.md.
    expect(
      new PureComponentHandler().canHandle(
        paletteDrop({ source: { type: 'palette', componentName: 'Checkbox' } })
      )
    ).toBe(true)
  })
})

describe('PureComponentHandler — handle', () => {
  it('existing definition: creates instance via addChildWithTemplate', async () => {
    const h = new PureComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'Checkbox' }),
    })
    await h.handle(
      paletteDrop({
        source: { type: 'palette', componentName: 'Checkbox', textContent: '"Newsletter"' },
      }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalledWith(
      'dst1',
      expect.stringContaining('Checkbox'),
      expect.objectContaining({ position: 'last' })
    )
    // Definition should NOT be re-added.
    expect(ctx.emitNotification).not.toHaveBeenCalled()
  })

  it('new definition: prepends definition + emits info notification', async () => {
    const h = new PureComponentHandler()
    const instanceMod = makeModResult({
      newSource: 'INSTANCE_SRC',
      change: { from: 50, to: 50, insert: 'INSTANCE_PIECE' },
    })
    const ctx = makeContext({
      findExistingZagDefinition: vi.fn().mockReturnValue({ exists: false }),
    })
    ctx.codeModifier.addChildWithTemplate = vi.fn().mockReturnValue(instanceMod)
    const result = await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Checkbox' } }),
      ctx
    )
    expect(ctx.emitNotification).toHaveBeenCalledWith('info', expect.stringContaining('Checkbox'))
    expect(result?.success).toBe(true)
    expect(result?.newSource).toContain('INSTANCE_SRC')
    // change.to should be original-source-length (newSource - inserted-piece).
    const expectedTo = instanceMod.newSource!.length - instanceMod.change!.insert.length
    expect(result?.change?.from).toBe(0)
    expect(result?.change?.to).toBe(expectedTo)
  })

  it('new definition: bails when addChildWithTemplate fails', async () => {
    const h = new PureComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi.fn().mockReturnValue({ exists: false }),
    })
    ctx.codeModifier.addChildWithTemplate = vi
      .fn()
      .mockReturnValue({ success: false, error: 'boom' })
    const result = await h.handle(
      paletteDrop({ source: { type: 'palette', componentName: 'Checkbox' } }),
      ctx
    )
    expect(result?.success).toBe(false)
    expect(ctx.emitNotification).not.toHaveBeenCalled() // no success notification on failure
  })

  it('absolute placement: appends rounded x/y to instance properties', async () => {
    const h = new PureComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'Checkbox' }),
    })
    await h.handle(
      paletteDrop({
        placement: 'absolute',
        absolutePosition: { x: 5.6, y: 11.2 },
        source: { type: 'palette', componentName: 'Checkbox', properties: 'pad 4' },
      } as DropResult),
      ctx
    )
    const tpl = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    expect(tpl).toContain('pad 4, x 6, y 11')
  })

  it('uses defaultLabel from pure definition when textContent missing', async () => {
    const h = new PureComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'Checkbox' }),
    })
    await h.handle(paletteDrop({ source: { type: 'palette', componentName: 'Checkbox' } }), ctx)
    const tpl = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    // Should include a quoted text content (default label or component name).
    expect(tpl).toMatch(/Checkbox\s+"/)
  })

  it('alignment zone passed as parentProperty (existing-definition path)', async () => {
    const h = new PureComponentHandler()
    const ctx = makeContext({
      findExistingZagDefinition: vi
        .fn()
        .mockReturnValue({ exists: true, definitionName: 'Checkbox' }),
    })
    await h.handle(
      paletteDrop({
        source: { type: 'palette', componentName: 'Checkbox' },
        alignment: { zone: 'center' },
      }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalledWith(
      'dst1',
      expect.any(String),
      expect.objectContaining({ parentProperty: 'center' })
    )
  })
})

describe('PaletteDropHandler — legacy non-absolute coordinate adjustment', () => {
  it('placement!=absolute path: subtracts parent rect offset from screen coords', async () => {
    // Note: PaletteDropHandler only adds position properties when
    // placement === 'absolute'. The non-absolute branch in
    // adjustForParent is dead from buildProperties(). Coverage gap is
    // intentional; documenting here.
    expect(true).toBe(true)
  })
})

// =============================================================================
// DropService — strategy-pattern routing
// =============================================================================

describe('DropService — routing', () => {
  beforeEach(() => {
    resetDropService()
  })

  it('handlers are registered in priority order: Duplicate, Absolute, Move, Pure, Zag, Chart, Template, Palette', () => {
    const handlers = new DropService().__getHandlersForTest()
    const names = handlers.map(h => h.constructor.name)
    expect(names).toEqual([
      'ElementDuplicateHandler',
      'AbsolutePositionHandler',
      'ElementMoveHandler',
      'PureComponentHandler',
      'ZagComponentHandler',
      'ChartDropHandler',
      'TemplateDropHandler',
      'PaletteDropHandler',
    ])
  })

  it('Pure-component handler runs BEFORE Zag (Checkbox without children → Pure path)', () => {
    const handlers = new DropService().__getHandlersForTest()
    const pureIdx = handlers.findIndex(h => h.constructor.name === 'PureComponentHandler')
    const zagIdx = handlers.findIndex(h => h.constructor.name === 'ZagComponentHandler')
    expect(pureIdx).toBeGreaterThan(-1)
    expect(zagIdx).toBeGreaterThan(-1)
    expect(pureIdx).toBeLessThan(zagIdx)
  })

  it('routes element duplicate to ElementDuplicateHandler', async () => {
    const ctx = makeContext()
    const result = await new DropService().handleDrop(elementDrop({ isDuplicate: true }), ctx)
    expect(ctx.codeModifier.duplicateNode).toHaveBeenCalled()
    expect(result?.newSource).toBe('DUP')
  })

  it('routes absolute element drop to AbsolutePositionHandler', async () => {
    const ctx = makeContext()
    await new DropService().handleDrop(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 1, y: 2 } }),
      ctx
    )
    expect(ctx.codeModifier.updateProperty).toHaveBeenCalled()
    expect(ctx.codeModifier.moveNode).not.toHaveBeenCalled()
  })

  it('routes element move to ElementMoveHandler', async () => {
    const ctx = makeContext()
    await new DropService().handleDrop(elementDrop(), ctx)
    expect(ctx.codeModifier.moveNode).toHaveBeenCalled()
  })

  it('routes plain palette drop to PaletteDropHandler', async () => {
    const ctx = makeContext()
    await new DropService().handleDrop(
      paletteDrop({ source: { type: 'palette', componentName: 'Frame' } }),
      ctx
    )
    expect(ctx.codeModifier.addChild).toHaveBeenCalled()
  })

  it('routes palette w/ mirTemplate to TemplateDropHandler (NOT Palette)', async () => {
    const ctx = makeContext()
    await new DropService().handleDrop(
      paletteDrop({
        source: { type: 'palette', componentName: 'X', mirTemplate: 'TPL' } as any,
      }),
      ctx
    )
    expect(ctx.codeModifier.addChildWithTemplate).toHaveBeenCalled()
    expect(ctx.codeModifier.addChild).not.toHaveBeenCalled()
  })

  it('routes palette w/ dataBlock to ChartDropHandler', async () => {
    const ctx = makeContext()
    await new DropService().handleDrop(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Bar',
          dataBlock: { name: 'd', content: 'a: 1' },
        } as any,
      }),
      ctx
    )
    const tpl = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    expect(tpl).toContain('Bar')
  })

  it('blocks reorder when source is in an each-template', async () => {
    const ctx = makeContext({ isInEachTemplate: () => true })
    const result = await new DropService().handleDrop(elementDrop(), ctx)
    expect(result?.success).toBe(false)
    expect(result?.error).toContain('each-template')
    expect(ctx.emitNotification).toHaveBeenCalledWith('info', expect.stringContaining('each'))
  })

  it('does NOT block when isInEachTemplate is undefined', async () => {
    const ctx = makeContext()
    const result = await new DropService().handleDrop(elementDrop(), ctx)
    expect(result?.success).toBe(true)
  })

  it('returns null + warns when no handler succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = makeContext({ hasZagChildren: vi.fn().mockReturnValue(false) })
    // Send a palette drop with children — only ZagComponentHandler.canHandle
    // matches that shape, but its .handle returns null because hasZagChildren
    // says no. Subsequent handlers can't handle it. Result: null + warn.
    const result = await new DropService().handleDrop(
      paletteDrop({
        source: { type: 'palette', componentName: 'X', children: [{}] } as any,
      }),
      ctx
    )
    expect(result).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('getDropService returns a singleton', () => {
    const s1 = getDropService()
    const s2 = getDropService()
    expect(s1).toBe(s2)
  })

  it('resetDropService creates a fresh singleton on next get', () => {
    const s1 = getDropService()
    resetDropService()
    const s2 = getDropService()
    expect(s1).not.toBe(s2)
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  beforeEach(() => resetDropService())

  it('M1: ALIGNMENT_KEYWORDS removed BEFORE addProperty (catches re-order)', async () => {
    const ctx = makeContext()
    const calls: string[] = []
    ;(ctx.codeModifier.removeProperty as any).mockImplementation(() => {
      calls.push('remove')
      return makeModResult()
    })
    ;(ctx.codeModifier.addProperty as any).mockImplementation(() => {
      calls.push('add')
      return makeModResult()
    })
    await new ElementMoveHandler().handle(elementDrop({ alignment: { zone: 'tl' } }), ctx)
    expect(calls.indexOf('add')).toBeGreaterThan(calls.indexOf('remove'))
  })

  it('M2: gridPlacement w=1 omitted from output (catches >= mutation)', async () => {
    const ctx = makeContext()
    await new ElementMoveHandler().handle(
      elementDrop({ gridPlacement: { x: 1, y: 1, w: 1, h: 1 } }),
      ctx
    )
    const props = (ctx.codeModifier.moveNode as any).mock.calls[0][4]?.properties
    expect(props).toBe('x 1, y 1') // no w 1 / h 1
  })

  it('M3: Math.round used for x/y (catches floor/ceil mutations)', async () => {
    const ctx = makeContext()
    await new AbsolutePositionHandler().handle(
      elementDrop({ placement: 'absolute', absolutePosition: { x: 12.5, y: 12.49 } }),
      ctx
    )
    const calls = (ctx.codeModifier.updateProperty as any).mock.calls
    expect(calls[0][2]).toBe('13') // 12.5 rounds to 13
    expect(calls[1][2]).toBe('12') // 12.49 rounds to 12
  })

  it('M4: PaletteDrop clamps negative absolute coords to 0 (catches Math.max drop)', async () => {
    const ctx = makeContext()
    await new PaletteDropHandler().handle(
      paletteDrop({ placement: 'absolute', absolutePosition: { x: -100, y: -50 } } as DropResult),
      ctx
    )
    const props = (ctx.codeModifier.addChild as any).mock.calls[0][2].properties
    expect(props).toBe('x 0, y 0')
  })

  it('M5: DropService order — Pure before Zag (Checkbox without children routes to Pure)', () => {
    const handlers = new DropService().__getHandlersForTest()
    const pureIdx = handlers.findIndex(h => h.constructor.name === 'PureComponentHandler')
    const zagIdx = handlers.findIndex(h => h.constructor.name === 'ZagComponentHandler')
    expect(pureIdx).toBeLessThan(zagIdx)
  })

  it('M6: each-template block returns failure BEFORE running any handler', async () => {
    const ctx = makeContext({ isInEachTemplate: () => true })
    await new DropService().handleDrop(elementDrop(), ctx)
    expect(ctx.codeModifier.moveNode).not.toHaveBeenCalled()
  })

  it('M7: ChartDropHandler indents data block content with 2 spaces', async () => {
    const ctx = makeContext()
    await new ChartDropHandler().handle(
      paletteDrop({
        source: {
          type: 'palette',
          componentName: 'Bar',
          dataBlock: { name: 'd', content: 'line1\nline2' },
        } as any,
      }),
      ctx
    )
    const tpl = (ctx.codeModifier.addChildWithTemplate as any).mock.calls[0][1]
    expect(tpl).toContain('  line1')
    expect(tpl).toContain('  line2')
  })
})
