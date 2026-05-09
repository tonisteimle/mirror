/**
 * Sketch-Block Decoration für CodeMirror.
 *
 * Hebt `-- ... --`-Blocks im Editor visuell hervor — der User sieht
 * sofort, wo er gesketcht hat und wo ein Cmd+Enter gleich übersetzen
 * wird. Marker-Zeilen bekommen eine andere Farbe als Inhalt-Zeilen,
 * damit Anfang/Ende klar erkennbar sind.
 *
 * Live-Update: Decoration läuft auf jedem doc-change. Pure Detection
 * via findSketchBlocks (siehe ../agent/sketch-blocks.ts) — kein
 * Eigenwert hier, nur Visualisierung.
 */

import {
  EditorView,
  Decoration,
  ViewPlugin,
  type ViewUpdate,
  type DecorationSet,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { findSketchBlocks } from '../agent/sketch-blocks'

const sketchMarkerLine = Decoration.line({ class: 'cm-sketch-marker' })
const sketchContentLine = Decoration.line({ class: 'cm-sketch-content' })

const sketchBlocksPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const source = view.state.doc.toString()
      const blocks = findSketchBlocks(source)
      for (const block of blocks) {
        for (let n = block.startLine; n <= block.endLine; n++) {
          const line = view.state.doc.line(n)
          const isMarker = n === block.startLine || n === block.endLine
          builder.add(line.from, line.from, isMarker ? sketchMarkerLine : sketchContentLine)
        }
      }
      // Toolbar-Synchronisation: die `editor-has-sketch`-Class auf body
      // signalisiert dem AI-Edit-Button (in der Editor-Toolbar), dass der
      // Source einen Sketch-Block enthält — der Button bekommt dann den
      // gleichen Amber-Akzent wie die Block-Decoration. Idempotenter
      // toggle, side-effect ist hier akzeptabel.
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('editor-has-sketch', blocks.length > 0)
      }
      return builder.finish()
    }
  },
  {
    decorations: v => v.decorations,
  }
)

export function sketchDecorationExtension() {
  return [sketchBlocksPlugin]
}
