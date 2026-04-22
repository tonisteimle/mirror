/**
 * Example Demo Script
 *
 * Demonstrates basic demo functionality in Mirror Studio.
 */

import type { DemoScript } from '../types'

export const demoScript: DemoScript = {
  name: 'Mirror Studio Introduction',
  description: 'A quick tour of Mirror Studio features',
  config: {
    speed: 'normal',
    showKeystrokeOverlay: true,
  },
  steps: [
    // Initial setup
    { action: 'wait', duration: 1000, comment: 'Show initial state' },

    // Move to code editor
    { action: 'comment', text: 'Highlight the code editor' },
    { action: 'moveTo', target: '.cm-editor' },
    { action: 'wait', duration: 500 },

    // Click in editor
    { action: 'click', target: '.cm-editor' },
    { action: 'wait', duration: 300 },

    // Type some code
    { action: 'comment', text: 'Type a simple Frame element' },
    { action: 'type', text: 'Frame bg #2271C1, pad 16, rad 8' },
    { action: 'pressKey', key: 'Enter' },
    { action: 'type', text: '  Text "Hello World", col white' },

    // Wait to see the result
    { action: 'wait', duration: 1500, comment: 'Show the compiled result' },

    // Move to preview
    { action: 'comment', text: 'Click on the element in preview' },
    { action: 'moveTo', target: '#preview [data-mirror-id="node-1"]' },
    { action: 'click' },
    { action: 'wait', duration: 1000 },

    // Highlight property panel
    { action: 'highlight', target: '#property-panel', duration: 1500 },

    // Final pause
    { action: 'wait', duration: 1000, comment: 'End of demo' },
  ],
}

export default demoScript
