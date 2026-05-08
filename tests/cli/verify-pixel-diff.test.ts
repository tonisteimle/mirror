import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Jimp } from 'jimp'
import { pixelDiff } from '../../tools/verify'

let tmpDir: string

async function makePng(
  outPath: string,
  size: number,
  fill: { r: number; g: number; b: number; a?: number }
): Promise<void> {
  const img = new Jimp({ width: size, height: size, color: 0 })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      img.setPixelColor(
        (((fill.r & 0xff) << 24) |
          ((fill.g & 0xff) << 16) |
          ((fill.b & 0xff) << 8) |
          (fill.a ?? 0xff)) >>>
          0,
        x,
        y
      )
    }
  }
  await img.write(outPath as `${string}.png`)
}

async function makeSplitPng(
  outPath: string,
  size: number,
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
  splitFraction: number
): Promise<void> {
  const splitX = Math.round(size * splitFraction)
  const img = new Jimp({ width: size, height: size, color: 0 })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = x < splitX ? left : right
      img.setPixelColor(
        (((c.r & 0xff) << 24) | ((c.g & 0xff) << 16) | ((c.b & 0xff) << 8) | 0xff) >>> 0,
        x,
        y
      )
    }
  }
  await img.write(outPath as `${string}.png`)
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-verify-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('pixelDiff — diff math', () => {
  it('reports 100% match for identical images', async () => {
    const a = path.join(tmpDir, 'a.png')
    const b = path.join(tmpDir, 'b.png')
    const diff = path.join(tmpDir, 'diff.png')
    await makePng(a, 50, { r: 255, g: 0, b: 0 })
    await makePng(b, 50, { r: 255, g: 0, b: 0 })

    const result = await pixelDiff(a, b, diff)
    expect(result.match).toBeCloseTo(1, 3)
    expect(result.diffPixels).toBe(0)
    expect(result.totalPixels).toBe(2500)
    expect(fs.existsSync(diff)).toBe(true)
  })

  it('reports 0% match for fully different images', async () => {
    const a = path.join(tmpDir, 'a.png')
    const b = path.join(tmpDir, 'b.png')
    const diff = path.join(tmpDir, 'diff.png')
    await makePng(a, 50, { r: 0, g: 0, b: 0 })
    await makePng(b, 50, { r: 255, g: 255, b: 255 })

    const result = await pixelDiff(a, b, diff)
    expect(result.match).toBeLessThan(0.05)
    expect(result.diffPixels).toBeGreaterThan(2400)
  })

  it('reports ~50% match for half-different image', async () => {
    const a = path.join(tmpDir, 'a.png')
    const b = path.join(tmpDir, 'b.png')
    const diff = path.join(tmpDir, 'diff.png')
    await makePng(a, 100, { r: 0, g: 0, b: 0 })
    await makeSplitPng(b, 100, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0.5)

    const result = await pixelDiff(a, b, diff)
    expect(result.match).toBeGreaterThan(0.45)
    expect(result.match).toBeLessThan(0.55)
  })

  it('clips to common rect when image sizes differ', async () => {
    const a = path.join(tmpDir, 'a.png')
    const b = path.join(tmpDir, 'b.png')
    const diff = path.join(tmpDir, 'diff.png')
    // a is 100×100 red, b is 50×50 red — should match on the overlap
    await makePng(a, 100, { r: 200, g: 50, b: 50 })
    await makePng(b, 50, { r: 200, g: 50, b: 50 })

    const result = await pixelDiff(a, b, diff)
    expect(result.match).toBeCloseTo(1, 2)
    expect(result.totalPixels).toBe(2500) // 50×50 common rect
  })

  it('writes diff image even when match is perfect', async () => {
    const a = path.join(tmpDir, 'a.png')
    const b = path.join(tmpDir, 'b.png')
    const diff = path.join(tmpDir, 'diff.png')
    await makePng(a, 30, { r: 100, g: 100, b: 100 })
    await makePng(b, 30, { r: 100, g: 100, b: 100 })
    await pixelDiff(a, b, diff)
    expect(fs.statSync(diff).size).toBeGreaterThan(0)
  })
})
