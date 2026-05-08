/**
 * Project — File-Panel mit `.data` Extension
 *
 * Validiert die Phase-1.1-Änderung (`.data` in
 * `studio/storage/types.ts:FILE_EXTENSIONS.data`): wenn eine `.data`-
 * Datei via Test-API angelegt wird, muss sie im File-Panel erscheinen.
 * Vorher wurde sie als nicht-Mirror-File gefiltert.
 */

import type { TestSuite, TestAPI } from '../../types'

const DATA_DATA = `// Personas-Dokument — Daten (intentionally minimal)
`

export const personasFilePanelTests: TestSuite = [
  {
    name: 'Project: .data file appears in file panel',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      // Cleanup falls vorheriger Lauf hängen geblieben ist
      try {
        await files.delete('data.data')
      } catch {
        /* ignore */
      }

      // Anlegen
      const created = await files.create('data.data', DATA_DATA)
      api.assert.ok(created, 'create(data.data) should succeed')

      await api.utils.delay(200)

      const list = files.list()
      console.log('[personas-file-panel] tree:', JSON.stringify(list))

      api.assert.ok(
        list.includes('data.data'),
        `Phase 1.1: data.data must appear in file panel; got: ${JSON.stringify(list)}`
      )

      // File-Type-Erkennung: 'data' (über .data extension)
      const dataType = files.getFileType('data.data')
      api.assert.equals(dataType, 'data', `data.data should be type 'data', got '${dataType}'`)

      // Visueller Smoke-Test: alle vier Personas-Files anlegen, damit der
      // Screenshot des File-Panels das echte personas-informatik-Setup
      // zeigt. Default-Project enthält schon app.mir/components.com/
      // tokens.tok unter den Standard-Namen — die müssen wir nicht erneut
      // anlegen.
      console.log('[personas-file-panel] FINAL TREE:', JSON.stringify(files.list()))

      // Cleanup
      try {
        await files.delete('data.data')
      } catch {
        /* ignore */
      }
    },
  },
]

export default personasFilePanelTests
