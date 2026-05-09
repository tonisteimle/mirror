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
// Trailing-Sketch: mark statt line — nur der `-- inhalt`-Suffix wird
// gefärbt, das Element davor bleibt visuell normaler Code.
const sketchTrailingMark = Decoration.mark({ class: 'cm-sketch-trailing' })
// Subtree-Hint: dünner Akzent-Streifen auf allen Zeilen, die zum
// Target-Element eines Trailing-Sketch gehören (Host + Children).
// Klar dezenter als Block-Marker — sagt "Scope der Anweisung", nicht
// "wird ersetzt".
const sketchSubtreeLine = Decoration.line({ class: 'cm-sketch-subtree' })

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
      // Collect all decoration entries first, then sort by `from` and feed
      // them into the builder. RangeSetBuilder requires monotonically
      // increasing `from`, but trailing-marks (mid-line offsets) and the
      // surrounding subtree line decorations interleave in source order.
      const entries: { from: number; to: number; deco: Decoration }[] = []
      for (const block of blocks) {
        if (block.kind === 'trailing') {
          entries.push({ from: block.from, to: block.to, deco: sketchTrailingMark })
          // Subtree hint only when the host actually has children — single
          // -line elements would just get a confusing isolated bar.
          if (block.targetEndLine && block.targetEndLine > block.startLine) {
            for (let n = block.startLine; n <= block.targetEndLine; n++) {
              const line = view.state.doc.line(n)
              entries.push({ from: line.from, to: line.from, deco: sketchSubtreeLine })
            }
          }
          continue
        }
        for (let n = block.startLine; n <= block.endLine; n++) {
          const line = view.state.doc.line(n)
          const isMarker = n === block.startLine || n === block.endLine
          entries.push({
            from: line.from,
            to: line.from,
            deco: isMarker ? sketchMarkerLine : sketchContentLine,
          })
        }
      }
      entries.sort((a, b) => a.from - b.from || a.to - b.to)
      for (const e of entries) builder.add(e.from, e.to, e.deco)
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
