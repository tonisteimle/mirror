/**
 * Animation Picker Dialog
 *
 * Timeline-based animation editor for Mirror Studio.
 * Provides visual editing of animation definitions with:
 * - Play/pause/scrub controls
 * - Timeline with draggable keyframe bars
 * - Easing presets and custom bezier curves
 * - From/To value editing
 * - Options: delay, loop, reverse
 */

export interface AnimationPickerOptions {
  container: HTMLElement
  onUpdate?: (animation: AnimationData) => void
  onClose?: () => void
}

export interface AnimationData {
  name: string
  easing: string
  duration: number
  tracks: AnimationTrack[]
  delay?: number
  loop?: boolean
  reverse?: boolean
}

export interface AnimationTrack {
  property: string
  startTime: number
  endTime: number
  fromValue: string | number
  toValue: string | number
  easing?: string
}

const EASING_PRESETS = [
  { name: 'linear', value: 'linear' },
  { name: 'ease', value: 'ease' },
  { name: 'ease-in', value: 'ease-in' },
  { name: 'ease-out', value: 'ease-out' },
  { name: 'ease-in-out', value: 'ease-in-out' },
  { name: 'spring', value: 'spring(100, 10)' },
]

const EASING_CURVES: Record<string, string> = {
  'linear': 'M 0 36 L 36 0',
  'ease': 'M 0 36 C 9 36, 25 0, 36 0',
  'ease-in': 'M 0 36 C 16 36, 30 12, 36 0',
  'ease-out': 'M 0 36 C 0 24, 25 0, 36 0',
  'ease-in-out': 'M 0 36 C 16 36, 20 0, 36 0',
  'spring(100, 10)': 'M 0 36 C 0 -8, 20 0, 36 0',
}

export class AnimationPicker {
  private container: HTMLElement
  private dialog: HTMLElement | null = null
  private options: AnimationPickerOptions
  private data: AnimationData
  private isPlaying = false
  private currentTime = 0
  private animationFrame: number | null = null
  private selectedTrackIndex = 0

