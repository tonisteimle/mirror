/**
 * Animation Emitter Module
 *
 * Animation registration code emission.
 */

import type { IRAnimation, IRAnimationKeyframe, IRAnimationProperty } from '../../ir/types'

// ============================================
// TYPES
// ============================================

export interface AnimationEmitterContext {
  emit: (line: string) => void
  indentIn: () => void
  indentOut: () => void
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Emit animation registrations
 */
export function emitAnimations(ctx: AnimationEmitterContext, animations: IRAnimation[]): void {
  if (animations.length === 0) return

  ctx.emit('// Register animations')
  for (const animation of animations) {
    emitAnimationRegistration(ctx, animation)
  }
  ctx.emit('')
}

// ============================================
// ANIMATION REGISTRATION
// ============================================

function emitAnimationRegistration(ctx: AnimationEmitterContext, animation: IRAnimation): void {
  ctx.emit(`_runtime.registerAnimation({`)
  ctx.indentIn()
  emitAnimationMetadata(ctx, animation)
  emitKeyframes(ctx, animation.keyframes)
  ctx.indentOut()
  ctx.emit(`})`)
}

function emitAnimationMetadata(ctx: AnimationEmitterContext, animation: IRAnimation): void {
  ctx.emit(`name: "${animation.name}",`)
  ctx.emit(`easing: "${animation.easing}",`)
  emitDuration(ctx, animation.duration)
  emitRoles(ctx, animation.roles)
}

function emitDuration(ctx: AnimationEmitterContext, duration: number | undefined): void {
  if (duration !== undefined) {
    ctx.emit(`duration: ${duration},`)
  }
}

function emitRoles(ctx: AnimationEmitterContext, roles: string[] | undefined): void {
  if (roles && roles.length > 0) {
    ctx.emit(`roles: ${JSON.stringify(roles)},`)
  }
}

// ============================================
// KEYFRAMES
// ============================================

function emitKeyframes(ctx: AnimationEmitterContext, keyframes: IRAnimationKeyframe[]): void {
  ctx.emit(`keyframes: [`)
  ctx.indentIn()
  for (const keyframe of keyframes) {
    emitKeyframe(ctx, keyframe)
  }
  ctx.indentOut()
  ctx.emit(`],`)
}

function emitKeyframe(ctx: AnimationEmitterContext, keyframe: IRAnimationKeyframe): void {
  ctx.emit(`{`)
  ctx.indentIn()
  ctx.emit(`time: ${keyframe.time},`)
  emitKeyframeProperties(ctx, keyframe.properties)
  ctx.indentOut()
  ctx.emit(`},`)
}

function emitKeyframeProperties(
  ctx: AnimationEmitterContext,
  properties: IRAnimationProperty[]
): void {
  ctx.emit(`properties: [`)
  ctx.indentIn()
  for (const prop of properties) {
    emitKeyframeProperty(ctx, prop)
  }
  ctx.indentOut()
  ctx.emit(`],`)
}

function emitKeyframeProperty(ctx: AnimationEmitterContext, prop: IRAnimationProperty): void {
  const targetPart = prop.target ? `, target: "${prop.target}"` : ''
  ctx.emit(`{ property: "${prop.property}", value: "${prop.value}"${targetPart} },`)
}
