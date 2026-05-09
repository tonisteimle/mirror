/**
 * Unit tests für `findSketchBlocks`.
 *
 * Vier erlaubte Sketch-Varianten:
 *   1) Block:       `--\n inhalt \n--`               (kind 'block')
 *   2) Single-line: `-- inhalt`                       (kind 'single')
 *   3) Inline-Start: `-- inhalt\n weiter \n--`       (kind 'block')
 *   4) Trailing:    `code -- inhalt`                  (kind 'trailing')
 *
 * Plus diverse Edge-Cases: keine Marker, unverschlossen, eingerückt,
 * `--` in Strings, mehrere Sketches in einem File, Mix der Varianten.
 *
 * Pure-Funktion → keine Bridge / kein Studio nötig, läuft in <1s.
 */

import { describe, it, expect } from 'vitest'
import { findSketchBlocks, hasSketchBlock } from '../../studio/agent/sketch-blocks'

describe('findSketchBlocks · variant 1 (block)', () => {
  it('detects a single block sketch', () => {
    const src = 'Frame\n  --\n  card mit titel\n  --\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'block',
      startLine: 2,
      endLine: 4,
      text: '  card mit titel',
    })
  })

  it('handles indented block markers', () => {
    const src = 'canvas\nFrame pad 24\n  Text "ok"\n  --\n  card here\n  multi line\n  --\n'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'block',
      startLine: 4,
      endLine: 7,
      text: '  card here\n  multi line',
    })
  })

  it('handles two consecutive block sketches', () => {
    const src = '--\nfirst\n--\nText\n--\nsecond\n--'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('first')
    expect(blocks[1].text).toBe('second')
  })

  it('preserves char offsets in source', () => {
    const src = 'Frame\n--\nfoo\n--'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    // 'Frame\n' = 6 chars → block starts at 6
    expect(blocks[0].from).toBe(6)
    // Block ends at end of last line (position is start of '--' + length)
    expect(src.slice(blocks[0].from, blocks[0].to)).toBe('--\nfoo\n--')
  })
})

describe('findSketchBlocks · variant 2 (single-line)', () => {
  it('detects a single-line sketch', () => {
    const src = 'Frame\n  -- füge ein dropdown ein\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'single',
      startLine: 2,
      endLine: 2,
      text: 'füge ein dropdown ein',
    })
  })

  it('strips leading/trailing whitespace from inline content', () => {
    const src = 'Frame\n  --   eine card mit titel  \nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('eine card mit titel')
  })

  it('respects the line boundary — next line is NOT part of the sketch', () => {
    const src = 'Frame\n  -- erste sketch zeile\nText "ist normaler code"'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('erste sketch zeile')
    expect(blocks[0].endLine).toBe(2)
  })

  it('two single-line sketches in a row', () => {
    const src = '  -- erste\n  -- zweite\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('erste')
    expect(blocks[1].text).toBe('zweite')
  })
})

describe('findSketchBlocks · variant 3 (inline-start with block)', () => {
  it('detects open-with-content + close-marker as one block', () => {
    const src = 'Frame\n  -- füge ein dropdown ein\n  muss berlin als default haben\n  --\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'block',
      startLine: 2,
      endLine: 4,
      text: 'füge ein dropdown ein\n  muss berlin als default haben',
    })
  })

  it('inline-content from open marker becomes first content row', () => {
    const src = '-- start text\nzweite zeile\ndritte zeile\n--'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('start text\nzweite zeile\ndritte zeile')
  })
})

