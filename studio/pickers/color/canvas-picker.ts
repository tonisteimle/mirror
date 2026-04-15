/**
 * Canvas Color Picker - HSV-based color selection
 *
 * Provides a canvas-based color area (saturation/brightness),
 * hue slider, and alpha slider for custom color selection.
 */

import { hsvToRgb, rgbToHex, hexToHsv, hsvToHex, type HSV } from './palette'

export interface CanvasPickerState {
  h: number // Hue: 0-360
  s: number // Saturation: 0-100
  v: number // Value/Brightness: 0-100
  a: number // Alpha: 0-1
}

export interface CanvasPickerCallbacks {
  onColorChange?: (hex: string, alpha: number) => void
  onColorPreview?: (hex: string, alpha: number) => void
}

export interface CanvasPickerElements {
  container: HTMLElement
  canvas: HTMLCanvasElement
  hueSlider: HTMLElement
  hueThumb: HTMLElement
  alphaSlider: HTMLElement
  alphaThumb: HTMLElement
  hexInput: HTMLInputElement
  opacityInput: HTMLInputElement
  preview: HTMLElement
}

/**
 * Canvas Color Picker class
 */
export class CanvasColorPicker {
  private state: CanvasPickerState = { h: 0, s: 100, v: 100, a: 1 }
  private callbacks: CanvasPickerCallbacks
  private elements: CanvasPickerElements | null = null
  private isDraggingCanvas = false
  private isDraggingHue = false
  private isDraggingAlpha = false

  constructor(callbacks: CanvasPickerCallbacks = {}) {
    this.callbacks = callbacks
  }

  /**
   * Create the picker DOM elements
   */
  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'canvas-color-picker'

    // Color area canvas
    const canvas = document.createElement('canvas')
    canvas.className = 'canvas-color-picker-area'
    canvas.width = 236
    canvas.height = 140
    container.appendChild(canvas)

    // Hue slider row
    const hueRow = document.createElement('div')
    hueRow.className = 'canvas-color-picker-slider-row'

    const hueSlider = document.createElement('div')
    hueSlider.className = 'canvas-color-picker-hue-slider'
    const hueThumb = document.createElement('div')
    hueThumb.className = 'canvas-color-picker-slider-thumb'
    hueSlider.appendChild(hueThumb)
    hueRow.appendChild(hueSlider)
    container.appendChild(hueRow)

    // Alpha slider row
    const alphaRow = document.createElement('div')
    alphaRow.className = 'canvas-color-picker-slider-row'

    const alphaSlider = document.createElement('div')
    alphaSlider.className = 'canvas-color-picker-alpha-slider'
    const alphaThumb = document.createElement('div')
    alphaThumb.className = 'canvas-color-picker-slider-thumb'
    alphaSlider.appendChild(alphaThumb)
    alphaRow.appendChild(alphaSlider)
    container.appendChild(alphaRow)

    // Input row
    const inputRow = document.createElement('div')
    inputRow.className = 'canvas-color-picker-inputs'

    const hexInput = document.createElement('input')
    hexInput.type = 'text'
    hexInput.className = 'canvas-color-picker-hex-input'
    hexInput.placeholder = 'FFFFFF'
    hexInput.maxLength = 6

    const opacityInput = document.createElement('input')
    opacityInput.type = 'text'
    opacityInput.className = 'canvas-color-picker-opacity-input'
    opacityInput.value = '100%'

    inputRow.appendChild(hexInput)
    inputRow.appendChild(opacityInput)
    container.appendChild(inputRow)

    // Preview
    const preview = document.createElement('div')
    preview.className = 'canvas-color-picker-preview'
    container.appendChild(preview)

    // Store elements
    this.elements = {
      container,
      canvas,
      hueSlider,
      hueThumb,
      alphaSlider,
      alphaThumb,
      hexInput,
      opacityInput,
      preview,
    }

    // Setup event handlers
    this.setupEventHandlers()

    // Initial draw
    this.draw()

