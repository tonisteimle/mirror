/**
 * Component Extract Test Suite
 *
 * Tests for the :: syntax to extract components:
 * - Card:: pad 16, bg #333 → creates component Card: pad 16, bg #333 in .com file
 *
 * The trigger fires when typing the second ':' character to complete '::'
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

/**
 * Helper to simulate typing the second ':' to trigger component extraction
 */
async function triggerComponentExtract(
  api: TestAPI,
  setup: { componentName: string; properties: string; searchFor: string }
) {
  const editor = window.editor
  if (!editor) throw new Error('Editor not found')

  const code = editor.state.doc.toString()
  const searchPos = code.indexOf(setup.searchFor)
  if (searchPos === -1) throw new Error(`Could not find "${setup.searchFor}" in code`)

  // Replace with "ComponentName:" first (single colon)
  const replaceEnd = searchPos + setup.searchFor.length
  const textWithSingleColon = `${setup.componentName}:${setup.properties}`

  editor.dispatch({
    changes: { from: searchPos, to: replaceEnd, insert: textWithSingleColon },
    selection: { anchor: searchPos + setup.componentName.length + 1 },
  })

  await api.utils.delay(50)

  // Now insert the second ':' after the component name
  const currentCode = editor.state.doc.toString()
  const singleColonPattern = `${setup.componentName}:`
  const singleColonPos = currentCode.indexOf(singleColonPattern)
  if (singleColonPos === -1) throw new Error(`Could not find "${singleColonPattern}" in code`)

  // Insert position is right after the first colon
  const insertPos = singleColonPos + singleColonPattern.length

  // Insert the second ':' character - this triggers the extraction
  editor.dispatch({
    changes: { from: insertPos, to: insertPos, insert: ':' },
    selection: { anchor: insertPos + 1 },
  })

  await api.utils.delay(200)
  await api.utils.waitForCompile()
}

