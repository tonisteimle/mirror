/**
 * Zag Media 020: Avatar, FileUpload, Carousel, etc. kaputt machen
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Zag Media', () => {

  // ============================================================
  // 1. Avatar
  // ============================================================
  describe('Avatar', () => {

    test('Avatar wird erkannt', () => {
      const ir = toIR(parse(`Avatar`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Avatar node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('avatar')
    })

    test('Avatar Slots', () => {
      const ir = toIR(parse(`Avatar`))
      const slots = ir.nodes[0]?.slots
      console.log('Avatar slots:', Object.keys(slots || {}))
      expect(slots?.Image).toBeDefined()
      expect(slots?.Fallback).toBeDefined()
    })

  })

  // ============================================================
  // 2. FileUpload
  // ============================================================
  describe('FileUpload', () => {

    test('FileUpload wird erkannt', () => {
      const ir = toIR(parse(`FileUpload`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('FileUpload node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('fileupload')
    })

    test('FileUpload Slots', () => {
      const ir = toIR(parse(`FileUpload`))
      const slots = ir.nodes[0]?.slots
      console.log('FileUpload slots:', Object.keys(slots || {}))
      expect(slots?.Dropzone).toBeDefined()
      expect(slots?.Trigger).toBeDefined()
    })

  })

  // ============================================================
  // 3. Carousel
  // ============================================================
  describe('Carousel', () => {

    test('Carousel wird erkannt', () => {
      const ir = toIR(parse(`Carousel`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Carousel node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('carousel')
    })

    test('Carousel Slots', () => {
      const ir = toIR(parse(`Carousel`))
      const slots = ir.nodes[0]?.slots
      console.log('Carousel slots:', Object.keys(slots || {}))
      expect(slots?.ItemGroup).toBeDefined()
      expect(slots?.Item).toBeDefined()
    })

  })

  // ============================================================
  // 4. Progress
  // ============================================================
  describe('Progress', () => {

    test('Progress wird erkannt', () => {
      const ir = toIR(parse(`Progress`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Progress node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('progress')
    })

    test('CircularProgress wird erkannt', () => {
      const ir = toIR(parse(`CircularProgress`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('CircularProgress node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('circularprogress')
    })

  })

  // ============================================================
  // 5. Utility
  // ============================================================
  describe('Utility', () => {

    test('Clipboard wird erkannt', () => {
      const ir = toIR(parse(`Clipboard`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Clipboard node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('clipboard')
    })

    test('QRCode wird erkannt', () => {
      const ir = toIR(parse(`QRCode`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('QRCode node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('qrcode')
    })

    test('ScrollArea wird erkannt', () => {
      const ir = toIR(parse(`ScrollArea`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('ScrollArea node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('scrollarea')
    })

    test('Splitter wird erkannt', () => {
      const ir = toIR(parse(`Splitter`))
      expect(ir.nodes.length).toBeGreaterThan(0)
      console.log('Splitter node:', ir.nodes[0]?.tag, ir.nodes[0]?.zagType)
      expect(ir.nodes[0]?.zagType).toBe('splitter')
    })

  })

  // ============================================================
  // 6. Kombinationen
  // ============================================================
  describe('Kombinationen', () => {

    test('Media-Elemente in Frame', () => {
      const ir = toIR(parse(`
Frame ver gap 10
  Avatar
  Progress
  FileUpload
`))
      const frame = ir.nodes[0]
      expect(frame?.children?.length).toBe(3)
    })

  })

})
