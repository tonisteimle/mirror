/**
 * Unit tests für `findSketchBlocks`.
 *
 * Drei erlaubte Sketch-Varianten:
 *   1) Block:       `--\n inhalt \n--`
 *   2) Single-line: `-- inhalt`
 *   3) Inline-Start: `-- inhalt\n weiter \n--`
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

describe('hasSketchBlock', () => {
  it('returns true when at least one sketch exists', () => {
    expect(hasSketchBlock('--\nfoo\n--')).toBe(true)
    expect(hasSketchBlock('-- single line')).toBe(true)
  })

  it('returns false when no sketch exists', () => {
    expect(hasSketchBlock('Frame pad 24')).toBe(false)
    expect(hasSketchBlock('')).toBe(false)
  })
})
