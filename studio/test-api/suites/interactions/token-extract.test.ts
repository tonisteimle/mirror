/**
 * Token Extract Test Suite
 *
 * Tests for the :: syntax to extract inline values to tokens:
 * - bg primary::#333 → creates token primary.bg: #333, replaces with bg $primary
 *
 * The trigger fires when typing the second ':' character to complete '::'
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

/**
 * Helper to simulate typing the second ':' to trigger extraction
 * Sets up "bg tokenName:" first, then inserts ":" to create "::"
 */
async function triggerTokenExtract(
  api: TestAPI,
  setup: { property: string; tokenName: string; value: string; searchFor: string }
) {
  const editor = window.editor
  if (!editor) throw new Error('Editor not found')

  const code = editor.state.doc.toString()
  const searchPos = code.indexOf(setup.searchFor)
  if (searchPos === -1) throw new Error(`Could not find "${setup.searchFor}" in code`)

  // Replace "property value" with "property tokenName:" followed by value
  // e.g., "bg #333" becomes "bg primary:#333" (with single colon first)
  const replaceEnd = searchPos + setup.searchFor.length
  const textWithSingleColon = `${setup.property} ${setup.tokenName}:${setup.value}`

  editor.dispatch({
    changes: { from: searchPos, to: replaceEnd, insert: textWithSingleColon },
    selection: { anchor: searchPos + textWithSingleColon.length },
  })

  await api.utils.delay(50)

  // Now find where we need to insert the second ':' (right after tokenName:)
  // The line now looks like: "bg primary:#333"
  // We need to insert ':' after 'primary:' to make it 'primary::#333'
  const currentCode = editor.state.doc.toString()
  const singleColonPattern = `${setup.property} ${setup.tokenName}:`
  const singleColonPos = currentCode.indexOf(singleColonPattern)
  if (singleColonPos === -1) throw new Error(`Could not find "${singleColonPattern}" in code`)

  // Insert position is right after the first colon
  const insertPos = singleColonPos + singleColonPattern.length

  // Insert ONLY the second ':' character - this triggers the extraction
  editor.dispatch({
    changes: { from: insertPos, to: insertPos, insert: ':' },
    selection: { anchor: insertPos + 1 },
  })

  await api.utils.delay(200)
  await api.utils.waitForCompile()
}

export const tokenExtractTests: TestCase[] = describe('Token Extract (:: syntax)', [
  testWithSetup(
    'Extract color token with bg property',
    'Frame pad 16\n  Frame bg #333, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerTokenExtract(api, {
        property: 'bg',
        tokenName: 'primary',
        value: '#333',
        searchFor: 'bg #333',
      })

      // Check that the code now has $primary
      api.assert.codeContains(/bg\s+\$primary/)

      // Check that tokens file was created/updated
      const files = window.desktopFiles?.getFiles?.() || {}
      const tokFile = Object.entries(files).find(
        ([name]) => name.endsWith('.tok') || name.endsWith('.tokens')
      )

      if (!tokFile) {
        throw new Error('No tokens file was created')
      }

      const [tokFilename, tokContent] = tokFile
      if (!tokContent.includes('primary.bg:')) {
        throw new Error(`Token not found in ${tokFilename}. Content: ${tokContent}`)
      }
    }
  ),

  testWithSetup(
    'Extract padding token',
    'Frame pad 16\n  Frame pad 24, w 100, h 50',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const editor = window.editor
      if (!editor) throw new Error('Editor not found')

      const code = editor.state.doc.toString()
      // Find the second "pad 24" (not the first "pad 16")
      const secondPadPos = code.indexOf('pad 24')
      if (secondPadPos === -1) throw new Error('Could not find pad 24')

      await triggerTokenExtract(api, {
        property: 'pad',
        tokenName: 'spacing',
        value: '24',
        searchFor: 'pad 24',
      })

      // Check that the code now has $spacing
      api.assert.codeContains(/pad\s+\$spacing/)
    }
  ),

  testWithSetup(
    'Extract radius token',
    'Frame pad 16\n  Frame rad 8, w 100, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerTokenExtract(api, {
        property: 'rad',
        tokenName: 'corner',
        value: '8',
        searchFor: 'rad 8',
      })

      // Check that the code now has $corner
      api.assert.codeContains(/rad\s+\$corner/)
    }
  ),

  testWithSetup(
    'Extract font-size token',
    'Frame pad 16\n  Text "Hello", fs 24',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerTokenExtract(api, {
        property: 'fs',
        tokenName: 'heading',
        value: '24',
        searchFor: 'fs 24',
      })

      // Check that the code now has $heading
      api.assert.codeContains(/fs\s+\$heading/)
    }
  ),

  testWithSetup(
    'Extract gap token',
    'Frame pad 16, gap 12\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await triggerTokenExtract(api, {
        property: 'gap',
        tokenName: 'space',
        value: '12',
        searchFor: 'gap 12',
      })

      // Check that the code now has $space
      api.assert.codeContains(/gap\s+\$space/)
    }
  ),
])

export default tokenExtractTests