export const componentExtractTests: TestCase[] = describe('Component Extract (:: syntax)', [
  testWithSetup(
    'Extract simple component with properties',
    'Frame pad 16\n  Frame pad 12, bg #333, rad 8',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerComponentExtract(api, {
        componentName: 'Card',
        properties: ' pad 12, bg #333, rad 8',
        searchFor: 'Frame pad 12, bg #333, rad 8',
      })

      // Check that the code now has just Card (instance)
      const editor = window.editor
      const code = editor?.state.doc.toString() || ''

      if (!code.includes('Card') || code.includes('Card:')) {
        // If Card: still exists, extraction didn't work
        if (code.includes('Card::')) {
          throw new Error('Component extraction did not trigger - :: still in code')
        }
      }

      // Check that components file was created/updated
      const files = window.desktopFiles?.getFiles?.() || {}
      const comFile = Object.entries(files).find(
        ([name]) => name.endsWith('.com') || name.endsWith('.components')
      )

      if (!comFile) {
        throw new Error('No components file was created')
      }

      const [comFilename, comContent] = comFile
      if (!comContent.includes('Card:')) {
        throw new Error(`Component not found in ${comFilename}. Content: ${comContent}`)
      }
    }
  ),

  testWithSetup(
    'Extract component with children - children stay in editor',
    'Frame pad 16\n  Frame pad 12, bg #1a1a1a\n    Text "Title"\n    Text "Desc"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerComponentExtract(api, {
        componentName: 'InfoCard',
        properties: ' pad 12, bg #1a1a1a',
        searchFor: 'Frame pad 12, bg #1a1a1a',
      })

      await api.utils.delay(100)

      // Check components file has ONLY the properties (no children)
      const files = window.desktopFiles?.getFiles?.() || {}
      const comFile = Object.entries(files).find(
        ([name]) => name.endsWith('.com') || name.endsWith('.components')
      )

      if (!comFile) {
        throw new Error('No components file was created')
      }

      const [, comContent] = comFile

      if (!comContent.includes('InfoCard:')) {
        throw new Error('InfoCard component not found in components file')
      }

      // Children should NOT be in the component file (they stay in editor)
      if (comContent.includes('Text "Title"')) {
        throw new Error('Children should stay in editor, not in component file')
      }

      // Check that children are still in the editor
      const editor = window.editor
      const code = editor?.state.doc.toString() || ''

      if (!code.includes('Text "Title"')) {
        throw new Error('Child Text "Title" should remain in editor')
      }

      if (!code.includes('Text "Desc"')) {
        throw new Error('Child Text "Desc" should remain in editor')
      }

      // Editor should have InfoCard with children indented under it
      if (!code.includes('InfoCard')) {
        throw new Error('InfoCard instance should be in editor')
      }
    }
  ),

  testWithSetup(
    'Extract replaces properties, keeps children',
    'Frame pad 16\n  Frame pad 8, bg #222, rad 4\n    Button "Click"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerComponentExtract(api, {
        componentName: 'ActionBox',
        properties: ' pad 8, bg #222, rad 4',
        searchFor: 'Frame pad 8, bg #222, rad 4',
      })

      await api.utils.delay(100)

      // The editor should have ActionBox with children still there
      const editor = window.editor
      const code = editor?.state.doc.toString() || ''

      // Should have ActionBox instance (without colon on same line)
      if (!code.match(/ActionBox(?!:)/)) {
        throw new Error('ActionBox instance not found in editor')
      }

      // Children should STILL be in the editor (under the instance)
      if (!code.includes('Button "Click"')) {
        throw new Error('Children should stay in editor under the instance')
      }

      // Properties should NOT be on the instance line (they're in component)
      const actionBoxLine = code.split('\n').find(l => l.includes('ActionBox') && !l.includes('ActionBox:'))
      if (actionBoxLine && actionBoxLine.includes('pad 8')) {
        throw new Error('Properties should be in component file, not on instance')
      }
    }
  ),

  testWithSetup(
    'Double colon without properties removes colons',
    'Frame pad 16\n  Frame',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const editor = window.editor
      if (!editor) throw new Error('Editor not found')

      // Find "Frame" (the second one, which is a child)
      const code = editor.state.doc.toString()
      const lines = code.split('\n')
      const childFrameLineIdx = lines.findIndex(
        (l, i) => i > 0 && l.trim() === 'Frame'
      )

      if (childFrameLineIdx === -1) throw new Error('Could not find child Frame')

      // Get position of this Frame
      let pos = 0
      for (let i = 0; i < childFrameLineIdx; i++) {
        pos += lines[i].length + 1
      }
      const indent = lines[childFrameLineIdx].match(/^(\s*)/)?.[1] || ''
      pos += indent.length

      // Replace "Frame" with "MyFrame:" then add second ":"
      const frameStart = pos
      const frameEnd = pos + 'Frame'.length

      editor.dispatch({
        changes: { from: frameStart, to: frameEnd, insert: 'MyFrame:' },
      })

      await api.utils.delay(50)

      // Insert second ':'
      const currentCode = editor.state.doc.toString()
      const colonPos = currentCode.indexOf('MyFrame:') + 'MyFrame:'.length

      editor.dispatch({
        changes: { from: colonPos, to: colonPos, insert: ':' },
        selection: { anchor: colonPos + 1 },
      })

      await api.utils.delay(200)

      // The :: should be removed, leaving just "MyFrame"
      const finalCode = editor.state.doc.toString()
      if (finalCode.includes('::')) {
        throw new Error('Double colon should be removed when no properties')
      }

      if (!finalCode.includes('MyFrame')) {
        throw new Error('MyFrame should remain in the code')
      }
    }
  ),

  testWithSetup(
    'Existing component with same props becomes plain instance',
    'Frame pad 16\n  Frame bg #111, rad 4',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // First, create a component
      await triggerComponentExtract(api, {
        componentName: 'TestComp',
        properties: ' bg #111, rad 4',
        searchFor: 'Frame bg #111, rad 4',
      })

      await api.utils.delay(100)

      // Now add another Frame with SAME properties
      const editor = window.editor
      if (!editor) throw new Error('Editor not found')

      const code = editor.state.doc.toString()
      const newCode = code + '\n  Frame bg #111, rad 4'

      editor.dispatch({
        changes: { from: 0, to: code.length, insert: newCode },
      })

      await api.utils.delay(100)

      // Try to extract with same component name and same properties
      await triggerComponentExtract(api, {
        componentName: 'TestComp',
        properties: ' bg #111, rad 4',
        searchFor: 'Frame bg #111, rad 4',
      })

      await api.utils.delay(100)

      const finalCode = editor.state.doc.toString()

      // Should not have TestComp:: anymore
      if (finalCode.includes('TestComp::')) {
        throw new Error('TestComp:: should be converted to instance')
      }

      // Should have just "TestComp" (no properties, since they match)
      // Count occurrences of TestComp without properties after it
      const matches = finalCode.match(/TestComp(?!\s*:)(?!\s+\w)/g)
      if (!matches || matches.length < 1) {
        throw new Error('Should have plain TestComp instance (no override props)')
      }
    }
  ),

  testWithSetup(
    'Smart diff: only different properties kept as overrides',
    'Frame pad 16\n  Frame bg #111, rad 4',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // First, create component with bg #111, rad 4
      await triggerComponentExtract(api, {
        componentName: 'DiffTest',
        properties: ' bg #111, rad 4',
        searchFor: 'Frame bg #111, rad 4',
      })

      await api.utils.delay(100)

      // Now add another Frame with DIFFERENT rad value
      const editor = window.editor
      if (!editor) throw new Error('Editor not found')

      const code = editor.state.doc.toString()
      const newCode = code + '\n  Frame bg #111, rad 8, pad 12'

      editor.dispatch({
        changes: { from: 0, to: code.length, insert: newCode },
      })

      await api.utils.delay(100)

      // Extract with same component name but different properties
      await triggerComponentExtract(api, {
        componentName: 'DiffTest',
        properties: ' bg #111, rad 8, pad 12',
        searchFor: 'Frame bg #111, rad 8, pad 12',
      })

      await api.utils.delay(100)

      const finalCode = editor.state.doc.toString()

      // Should have DiffTest with only the different properties
      // bg #111 matches -> removed
      // rad 8 differs from rad 4 -> kept
      // pad 12 is new -> kept
      if (!finalCode.includes('rad 8')) {
        throw new Error('Override property "rad 8" should be kept')
      }

      if (!finalCode.includes('pad 12')) {
        throw new Error('New property "pad 12" should be kept')
      }

      // bg #111 should NOT appear after DiffTest (it matches component)
      const diffTestLine = finalCode.split('\n').find(l => l.includes('DiffTest') && !l.includes('DiffTest:'))
      if (diffTestLine && diffTestLine.includes('bg #111')) {
        throw new Error('Matching property "bg #111" should be removed (it matches component)')
      }
    }
  ),
])

export default componentExtractTests
