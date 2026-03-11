/**
 * Animation Presets
 */

export interface AnimationPreset {
  name: string
  label: string
  category: string
  keyframes: string
  duration: string
  easing: string
  description?: string
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // Fade
  {
    name: 'fade-in',
    label: 'Fade In',
    category: 'fade',
    keyframes: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
    duration: '0.3s',
    easing: 'ease-out',
  },
  {
    name: 'fade-out',
    label: 'Fade Out',
    category: 'fade',
    keyframes: '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }',
    duration: '0.3s',
    easing: 'ease-in',
  },
  {
    name: 'fade-in-up',
    label: 'Fade In Up',
    category: 'fade',
    keyframes: '@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }',
    duration: '0.4s',
    easing: 'ease-out',
  },
  {
    name: 'fade-in-down',
    label: 'Fade In Down',
    category: 'fade',
    keyframes: '@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }',
    duration: '0.4s',
    easing: 'ease-out',
  },

  // Slide
  {
    name: 'slide-in-left',
    label: 'Slide In Left',
    category: 'slide',
    keyframes: '@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }',
    duration: '0.3s',
    easing: 'ease-out',
  },
  {
    name: 'slide-in-right',
    label: 'Slide In Right',
    category: 'slide',
    keyframes: '@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }',
    duration: '0.3s',
    easing: 'ease-out',
  },
  {
    name: 'slide-in-up',
    label: 'Slide In Up',
    category: 'slide',
    keyframes: '@keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }',
    duration: '0.3s',
    easing: 'ease-out',
  },
  {
    name: 'slide-in-down',
    label: 'Slide In Down',
    category: 'slide',
    keyframes: '@keyframes slideInDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }',
    duration: '0.3s',
    easing: 'ease-out',
  },

  // Scale
  {
    name: 'scale-in',
    label: 'Scale In',
    category: 'scale',
    keyframes: '@keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }',
    duration: '0.3s',
    easing: 'ease-out',
  },
  {
    name: 'scale-out',
    label: 'Scale Out',
    category: 'scale',
    keyframes: '@keyframes scaleOut { from { transform: scale(1); } to { transform: scale(0); } }',
    duration: '0.3s',
    easing: 'ease-in',
  },
  {
    name: 'pop',
    label: 'Pop',
    category: 'scale',
    keyframes: '@keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }',
    duration: '0.4s',
    easing: 'ease-out',
  },

  // Bounce
  {
    name: 'bounce',
    label: 'Bounce',
    category: 'bounce',
    keyframes: '@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }',
    duration: '0.8s',
    easing: 'ease-out',
  },
  {
    name: 'bounce-in',
    label: 'Bounce In',
    category: 'bounce',
    keyframes: '@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }',
    duration: '0.6s',
    easing: 'ease-out',
  },

  // Rotate
  {
    name: 'rotate-in',
    label: 'Rotate In',
    category: 'rotate',
    keyframes: '@keyframes rotateIn { from { transform: rotate(-180deg); opacity: 0; } to { transform: rotate(0); opacity: 1; } }',
    duration: '0.4s',
    easing: 'ease-out',
  },
  {
    name: 'spin',
    label: 'Spin',
    category: 'rotate',
    keyframes: '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
    duration: '1s',
    easing: 'linear',
  },

  // Attention
  {
    name: 'shake',
    label: 'Shake',
    category: 'attention',
    keyframes: '@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }',
    duration: '0.5s',
    easing: 'ease-in-out',
  },
  {
    name: 'pulse',
    label: 'Pulse',
    category: 'attention',
    keyframes: '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }',
    duration: '0.5s',
    easing: 'ease-in-out',
  },
  {
    name: 'wobble',
    label: 'Wobble',
    category: 'attention',
    keyframes: '@keyframes wobble { 0% { transform: translateX(0); } 15% { transform: translateX(-10px) rotate(-5deg); } 30% { transform: translateX(8px) rotate(3deg); } 45% { transform: translateX(-6px) rotate(-3deg); } 60% { transform: translateX(4px) rotate(2deg); } 75% { transform: translateX(-2px) rotate(-1deg); } 100% { transform: translateX(0); } }',
    duration: '0.8s',
    easing: 'ease-in-out',
  },
  {
    name: 'heartbeat',
    label: 'Heartbeat',
    category: 'attention',
    keyframes: '@keyframes heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }',
    duration: '1s',
    easing: 'ease-in-out',
  },
]

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): AnimationPreset[] {
  return ANIMATION_PRESETS.filter(p => p.category === category)
}

/**
 * Get all categories
 */
export function getAnimationCategories(): string[] {
  return [...new Set(ANIMATION_PRESETS.map(p => p.category))]
}

/**
 * Get preset by name
 */
export function getPreset(name: string): AnimationPreset | null {
  return ANIMATION_PRESETS.find(p => p.name === name) || null
}
