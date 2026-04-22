/**
 * Create Button Demo
 *
 * Shows how to create a styled button in Mirror.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Create a Styled Button',
  description: 'Step-by-step guide to creating a beautiful button',
  config: {
    speed: 'slow',
    showKeystrokeOverlay: true,
  },
  steps: [
    // Introduction
    { action: 'wait', duration: 1500, comment: 'Starting state' },
    { action: 'comment', text: 'Let\'s create a styled button' },

    // Focus editor
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'click' },
    { action: 'wait', duration: 300 },

    // Clear existing content (Cmd+A, then type)
    { action: 'pressKey', key: 'a', modifiers: ['Meta'] },
    { action: 'wait', duration: 200 },

    // Type the button code
    { action: 'comment', text: 'Type the button element' },
    { action: 'type', text: 'Button "Save Changes"' },
    { action: 'wait', duration: 800 },

    // Add background color
    { action: 'comment', text: 'Add a blue background' },
    { action: 'type', text: ', bg #2271C1' },
    { action: 'wait', duration: 800 },

    // Add text color
    { action: 'comment', text: 'Make the text white' },
    { action: 'type', text: ', col white' },
    { action: 'wait', duration: 800 },

    // Add padding
    { action: 'comment', text: 'Add some padding' },
    { action: 'type', text: ', pad 12 24' },
    { action: 'wait', duration: 800 },

    // Add border radius
    { action: 'comment', text: 'Round the corners' },
    { action: 'type', text: ', rad 6' },
    { action: 'wait', duration: 1000 },

    // Highlight the result
    { action: 'comment', text: 'Here\'s our finished button!' },
    { action: 'moveTo', target: '#preview [data-mirror-id]' },
    { action: 'wait', duration: 500 },
    { action: 'highlight', target: '#preview [data-mirror-id]', duration: 2000 },

    // Final pause
    { action: 'wait', duration: 1000 },
  ],
}

export default demoScript