  constructor(options: AnimationPickerOptions) {
    this.options = options
    this.container = options.container
    this.data = {
      name: 'FadeUp',
      easing: 'ease-out',
      duration: 0.3,
      tracks: [
        { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
        { property: 'y-offset', startTime: 0, endTime: 0.2, fromValue: 20, toValue: 0 },
      ],
    }
  }

  /**
   * Open the animation picker dialog
   */
  open(animation?: AnimationData): void {
    if (animation) {
      this.data = { ...animation }
    }
    this.render()
    this.setupEventListeners()
    this.updateUI(0)
  }

  /**
   * Close the dialog
   */
  close(): void {
    this.pause()
    if (this.dialog) {
      this.dialog.remove()
      this.dialog = null
    }
    this.options.onClose?.()
  }

  /**
   * Load animation data from AST/IR
   */
  loadFromIR(animation: {
    name: string
    easing: string
    duration?: number
    keyframes: { time: number; properties: { property: string; value: string }[] }[]
  }): void {
    const tracks: AnimationTrack[] = []

    // Group keyframes by property
    const propertyKeyframes: Record<string, { time: number; value: string }[]> = {}

    for (const kf of animation.keyframes) {
      for (const prop of kf.properties) {
        if (!propertyKeyframes[prop.property]) {
          propertyKeyframes[prop.property] = []
        }
        propertyKeyframes[prop.property].push({ time: kf.time, value: prop.value })
      }
    }

    // Convert to tracks
    for (const [property, keyframes] of Object.entries(propertyKeyframes)) {
      if (keyframes.length >= 2) {
        const sorted = keyframes.sort((a, b) => a.time - b.time)
        tracks.push({
          property,
          startTime: sorted[0].time,
          endTime: sorted[sorted.length - 1].time,
          fromValue: this.parseValue(sorted[0].value),
          toValue: this.parseValue(sorted[sorted.length - 1].value),
        })
      }
    }

    this.data = {
      name: animation.name,
      easing: animation.easing,
      duration: animation.duration || Math.max(...tracks.map(t => t.endTime)) || 0.3,
      tracks,
    }
  }

  private parseValue(value: string): string | number {
    // Extract numeric value from CSS values like "translateY(20px)" or "0.5"
    const numMatch = value.match(/[-\d.]+/)
    if (numMatch) {
      const num = parseFloat(numMatch[0])
      if (!isNaN(num)) return num
    }
    return value
  }

  /**
   * Export to DSL format
   */
  toDSL(): string {
    const lines: string[] = []
    lines.push(`${this.data.name} as animation: ${this.data.easing}`)

    // Group all unique times
    const times = new Set<number>()
    for (const track of this.data.tracks) {
      times.add(track.startTime)
      times.add(track.endTime)
    }

    const sortedTimes = Array.from(times).sort((a, b) => a - b)

    for (const time of sortedTimes) {
      const props: string[] = []

      for (const track of this.data.tracks) {
        if (track.startTime === time) {
          props.push(`${track.property} ${track.fromValue}`)
        } else if (track.endTime === time) {
          props.push(`${track.property} ${track.toValue}`)
        }
      }

      if (props.length > 0) {
        lines.push(`  ${time.toFixed(2)} ${props.join(', ')}`)
      }
    }

    return lines.join('\n')
  }

  private render(): void {
    this.dialog = document.createElement('div')
    this.dialog.className = 'animation-picker-dialog'
    this.dialog.innerHTML = `
      <div class="ap-header">
        <div class="ap-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <input type="text" class="ap-name-input" value="${this.data.name}">
          <span class="ap-subtitle">as animation</span>
        </div>
        <div class="ap-actions">
          <button class="ap-btn ap-btn-secondary" data-action="cancel">Cancel</button>
          <button class="ap-btn ap-btn-primary" data-action="done">Done</button>
        </div>
      </div>

      <div class="ap-body">
        <!-- Playback Controls -->
        <div class="ap-playback">
          <button class="ap-play-btn" data-action="play">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>
          </button>
          <div class="ap-scrubber">
            <div class="ap-scrubber-progress"></div>
            <div class="ap-scrubber-handle"></div>
          </div>
          <div class="ap-time-display">
            <span class="ap-current-time">0.00</span>s
          </div>
        </div>

        <!-- Timeline -->
        <div class="ap-timeline">
          <div class="ap-timeline-ruler">
            <div class="ap-ruler-marks"></div>
          </div>
          <div class="ap-timeline-tracks">
            <div class="ap-playhead"></div>
            ${this.data.tracks.map((track, i) => this.renderTrack(track, i)).join('')}
          </div>
          <button class="ap-add-track" data-action="add-track">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add property
          </button>
        </div>

        <!-- Easing Section -->
        <div class="ap-section">
          <div class="ap-section-label">Easing <span class="ap-selected-track">(${this.data.tracks[this.selectedTrackIndex]?.property || ''})</span></div>
          <div class="ap-easing-row">
            <div class="ap-easing-presets">
              ${EASING_PRESETS.map(e => `
                <button class="ap-easing-btn ${e.value === this.data.easing ? 'active' : ''}" data-easing="${e.value}">${e.name}</button>
              `).join('')}
            </div>
            <div class="ap-curve-preview">
              <svg viewBox="0 0 36 36">
                <path d="${EASING_CURVES[this.data.easing] || EASING_CURVES['ease-out']}"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Values Section -->
        <div class="ap-section">
          <div class="ap-section-label">Values <span class="ap-selected-track">(${this.data.tracks[this.selectedTrackIndex]?.property || ''})</span></div>
          <div class="ap-values-grid">
            <span class="ap-value-label">From</span>
            <input type="text" class="ap-value-input" data-field="from" value="${this.data.tracks[this.selectedTrackIndex]?.fromValue ?? ''}">
            <span class="ap-value-label">To</span>
            <input type="text" class="ap-value-input" data-field="to" value="${this.data.tracks[this.selectedTrackIndex]?.toValue ?? ''}">
          </div>
        </div>

        <!-- Options Row -->
        <div class="ap-options-row">
          <div class="ap-option-group">
            <span class="ap-option-label">Delay</span>
            <input type="text" class="ap-option-input" data-field="delay" value="${this.data.delay || 0}">
            <span class="ap-option-label">s</span>
          </div>
          <label class="ap-option-checkbox">
            <input type="checkbox" data-field="loop" ${this.data.loop ? 'checked' : ''}>
            Loop
          </label>
          <label class="ap-option-checkbox">
            <input type="checkbox" data-field="reverse" ${this.data.reverse ? 'checked' : ''}>
            Reverse
          </label>
        </div>
      </div>
    `

    this.container.appendChild(this.dialog)
    this.updateRuler()
    this.injectStyles()
  }

  private renderTrack(track: AnimationTrack, index: number): string {
    const startPercent = (track.startTime / this.data.duration) * 100
    const widthPercent = ((track.endTime - track.startTime) / this.data.duration) * 100

    return `
      <div class="ap-timeline-track" data-track-index="${index}">
        <div class="ap-track-label">${track.property}</div>
        <div class="ap-track-content">
          <div class="ap-keyframe-bar ${index === this.selectedTrackIndex ? 'selected' : ''}"
               style="left: ${startPercent}%; width: ${widthPercent}%;"
               data-track-index="${index}">
            <div class="ap-keyframe-handle start"></div>
            <div class="ap-keyframe-handle end"></div>
          </div>
        </div>
      </div>
    `
  }

  private updateRuler(): void {
    const rulerMarks = this.dialog?.querySelector('.ap-ruler-marks')
    if (!rulerMarks) return

    const marks: string[] = []
    const steps = 4
    for (let i = 0; i <= steps; i++) {
      const time = (i / steps) * this.data.duration
      const percent = (i / steps) * 100
      marks.push(`<div class="ap-ruler-mark" style="left: ${percent}%"><span>${time.toFixed(2)}</span></div>`)
    }
    rulerMarks.innerHTML = marks.join('')
  }

  private setupEventListeners(): void {
    if (!this.dialog) return

    // Button actions
    this.dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const action = target.closest('[data-action]')?.getAttribute('data-action')

      switch (action) {
        case 'play':
          this.togglePlay()
          break
        case 'cancel':
          this.close()
          break
        case 'done':
          this.options.onUpdate?.(this.data)
          this.close()
          break
        case 'add-track':
          this.addTrack()
          break
      }
    })

