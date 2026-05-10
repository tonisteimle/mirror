/**
 * Single-card-from-empty smoke scenario.
 *
 * The simplest end-to-end exercise of the Step-Runner: start with an
 * empty editor, write a complete one-file Mirror project (Card
 * definition with Title/Body slots, plus one Card use), and verify
 * that the source, DOM, and selection state all align.
 *
 * Used as a sanity check that:
 *   - editorSet on an empty starting source loads cleanly
 *   - component definitions + slot uses round-trip through compile
 *   - structural selectors (byText) find the rendered slot content
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const CARD_CODE =
  'Card: bg #1a1a1a, pad 16, rad 8, gap 8\n' +
  '  Title: col white, fs 18, weight 500\n' +
  '  Body: col #888, fs 14\n' +
  '\n' +
  'Card\n' +
  '  Title "Mein Titel"\n' +
  '  Body "Ein kurzer Text"\n'

const cardFromEmpty: Scenario = {
  name: 'Card with Title + Body, built in one write from empty source',
  category: 'step-runner-headed',
  setup: '',
  steps: [
    {
      do: 'editorSet',
      code: CARD_CODE,
      expect: {
        // Source landed verbatim.
        code: CARD_CODE,
      },
    },
    {
      // Confirm the title node is rendered and selectable via its text.
      do: 'click',
      nodeId: { byText: 'Mein Titel' },
      expect: {
        // Selection lands on the Title slot's rendered element. We don't
        // pin a specific node-id here because the Card-definition + use
        // composition assigns ids that depend on slot expansion order;
        // selectionNot guards against accidental no-op or stale-state.
        selectionNot: '',
      },
    },
    {
      do: 'click',
      nodeId: { byText: 'Ein kurzer Text' },
      expect: {
        selectionNot: '',
      },
    },
  ],
}

export const cardFromEmptyScenarios: Scenario[] = [cardFromEmpty]
export const cardFromEmptyStepRunnerTests: TestCase[] =
  cardFromEmptyScenarios.map(scenarioToTestCase)
