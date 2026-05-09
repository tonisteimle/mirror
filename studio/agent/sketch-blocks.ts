/**
 * Sketch-Block-Detection für den LLM-Edit-Flow.
 *
 * Sketch-Blocks sind Bereiche im Source, die der User explizit als
 * "noch nicht echtes Mirror, übersetze das" markiert hat. Drei
 * Varianten sind erlaubt — je nachdem wie der User gerade tippt:
 *
 *   1) Block — paarige `--`-Marker, Inhalt zwischen den Zeilen:
 *
 *      Frame pad 24
 *        --
 *        card mit titel und button
 *        --
 *
 *   2) Single-line — `--` mit Inhalt direkt dahinter, kein Schluss-
 *      Marker. Sketch ist genau diese eine Zeile.
 *
 *      Frame pad 24
 *        -- füge ein dropdown ein
 *
 *   3) Inline-Start mit Block — `-- inhalt` öffnet, weitere Inhalts-
 *      Zeilen folgen, `--` allein schliesst:
 *
 *      Frame pad 24
 *        -- füge ein dropdown ein
 *        muss "Berlin" als default haben
 *        --
 *
 * Marker-Wahl: `--` taucht in Mirror nirgends als Token auf (keine
 * Subtraktion, keine Negation, keine Comment-Syntax), kollidiert also
 * nicht mit echtem Code. Whitespace links ist erlaubt, damit
 * eingerückte Blocks (innerhalb eines Frames) funktionieren.
 *
 * Detektor-Regeln:
 *   - Eine `--`-Zeile ohne Inhalt schliesst einen offenen Block.
 *   - Eine `--`-Zeile mit Inhalt eröffnet entweder Variant 2 (single-
 *     line, wenn kein Schluss-Marker folgt) oder Variant 3 (Block,
 *     wenn doch).
 *   - Lookahead bis Datei-Ende oder zum nächsten Open-Marker mit
 *     Inhalt — letzteres beendet die Suche, weil's plausibel ein
 *     neuer Sketch ist.
 *   - Unverschachtelt: ein offener Block schluckt keine weiteren
 *     Open-Marker.
 *   - Open-Marker ohne Inhalt + kein Schliesser im Rest = ignoriert
 *     (unvollendeter Sketch zählt nicht).
 *
 * Pure-Funktionen, keine Abhängigkeiten — nutzbar in Browser
 * (CodeMirror-Decoration, Studio-Status-Message) und Server (Prompt-
 * Builder, Tests).
 */

export interface SketchBlock {
  /** Char-offset im Source, beim ersten Zeichen der öffnenden `--`-Zeile. */
  from: number
  /** Char-offset im Source, direkt NACH dem letzten Zeichen der schliessenden `--`-Zeile (bzw. der einzigen Zeile bei single-line). */
  to: number
  /** 1-basierte Zeilennummer der öffnenden `--`-Zeile. */
  startLine: number
  /** 1-basierte Zeilennummer der schliessenden `--`-Zeile. Bei single-line gleich startLine. */
  endLine: number
  /** Inhalt des Sketches. Bei Block die Zeilen zwischen den Markern; bei single-line der Text nach dem `--`; bei mixed beides kombiniert. */
  text: string
}

const MARKER_LINE = /^[ \t]*--(.*)$/

interface MarkerLine {
  index: number // 0-based line index
  hasContent: boolean
  inlineContent: string // trimmed text after `--`
}

/**
 * Findet alle Sketch-Blocks im Source. Multi-line, beliebig viele.
 * Ungeschlossene Block-Marker (ohne Inhalt) werden ignoriert.
 */
export function findSketchBlocks(source: string): SketchBlock[] {
  const lines = source.split('\n')
  const lineStarts = computeLineStarts(lines)

  // First pass: collect all marker-line candidates.
  const markers: MarkerLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER_LINE)
    if (!m) continue
    const inlineContent = m[1].trim()
    markers.push({ index: i, hasContent: inlineContent.length > 0, inlineContent })
  }

  // Second pass: walk markers, pair them up under the rules.
  const blocks: SketchBlock[] = []
  for (let mi = 0; mi < markers.length; mi++) {
    const open = markers[mi]
    // Look for a close-marker (no inline content) AFTER the open. Stop
    // looking if we hit another open-with-content first — that one is
    // plausibly the next sketch's start.
    let closeIdx = -1
    for (let mj = mi + 1; mj < markers.length; mj++) {
      const cand = markers[mj]
      if (!cand.hasContent) {
        closeIdx = mj
        break
      }
      // Open-with-content while we're still hunting for a close —
      // bail. The current open is single-line.
      break
    }

    if (closeIdx !== -1) {
      // Block sketch (variant 1 or 3). Inline content from open
      // becomes the first content row; lines between markers fill
      // the rest.
      const close = markers[closeIdx]
      const contentLines: string[] = []
      if (open.hasContent) contentLines.push(open.inlineContent)
      for (let k = open.index + 1; k < close.index; k++) {
        contentLines.push(lines[k])
      }
      const from = lineStarts[open.index]
      const to = lineStarts[close.index] + lines[close.index].length
      blocks.push({
        from,
        to,
        startLine: open.index + 1,
        endLine: close.index + 1,
        text: contentLines.join('\n'),
      })
      mi = closeIdx // skip past the close
    } else if (open.hasContent) {
      // Single-line sketch (variant 2). The whole open-line is both
      // marker and content.
      const from = lineStarts[open.index]
      const to = lineStarts[open.index] + lines[open.index].length
      blocks.push({
        from,
        to,
        startLine: open.index + 1,
        endLine: open.index + 1,
        text: open.inlineContent,
      })
    }
    // else: open without content, no close — incomplete block, skip.
  }
  return blocks
}

/** Convenience: hat der Source mindestens einen Sketch-Block? */
export function hasSketchBlock(source: string): boolean {
  return findSketchBlocks(source).length > 0
}

function computeLineStarts(lines: string[]): number[] {
  const starts: number[] = [0]
  for (let i = 0; i < lines.length; i++) {
    starts.push(starts[i] + lines[i].length + 1) // +1 for \n
  }
  return starts
}
