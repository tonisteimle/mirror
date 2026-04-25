/**
 * B2 smoke-test — aiPrompt + expectCodeMatches with mock fixtures.
 *
 * Run with:
 *   npx tsx tools/test.ts \
 *     --demo=tools/test-runner/demo/scripts/_b2-smoke.ts \
 *     --ai-mock=tools/test-runner/demo/fixtures/ai-card.json \
 *     --pacing=instant
 */

import type { DemoScript } from '../types'
import { resetCanvas } from '../fragments/setup'

export const demoScript: DemoScript = {
  name: 'B2 Smoke',
  description: 'AI draft-mode + mock fixtures',
  config: { speed: 'fast', showKeystrokeOverlay: false },
  steps: [
    ...resetCanvas(),

    // User types a prompt that the mock should resolve
    {
      action: 'aiPrompt',
      prompt: 'card mit titel und button',
      comment: 'Mocked AI generates a card',
      expectCodeMatches: { pattern: /H1 "Willkommen"/ },
    },

    // Verify the canvas Frame plus the AI-generated children are present
    {
      action: 'expectCodeMatches',
      comment: 'card+button present',
      pattern: /H1 "Willkommen"[\s\S]+Button "Loslegen"/,
    },
  ],
}

export default demoScript