    return container
  }

  /**
   * Set the current color from hex
   */
  setColor(hex: string, alpha: number = 1): void {
    const hsv = hexToHsv(hex)
    this.state = { ...hsv, a: alpha }
    this.draw()
    this.updateInputs()
  }

  /**
   * Get the current color as hex
   */
  getColor(): string {
    return hsvToHex(this.state.h, this.state.s, this.state.v)
  }

  /**
   * Get alpha value
   */
  getAlpha(): number {
    return this.state.a
  }

  /**
   * Get the current state
   */
  getState(): CanvasPickerState {
    return { ...this.state }
  }

  /**
   * Destroy the picker
   */
  destroy(): void {
    this.removeEventHandlers()
    this.elements = null
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupEventHandlers(): void {
    if (!this.elements) return

    const { canvas, hueSlider, alphaSlider, hexInput, opacityInput } = this.elements

    // Canvas events
    canvas.addEventListener('mousedown', this.handleCanvasMouseDown)
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)

    // Hue slider events
    hueSlider.addEventListener('mousedown', this.handleHueMouseDown)

    // Alpha slider events
    alphaSlider.addEventListener('mousedown', this.handleAlphaMouseDown)

    // Input events
    hexInput.addEventListener('input', this.handleHexInput)
    hexInput.addEventListener('keydown', this.handleHexKeydown)
    opacityInput.addEventListener('input', this.handleOpacityInput)
  }

  private removeEventHandlers(): void {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
  }

  private handleCanvasMouseDown = (e: MouseEvent): void => {
    this.isDraggingCanvas = true
    this.updateFromCanvasPosition(e)
  }

  private handleHueMouseDown = (e: MouseEvent): void => {
    this.isDraggingHue = true
    this.updateFromHuePosition(e)
  }

  private handleAlphaMouseDown = (e: MouseEvent): void => {
    this.isDraggingAlpha = true
    this.updateFromAlphaPosition(e)
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isDraggingCanvas) this.updateFromCanvasPosition(e)
    if (this.isDraggingHue) this.updateFromHuePosition(e)
    if (this.isDraggingAlpha) this.updateFromAlphaPosition(e)
  }

  private handleMouseUp = (): void => {
    if (this.isDraggingCanvas || this.isDraggingHue || this.isDraggingAlpha) {
      this.callbacks.onColorChange?.(this.getColor(), this.state.a)
    }
    this.isDraggingCanvas = false
    this.isDraggingHue = false
    this.isDraggingAlpha = false
  }

  private handleHexInput = (): void => {
    if (!this.elements) return
    const value = this.elements.hexInput.value.replace('#', '')
    if (value.length === 6 && /^[0-9A-Fa-f]{6}$/.test(value)) {
      const hsv = hexToHsv('#' + value)
      this.state.h = hsv.h
      this.state.s = hsv.s
      this.state.v = hsv.v
      this.draw()
      this.callbacks.onColorPreview?.(this.getColor(), this.state.a)
    }
  }

  private handleHexKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.callbacks.onColorChange?.(this.getColor(), this.state.a)
    }
  }

  private handleOpacityInput = (): void => {
    if (!this.elements) return
    const value = this.elements.opacityInput.value.replace('%', '')
    const opacity = parseInt(value, 10)
    if (!isNaN(opacity)) {
      this.state.a = Math.max(0, Math.min(100, opacity)) / 100
      this.updateAlphaSlider()
      this.callbacks.onColorPreview?.(this.getColor(), this.state.a)
    }
  }

  private updateFromCanvasPosition(e: MouseEvent): void {
    if (!this.elements) return
    const rect = this.elements.canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

    this.state.s = (x / rect.width) * 100
    this.state.v = 100 - (y / rect.height) * 100

    this.draw()
    this.updateInputs()
    this.callbacks.onColorPreview?.(this.getColor(), this.state.a)
  }

  private updateFromHuePosition(e: MouseEvent): void {
    if (!this.elements) return
    const rect = this.elements.hueSlider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))

    this.state.h = (x / rect.width) * 360

    this.draw()
    this.updateInputs()
    this.callbacks.onColorPreview?.(this.getColor(), this.state.a)
  }

  private updateFromAlphaPosition(e: MouseEvent): void {
    if (!this.elements) return
    const rect = this.elements.alphaSlider.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))

    this.state.a = x / rect.width

    this.updateAlphaSlider()
    this.updateInputs()
    this.callbacks.onColorPreview?.(this.getColor(), this.state.a)
  }

  private draw(): void {
    this.drawColorArea()
    this.updateHueSlider()
    this.updateAlphaSlider()
    this.updatePreview()
  }

  private drawColorArea(): void {
    if (!this.elements) return
    const canvas = this.elements.canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Base hue color
    const hueRgb = hsvToRgb(this.state.h, 100, 100)
    ctx.fillStyle = `rgb(${hueRgb.r}, ${hueRgb.g}, ${hueRgb.b})`
    ctx.fillRect(0, 0, width, height)

    // White gradient (left to right)
    const whiteGrad = ctx.createLinearGradient(0, 0, width, 0)
    whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = whiteGrad
    ctx.fillRect(0, 0, width, height)

    // Black gradient (top to bottom)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, height)
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
    blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.fillStyle = blackGrad
    ctx.fillRect(0, 0, width, height)

    // Draw cursor
    const cursorX = (this.state.s / 100) * width
    const cursorY = (1 - this.state.v / 100) * height

    ctx.beginPath()
    ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  private updateHueSlider(): void {
    if (!this.elements) return
    const percent = (this.state.h / 360) * 100
    this.elements.hueThumb.style.left = `${percent}%`
  }

  private updateAlphaSlider(): void {
    if (!this.elements) return
    const hex = this.getColor()
    this.elements.alphaSlider.style.backgroundImage = `
      linear-gradient(to right, transparent, ${hex}),
      repeating-conic-gradient(#404040 0% 25%, #606060 0% 50%)
    `
    this.elements.alphaThumb.style.left = `${this.state.a * 100}%`
  }

  private updatePreview(): void {
    if (!this.elements) return
    const hex = this.getColor()
    this.elements.preview.style.backgroundColor = hex
    this.elements.preview.style.opacity = String(this.state.a)
  }

  private updateInputs(): void {
    if (!this.elements) return
    const hex = this.getColor()
    this.elements.hexInput.value = hex.replace('#', '')
    this.elements.opacityInput.value = Math.round(this.state.a * 100) + '%'
  }
}

/**
 * Factory function to create a canvas picker
 */
export function createCanvasColorPicker(callbacks: CanvasPickerCallbacks = {}): CanvasColorPicker {
  return new CanvasColorPicker(callbacks)
}