describe('findSketchBlocks · negatives', () => {
  it('returns empty for source without `--`', () => {
    const src = 'Frame pad 24\n  Text "hello"\n  Button "ok"'
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('does NOT match `--` inside a string literal', () => {
    const src = 'Text "hier ist -- mitten drin"\nButton "x -- y"'
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('ignores an unclosed plain block (no inline content, no closer)', () => {
    const src = 'Frame\n  --\n  card mit titel\nText "x"'
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('treats `--` followed by code-looking text as a sketch (single-line)', () => {
    // Even if the user writes Mirror-looking text after `--`, the
    // detector treats it as sketch content — the user committed to the
    // marker convention by typing `--`.
    const src = '  -- Button "Save", bg #2271C1'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('Button "Save", bg #2271C1')
  })
})

describe('findSketchBlocks · mixed scenarios', () => {
  it('handles block + single-line in same file', () => {
    const src = '--\nblock content\n--\nText\n  -- single sketch'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('block content')
    expect(blocks[1].text).toBe('single sketch')
  })

  it('handles inline-start block + later single-line', () => {
    const src = '-- a\nb\n--\n\n-- standalone'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text).toBe('a\nb')
    expect(blocks[1].text).toBe('standalone')
  })
})

describe('findSketchBlocks · variant 4 (trailing)', () => {
  it('detects a trailing sketch on the same line as code', () => {
    const src = 'Frame\n  Button "Speichern", bg #2271C1 -- mach rot\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'trailing',
      startLine: 2,
      endLine: 2,
      text: 'mach rot',
    })
  })

  it('trailing.from points at the `--` token, not the line start', () => {
    const src = 'Button "X" -- mach rot'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    // 'Button "X" ' = 11 chars → '--' begins at offset 11
    expect(blocks[0].from).toBe(11)
    expect(src.slice(blocks[0].from, blocks[0].to)).toBe('-- mach rot')
  })

  it('ignores `--` inside a string literal', () => {
    const src = 'Text "He said -- yes"\nButton "x -- y"'
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('still detects a real trailing after a string with `--`', () => {
    const src = 'Frame\n  Text "Hallo -- Welt" -- mach fett\nButton'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      kind: 'trailing',
      text: 'mach fett',
    })
  })

  it('ignores empty trailing markers (`code --` with nothing after)', () => {
    const src = 'Button "x" -- '
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('strips whitespace around the trailing instruction', () => {
    const src = 'Button "x" --   mach groß  '
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('mach groß')
  })

  it('does NOT classify `code--text` (no whitespace before `--`) as trailing', () => {
    const src = 'Button "x"--mach rot'
    expect(findSketchBlocks(src)).toEqual([])
  })

  it('coexists with a block sketch in the same file', () => {
    const src = '  --\n  card\n  --\n\n  Button "x" -- mach blau'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].kind).toBe('block')
    expect(blocks[1].kind).toBe('trailing')
    expect(blocks[1].text).toBe('mach blau')
  })

  it('multiple trailing sketches on different lines', () => {
    const src = 'Button "a" -- mach rot\nButton "b" -- mach grün\nText'
    const blocks = findSketchBlocks(src)
    expect(blocks).toHaveLength(2)
    expect(blocks.every(b => b.kind === 'trailing')).toBe(true)
    expect(blocks[0].text).toBe('mach rot')
    expect(blocks[1].text).toBe('mach grün')
  })
})

describe('findSketchBlocks · trailing subtree (targetEndLine)', () => {
  it('leaf element: subtree-end equals startLine', () => {
    const src = 'Frame\n  Button "x" -- mach rot\n  Text "sibling"'
    const [b] = findSketchBlocks(src)
    expect(b.kind).toBe('trailing')
    expect(b.startLine).toBe(2)
    expect(b.targetEndLine).toBe(2)
  })

  it('element with children: subtree includes all indented children', () => {
    const src = 'Frame pad 24 -- mach rot\n  Text "hi"\n  Button "x"\nText "sibling"'
    const [b] = findSketchBlocks(src)
    expect(b.targetEndLine).toBe(3) // Frame + 2 children
  })

  it('subtree stops at the next sibling at same indent level', () => {
    const src = 'Frame\n  Frame -- mach rot\n    Text "a"\n    Text "b"\n  Text "sibling"'
    const [b] = findSketchBlocks(src)
    expect(b.startLine).toBe(2)
    expect(b.targetEndLine).toBe(4) // inner Frame + its 2 deeply-indented children
  })

  it('blank lines inside the subtree do NOT terminate it', () => {
    const src = 'Frame -- mach rot\n\n  Text "a"\nText "sibling"'
    const [b] = findSketchBlocks(src)
    expect(b.targetEndLine).toBe(3) // blank line at L2 is part of the subtree
  })

  it('subtree extends to file end if no later sibling exists', () => {
    const src = 'Frame -- mach rot\n  Text "only child"'
    const [b] = findSketchBlocks(src)
    expect(b.targetEndLine).toBe(2)
  })

  it('deeply nested children all belong to the subtree', () => {
    const src = 'Frame -- mach rot\n  Frame\n    Frame\n      Text "deep"\nText "sibling"'
    const [b] = findSketchBlocks(src)
    expect(b.targetEndLine).toBe(4)
  })

  it('block/single sketches do NOT carry targetEndLine', () => {
    const blockSrc = '--\nfoo\n--'
    const singleSrc = '-- single line'
    const [block] = findSketchBlocks(blockSrc)
    const [single] = findSketchBlocks(singleSrc)
    expect(block.targetEndLine).toBeUndefined()
    expect(single.targetEndLine).toBeUndefined()
  })
})

describe('hasSketchBlock', () => {
  it('returns true when at least one sketch exists', () => {
    expect(hasSketchBlock('--\nfoo\n--')).toBe(true)
    expect(hasSketchBlock('-- single line')).toBe(true)
    expect(hasSketchBlock('Button "x" -- mach rot')).toBe(true)
  })

  it('returns false when no sketch exists', () => {
    expect(hasSketchBlock('Frame pad 24')).toBe(false)
    expect(hasSketchBlock('')).toBe(false)
  })
})