    // Easing preset buttons
    this.dialog.querySelectorAll('.ap-easing-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const easing = btn.getAttribute('data-easing')
        if (easing) {
          this.data.easing = easing
          this.updateEasingUI()
        }
      })
    })

    // Track selection
    this.dialog.querySelectorAll('.ap-keyframe-bar').forEach(bar => {
      bar.addEventListener('click', (e) => {
        e.stopPropagation()
        const index = parseInt(bar.getAttribute('data-track-index') || '0')
        this.selectTrack(index)
      })
    })

    // Scrubber interaction
    const scrubber = this.dialog.querySelector('.ap-scrubber')
    if (scrubber) {
      scrubber.addEventListener('mousedown', (e) => {
        this.pause()
        this.handleScrub(e as MouseEvent, scrubber as HTMLElement)
      })
    }

    // Value inputs
    this.dialog.querySelectorAll('.ap-value-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const field = target.getAttribute('data-field')
        const track = this.data.tracks[this.selectedTrackIndex]
        if (track && field) {
          if (field === 'from') {
            track.fromValue = this.parseInputValue(target.value)
          } else if (field === 'to') {
            track.toValue = this.parseInputValue(target.value)
          }
        }
      })
    })

    // Option inputs
    this.dialog.querySelectorAll('.ap-option-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const field = target.getAttribute('data-field')
        if (field === 'delay') {
          this.data.delay = parseFloat(target.value) || 0
        }
      })
    })

    this.dialog.querySelectorAll('.ap-option-checkbox input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        const field = target.getAttribute('data-field')
        if (field === 'loop') {
          this.data.loop = target.checked
        } else if (field === 'reverse') {
          this.data.reverse = target.checked
        }
      })
    })

    // Name input
    const nameInput = this.dialog.querySelector('.ap-name-input') as HTMLInputElement
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        this.data.name = nameInput.value
      })
    }
  }

  private parseInputValue(value: string): string | number {
    const num = parseFloat(value)
    return isNaN(num) ? value : num
  }

  private handleScrub(e: MouseEvent, scrubber: HTMLElement): void {
    const rect = scrubber.getBoundingClientRect()

    const updateScrub = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      this.currentTime = x
      this.updateUI(this.currentTime)
    }

    updateScrub(e)

    const onMove = (e: MouseEvent) => updateScrub(e)
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  private play(): void {
    if (this.isPlaying) return
    this.isPlaying = true

    const playBtn = this.dialog?.querySelector('.ap-play-btn')
    if (playBtn) {
      playBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/></svg>'
    }

    const startTime = performance.now() - (this.currentTime * this.data.duration * 1000)

    const animate = (now: number) => {
      if (!this.isPlaying) return

      this.currentTime = ((now - startTime) / 1000) / this.data.duration

      if (this.currentTime >= 1) {
        if (this.data.loop) {
          this.currentTime = 0
        } else {
          this.currentTime = 1
          this.pause()
          return
        }
      }

      this.updateUI(this.currentTime)
      this.animationFrame = requestAnimationFrame(animate)
    }

    this.animationFrame = requestAnimationFrame(animate)
  }

  private pause(): void {
    this.isPlaying = false

    const playBtn = this.dialog?.querySelector('.ap-play-btn')
    if (playBtn) {
      playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>'
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  private updateUI(progress: number): void {
    const percent = progress * 100

    // Update scrubber
    const scrubberProgress = this.dialog?.querySelector('.ap-scrubber-progress') as HTMLElement
    const scrubberHandle = this.dialog?.querySelector('.ap-scrubber-handle') as HTMLElement
    if (scrubberProgress) scrubberProgress.style.width = `${percent}%`
    if (scrubberHandle) scrubberHandle.style.left = `${percent}%`

    // Update playhead
    const playhead = this.dialog?.querySelector('.ap-playhead') as HTMLElement
    const trackContent = this.dialog?.querySelector('.ap-track-content') as HTMLElement
    if (playhead && trackContent) {
      const trackWidth = trackContent.offsetWidth
      playhead.style.left = `${72 + (percent / 100) * trackWidth}px`
    }

    // Update time display
    const currentTimeEl = this.dialog?.querySelector('.ap-current-time')
    if (currentTimeEl) {
      currentTimeEl.textContent = (progress * this.data.duration).toFixed(2)
    }
  }

  private selectTrack(index: number): void {
    this.selectedTrackIndex = index

    // Update bar selection
    this.dialog?.querySelectorAll('.ap-keyframe-bar').forEach((bar, i) => {
      bar.classList.toggle('selected', i === index)
    })

    // Update section labels
    const track = this.data.tracks[index]
    this.dialog?.querySelectorAll('.ap-selected-track').forEach(el => {
      el.textContent = `(${track?.property || ''})`
    })

    // Update value inputs
    const fromInput = this.dialog?.querySelector('.ap-value-input[data-field="from"]') as HTMLInputElement
    const toInput = this.dialog?.querySelector('.ap-value-input[data-field="to"]') as HTMLInputElement
    if (fromInput && track) fromInput.value = String(track.fromValue)
    if (toInput && track) toInput.value = String(track.toValue)
  }

  private updateEasingUI(): void {
    // Update active button
    this.dialog?.querySelectorAll('.ap-easing-btn').forEach(btn => {
      const easing = btn.getAttribute('data-easing')
      btn.classList.toggle('active', easing === this.data.easing)
    })

    // Update curve preview
    const curvePath = this.dialog?.querySelector('.ap-curve-preview path')
    if (curvePath) {
      curvePath.setAttribute('d', EASING_CURVES[this.data.easing] || EASING_CURVES['ease-out'])
    }
  }

  private addTrack(): void {
    // Show property picker or add default
    const newTrack: AnimationTrack = {
      property: 'scale',
      startTime: 0,
      endTime: this.data.duration,
      fromValue: 1,
      toValue: 1.1,
    }

    this.data.tracks.push(newTrack)

    // Re-render tracks
    const tracksContainer = this.dialog?.querySelector('.ap-timeline-tracks')
    if (tracksContainer) {
      const playhead = tracksContainer.querySelector('.ap-playhead')
      const newTrackHtml = this.renderTrack(newTrack, this.data.tracks.length - 1)
      const template = document.createElement('template')
      template.innerHTML = newTrackHtml.trim()
      const newTrackElement = template.content.firstChild as HTMLElement

      // Add click handler
      newTrackElement.querySelector('.ap-keyframe-bar')?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.selectTrack(this.data.tracks.length - 1)
      })

      if (playhead) {
        tracksContainer.insertBefore(newTrackElement, playhead.nextSibling?.nextSibling || null)
      } else {
        tracksContainer.appendChild(newTrackElement)
      }
    }
  }

  private injectStyles(): void {
    if (document.getElementById('animation-picker-styles')) return

    const style = document.createElement('style')
    style.id = 'animation-picker-styles'
    style.textContent = `
      .animation-picker-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1f;
        border: 1px solid #333;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        width: 520px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e4e4e7;
        font-size: 12px;
      }

      .ap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #222228;
        border-bottom: 1px solid #333;
        border-radius: 8px 8px 0 0;
      }

      .ap-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }

      .ap-name-input {
        background: transparent;
        border: none;
        color: #e4e4e7;
        font-size: 12px;
        font-weight: 600;
        width: 120px;
        padding: 2px 4px;
      }

      .ap-name-input:focus {
        outline: none;
        background: #27272a;
        border-radius: 3px;
      }

      .ap-subtitle {
        color: #555;
        font-weight: 400;
      }

      .ap-actions {
        display: flex;
        gap: 6px;
      }

      .ap-btn {
        padding: 5px 10px;
        font-size: 11px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        transition: all 0.15s;
      }

      .ap-btn-secondary {
        background: #333;
        color: #999;
      }

      .ap-btn-secondary:hover {
        background: #444;
        color: #fff;
      }

      .ap-btn-primary {
        background: #3B82F6;
        color: #fff;
      }

      .ap-btn-primary:hover {
        background: #2563EB;
      }

      .ap-body {
        padding: 12px;
      }

      .ap-playback {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .ap-play-btn {
        width: 28px;
        height: 28px;
        background: #3B82F6;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
        flex-shrink: 0;
      }

      .ap-play-btn:hover {
        background: #2563EB;
      }

      .ap-play-btn svg {
        width: 14px;
        height: 14px;
      }

      .ap-scrubber {
        flex: 1;
        height: 6px;
        background: #27272a;
        border-radius: 3px;
        position: relative;
        cursor: pointer;
      }

      .ap-scrubber-progress {
        height: 100%;
        background: #3B82F6;
        border-radius: 3px;
        width: 0%;
      }

      .ap-scrubber-handle {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: grab;
        left: 0%;
      }

      .ap-time-display {
        font-size: 11px;
        font-family: 'SF Mono', monospace;
        color: #666;
        min-width: 50px;
        text-align: right;
      }

      .ap-timeline {
        background: #111115;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 12px;
      }

      .ap-timeline-ruler {
        height: 20px;
        background: #1a1a1f;
        border-bottom: 1px solid #27272a;
        position: relative;
        display: flex;
        padding-left: 72px;
      }

      .ap-ruler-marks {
        flex: 1;
        position: relative;
      }

      .ap-ruler-mark {
        position: absolute;
        top: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translateX(-50%);
      }

      .ap-ruler-mark span {
        font-size: 9px;
        color: #555;
        margin-top: 3px;
      }

      .ap-ruler-mark::after {
        content: '';
        width: 1px;
        flex: 1;
        background: #333;
      }

      .ap-timeline-tracks {
        position: relative;
      }

      .ap-timeline-track {
        display: flex;
        height: 28px;
        border-bottom: 1px solid #1f1f24;
      }

      .ap-timeline-track:last-child {
        border-bottom: none;
      }

      .ap-track-label {
        width: 72px;
        padding: 0 8px;
        font-size: 11px;
        color: #666;
        display: flex;
        align-items: center;
        background: #1a1a1f;
        border-right: 1px solid #27272a;
        flex-shrink: 0;
      }

      .ap-track-content {
        flex: 1;
        position: relative;
        background: #111115;
      }

      .ap-keyframe-bar {
        position: absolute;
        top: 5px;
        height: 18px;
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        border-radius: 3px;
        cursor: pointer;
        display: flex;
        align-items: center;
        min-width: 16px;
      }

      .ap-keyframe-bar:hover {
        filter: brightness(1.1);
      }

      .ap-keyframe-bar.selected {
        box-shadow: 0 0 0 2px #fff;
      }

      .ap-keyframe-handle {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 2px;
        cursor: ew-resize;
        opacity: 0;
        transition: opacity 0.15s;
      }

      .ap-keyframe-bar:hover .ap-keyframe-handle,
      .ap-keyframe-bar.selected .ap-keyframe-handle {
        opacity: 1;
      }

      .ap-keyframe-handle.start {
        left: -4px;
      }

      .ap-keyframe-handle.end {
        right: -4px;
      }

      .ap-playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ef4444;
        z-index: 10;
        pointer-events: none;
        left: 72px;
      }

      .ap-playhead::before {
        content: '';
        position: absolute;
        top: -3px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid #ef4444;
      }

      .ap-add-track {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        font-size: 11px;
        color: #555;
        background: transparent;
        border: none;
        border-top: 1px solid #27272a;
        cursor: pointer;
        width: 100%;
        transition: all 0.15s;
      }

      .ap-add-track:hover {
        color: #888;
        background: rgba(255,255,255,0.02);
      }

      .ap-add-track svg {
        width: 12px;
        height: 12px;
      }

      .ap-section {
        margin-bottom: 12px;
      }

      .ap-section:last-child {
        margin-bottom: 0;
      }

      .ap-section-label {
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .ap-selected-track {
        font-weight: normal;
        text-transform: none;
      }

      .ap-easing-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ap-easing-presets {
        display: flex;
        gap: 3px;
        flex-wrap: wrap;
        flex: 1;
      }

      .ap-easing-btn {
        padding: 4px 8px;
        font-size: 10px;
        color: #888;
        background: #27272a;
        border: 1px solid #333;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .ap-easing-btn:hover {
        color: #fff;
        border-color: #444;
      }

      .ap-easing-btn.active {
        background: #3B82F6;
        border-color: #3B82F6;
        color: #fff;
      }

      .ap-curve-preview {
        width: 48px;
        height: 48px;
        background: #27272a;
        border-radius: 4px;
        position: relative;
        flex-shrink: 0;
      }

      .ap-curve-preview svg {
        position: absolute;
        inset: 6px;
        width: calc(100% - 12px);
        height: calc(100% - 12px);
      }

      .ap-curve-preview path {
        fill: none;
        stroke: #3B82F6;
        stroke-width: 2;
      }

      .ap-values-grid {
        display: grid;
        grid-template-columns: auto 1fr auto 1fr;
        gap: 6px 8px;
        align-items: center;
      }

      .ap-value-label {
        font-size: 10px;
        color: #555;
      }

      .ap-value-input {
        padding: 4px 6px;
        font-size: 11px;
        font-family: 'SF Mono', monospace;
        background: #27272a;
        border: 1px solid #333;
        border-radius: 4px;
        color: #e4e4e7;
        width: 100%;
      }

      .ap-value-input:focus {
        outline: none;
        border-color: #3B82F6;
      }

      .ap-options-row {
        display: flex;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid #27272a;
      }

      .ap-option-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ap-option-label {
        font-size: 10px;
        color: #555;
      }

      .ap-option-input {
        width: 50px;
        padding: 4px 6px;
        font-size: 11px;
        font-family: 'SF Mono', monospace;
        background: #27272a;
        border: 1px solid #333;
        border-radius: 4px;
        color: #e4e4e7;
      }

      .ap-option-input:focus {
        outline: none;
        border-color: #3B82F6;
      }

      .ap-option-checkbox {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        color: #666;
        cursor: pointer;
      }

      .ap-option-checkbox input {
        accent-color: #3B82F6;
      }
    `
    document.head.appendChild(style)
  }
}

export default AnimationPicker
