/**
 * Animation Trigger - Editor Trigger for Animation Picker
 *
 * Triggers the AnimationPicker when editing animation components.
 * Uses the new TriggerManager system.
 */

import type { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { AnimationPicker, createAnimationPicker, type AnimationPreset } from '../../pickers'
import type { TriggerConfig, TriggerContext } from './types'
import { getTriggerManager } from '../trigger-manager'

export const ANIMATION_TRIGGER_ID = 'animation'

// Context pattern for animation trigger
// Matches: "as animation" at end of line
const ANIMATION_CONTEXT_PATTERN = /\s+as\s+animation\s*$/i

// State for animation picker
interface AnimationTriggerState {
  picker: AnimationPicker | null
  currentData: AnimationData | null
}

export interface AnimationData {
  name: string
  easing: string
  duration: number
  delay?: number
  loop?: boolean
  reverse?: boolean
  tracks: AnimationTrack[]
}

export interface AnimationTrack {
  property: string
  startTime: number
  endTime: number
  fromValue: number | string
  toValue: number | string
}

let animationState: AnimationTriggerState = {
  picker: null,
  currentData: null,
}

/**
 * Parse animation data from line content
 */
export function parseAnimationFromLine(lineText: string): AnimationData | null {
  // Match: Name as animation [props]
  const match = lineText.match(/^\s*([A-Z][a-zA-Z0-9]*)\s+as\s+animation(?:\s+(.*))?$/i)
  if (!match) return null

  const name = match[1]
  const propsString = match[2] || ''

  // Default animation data
  const data: AnimationData = {
    name,
    easing: 'ease-out',
    duration: 0.3,
    tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
  }

  // Parse properties if present
  if (propsString) {
    // Parse duration (e.g., "0.5s" or "500ms")
    const durationMatch = propsString.match(/(\d+\.?\d*)(s|ms)/i)
    if (durationMatch) {
      const value = parseFloat(durationMatch[1])
      data.duration = durationMatch[2].toLowerCase() === 'ms' ? value / 1000 : value
    }

    // Parse easing (order matters: -in-out before -in/-out)
    const easingMatch = propsString.match(/ease(?:-in-out|-in|-out)?|linear/i)
    if (easingMatch) {
      data.easing = easingMatch[0].toLowerCase()
    }

    // Parse delay
    const delayMatch = propsString.match(/delay\s+(\d+\.?\d*)(s|ms)?/i)
    if (delayMatch) {
      const value = parseFloat(delayMatch[1])
      data.delay = delayMatch[2]?.toLowerCase() === 'ms' ? value / 1000 : value
    }

    // Check for loop
    if (/\bloop\b/i.test(propsString)) {
      data.loop = true
    }

    // Check for reverse
    if (/\breverse\b/i.test(propsString)) {
      data.reverse = true
    }
  }

  return data
}

/**
 * Generate DSL code from animation data
 */
export function generateAnimationDSL(data: AnimationData): string {
  const parts: string[] = [data.name, 'as', 'animation']

  // Add duration
  if (data.duration !== 0.3) {
    parts.push(`${data.duration}s`)
  }

  // Add easing
  if (data.easing !== 'ease-out') {
    parts.push(data.easing)
  }

  // Add delay
  if (data.delay && data.delay > 0) {
    parts.push(`delay ${data.delay}s`)
  }

  // Add loop
  if (data.loop) {
    parts.push('loop')
  }

  // Add reverse
  if (data.reverse) {
    parts.push('reverse')
  }

  return parts.join(' ')
}

/**
 * Create the animation trigger configuration
 * Triggers on double-click of existing animation definitions
 */
export function createAnimationTriggerConfig(): TriggerConfig {
  return {
    id: ANIMATION_TRIGGER_ID,
    trigger: {
      type: 'doubleClick',
      // Match lines containing "as animation"
      pattern: /^.*\s+as\s+animation.*$/i,
    },
    picker: () => {
      animationState.picker = createAnimationPicker(
        {
          showPreview: true,
        },
        {
          onSelect: () => {}, // Will be overridden
        }
      )

      return animationState.picker
    },
    onSelect: (value: string, context: TriggerContext, view: EditorView) => {
      // Value is the preset name from the picker
      // Get the preset and update animation data
      if (value && animationState.currentData) {
        // Update the animation name with the selected preset
        animationState.currentData.name = value
        const dsl = generateAnimationDSL(animationState.currentData)
        insertAnimation(dsl, context, view)
      } else if (animationState.currentData) {
        // Fallback: use current data as-is
        const dsl = generateAnimationDSL(animationState.currentData)
        insertAnimation(dsl, context, view)
      }
    },
    keyboard: {
      orientation: 'vertical',
    },
    priority: 60,
    // Parse existing animation when triggered
    shouldActivate: (update: ViewUpdate, insertedText: string, context: TriggerContext) => {
      // Parse the line to extract current animation data
      const parsed = parseAnimationFromLine(context.line.text)
      if (parsed) {
        animationState.currentData = parsed
        return true
      }
      return false
    },
  }
}

/**
 * Insert animation DSL into the editor
 */
function insertAnimation(dsl: string, context: TriggerContext, view: EditorView): void {
  const from = context.replaceRange?.from ?? context.line.from
  const to = context.replaceRange?.to ?? context.line.to
  view.dispatch({
    changes: { from, to, insert: dsl },
    selection: { anchor: from + dsl.length },
    annotations: Transaction.userEvent.of('input.animation'),
  })
  view.focus()
}

/**
 * Show the animation picker for a specific line
 */
export function showAnimationPicker(lineText: string, lineStart: number, view: EditorView): void {
  const manager = getTriggerManager()
  const coords = view.coordsAtPos(lineStart)
  if (!coords) return

  // Parse existing animation data
  animationState.currentData = parseAnimationFromLine(lineText) || {
    name: 'FadeUp',
    easing: 'ease-out',
    duration: 0.3,
    tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
  }

  manager.showPicker(ANIMATION_TRIGGER_ID, coords.left, coords.bottom + 4, lineStart, view, {
    replaceRange: { from: lineStart, to: lineStart + lineText.length },
    existingValue: lineText,
  })
}

/**
 * Update animation data
 */
export function updateAnimationData(data: Partial<AnimationData>): void {
  if (animationState.currentData) {
    animationState.currentData = { ...animationState.currentData, ...data }
  }
}

/**
 * Get current animation data
 */
export function getAnimationData(): AnimationData | null {
  return animationState.currentData
}

/**
 * Set animation data
 */
export function setAnimationData(data: AnimationData): void {
  animationState.currentData = data
}

/**
 * Add a track to the current animation
 */
export function addAnimationTrack(track: AnimationTrack): void {
  if (animationState.currentData) {
    animationState.currentData.tracks.push(track)
  }
}

/**
 * Remove a track from the current animation
 */
export function removeAnimationTrack(index: number): void {
  if (animationState.currentData && animationState.currentData.tracks.length > 1) {
    animationState.currentData.tracks.splice(index, 1)
  }
}

/**
 * Update a track in the current animation
 */
export function updateAnimationTrack(index: number, track: Partial<AnimationTrack>): void {
  if (animationState.currentData && animationState.currentData.tracks[index]) {
    animationState.currentData.tracks[index] = {
      ...animationState.currentData.tracks[index],
      ...track,
    }
  }
}

/**
 * Register the animation trigger with the global trigger manager
 */
export function registerAnimationTrigger(): void {
  const manager = getTriggerManager()
  manager.register(createAnimationTriggerConfig())
}

/**
 * Unregister the animation trigger
 */
export function unregisterAnimationTrigger(): void {
  const manager = getTriggerManager()
  manager.unregister(ANIMATION_TRIGGER_ID)
  animationState = { picker: null, currentData: null }
}
