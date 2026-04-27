/**
 * Step-Runner — undo/redo round-trip use case.
 *
 * Three property changes are applied in sequence, then undone one by
 * one (verifying the source rewinds correctly each time), then redone
 * (verifying the source replays). Exercises the executor's command-
 * stack across mixed input pathways (panel + code).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const undoRedoRoundTrip: Scenario = {
  name: 'three property changes round-trip cleanly through undo and redo',
  category: 'step-runner',
  setup: 'Frame w 100, h 100, bg #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },

    // Three changes via panel — each pushes a separate undo entry.
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'bg',
      value: '#2271c1',
      comment: 'change 1: bg blue',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'pad',
      value: '24',
      comment: 'change 2: add padding',
      expect: { props: { 'node-1': { pad: '24', bg: '#2271c1' } } },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'rad',
      value: '12',
      comment: 'change 3: add radius',
      expect: { props: { 'node-1': { rad: '12', pad: '24', bg: '#2271c1' } } },
    },

    // Undo three times — each step rewinds one change.
    {
      do: 'undo',
      comment: 'undo: rad gone',
      expect: { props: { 'node-1': { pad: '24', bg: '#2271c1' } } },
    },
    {
      do: 'undo',
      comment: 'undo: pad gone',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
    {
      do: 'undo',
      comment: 'undo: back to original bg',
      expect: { props: { 'node-1': { bg: '#888888' } } },
    },

    // Redo three times — each step replays one change.
    {
      do: 'redo',
      comment: 'redo: bg blue back',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
    {
      do: 'redo',
      comment: 'redo: pad back',
      expect: { props: { 'node-1': { pad: '24', bg: '#2271c1' } } },
    },
    {
      do: 'redo',
      comment: 'redo: rad back, full state restored',
      expect: { props: { 'node-1': { rad: '12', pad: '24', bg: '#2271c1' } } },
    },
  ],
}

export const useCaseUndoRedoScenarios: Scenario[] = [undoRedoRoundTrip]
export const useCaseUndoRedoStepRunnerTests: TestCase[] =
  useCaseUndoRedoScenarios.map(scenarioToTestCase)
