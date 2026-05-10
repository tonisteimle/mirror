/**
 * Demos — barrel export.
 *
 * Demo tests are NOT suite tests. They use the OS-mouse bridge (real
 * macOS cursor + nut-js) so a screen recording captures actual cursor
 * motion. Pacing is tutorial-friendly (preHold/dwell/settle pauses).
 *
 * Run individually with --os-mouse, never as part of `--all`.
 */

import type { TestCase } from '../../types'
import { demoTextIntoFrame } from './01-text-into-frame.demo'
import { tutorial01 } from './tut-01-drop-sync.demo'
import { tutorial02 } from './tut-02-inline-edit.demo'
import { tutorial03 } from './tut-03-resize.demo'
import { tutorial04 } from './tut-04-padding-margin.demo'
import { tutorial05 } from './tut-05-property-panel.demo'
import { tutorial06 } from './tut-06-reorder.demo'
import { tutorial07 } from './tut-07-code-edit.demo'
import { tutorial08 } from './tut-08-multi-file.demo'
import { stateHoverFocus } from './state-hover-focus.demo'
import { stateToggle } from './state-toggle.demo'
import { stateCrossElement } from './state-cross-element.demo'
import { visualSnap } from './visual-snap.demo'
import { visualInference } from './visual-inference.demo'
import { visualGrid } from './visual-grid.demo'
import { visualPosition } from './visual-position.demo'
import { codeAutocompleteProps } from './code-autocomplete-props.demo'
import { codeAutocompleteTokens } from './code-autocomplete-tokens.demo'
import { codeCmdP } from './code-cmd-p.demo'
import { codeRename } from './code-rename.demo'
import { tokCreate } from './tok-create.demo'
import { tokExtract } from './tok-extract.demo'
import { tokRename } from './tok-rename.demo'

export const demoTests: TestCase[] = [
  ...demoTextIntoFrame,
  ...tutorial01,
  ...tutorial02,
  ...tutorial03,
  ...tutorial04,
  ...tutorial05,
  ...tutorial06,
  ...tutorial07,
  ...tutorial08,
  ...stateHoverFocus,
  ...stateToggle,
  ...stateCrossElement,
  ...visualSnap,
  ...visualInference,
  ...visualGrid,
  ...visualPosition,
  ...codeAutocompleteProps,
  ...codeAutocompleteTokens,
  ...codeCmdP,
  ...codeRename,
  ...tokCreate,
  ...tokExtract,
  ...tokRename,
]
