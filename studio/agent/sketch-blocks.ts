/**
 * Sketch-Block-Detection für den LLM-Edit-Flow.
 *
 * Sketch-Blocks sind Bereiche im Source, die der User explizit als
 * "noch nicht echtes Mirror, übersetze das" markiert hat. Vier
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
 *   4) Trailing — `--` HINTER echtem Code auf derselben Zeile. Die
 *      Anweisung bezieht sich auf das Element davor. Modus ist hier
 *      typischerweise imperativ — „mach das so":
 *
 *      Button "Speichern", bg #2271C1 -- mach rot
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
 *   - `code -- inhalt` (Code-Whitespace-`--`-Inhalt) ist Trailing,
 *     sofern das `--` nicht innerhalb eines Mirror-Strings steht.
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

export type SketchKind = 'block' | 'single' | 'trailing'

export interface SketchBlock {
  /** Variante des Sketches — bestimmt, wie er visualisiert und an den LLM weitergegeben wird. */
  kind: SketchKind
  /** Char-offset im Source, beim ersten Zeichen des Sketches.
   *  - block/single: Anfang der öffnenden `--`-Zeile.
   *  - trailing:     Anfang des `--`-Suffix auf der Code-Zeile (NICHT der Zeilenanfang). */
  from: number
  /** Char-offset im Source, direkt NACH dem letzten Zeichen.
   *  - block:        Ende der schliessenden `--`-Zeile.
   *  - single/trailing: Ende der Zeile. */
  to: number
  /** 1-basierte Zeilennummer der öffnenden `--`-Zeile (oder Code-Zeile bei trailing). */
  startLine: number
  /** 1-basierte Zeilennummer der schliessenden `--`-Zeile. Bei single/trailing gleich startLine. */
  endLine: number
  /** Inhalt des Sketches (Anweisung). */
  text: string
  /**
   * Bei `trailing`: 1-basierte Zeilennummer, bis zu der das Target-
   * Element (samt Subtree) reicht. Mirror ist indentations-basiert, also
   * gehört eine Folgezeile zum Element, wenn sie stärker eingerückt ist
   * als die Trailing-Zeile selbst. Leere Zeilen werden überschritten.
   * Bei einem Element ohne Children ist `targetEndLine === startLine`.
   *
   * Bei `block` und `single` ist dieses Feld nicht gesetzt — die
   * Sketch-Range deckt sich mit startLine/endLine.
   */
  targetEndLine?: number
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
  const blocks: SketchBlock[] = []

  // === Pass 1: collect block/single-line marker candidates. ===
  // Trailing-Sketches sind disjunkt von Markern (Marker beginnt mit
  // `--` nach Whitespace; Trailing hat Code davor) — wir behandeln
  // sie in einer zweiten Passe.
  const markers: MarkerLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER_LINE)
    if (!m) continue
    const inlineContent = m[1].trim()
    markers.push({ index: i, hasContent: inlineContent.length > 0, inlineContent })
  }

  // Pair the markers up.
  for (let mi = 0; mi < markers.length; mi++) {
    const open = markers[mi]
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
      const close = markers[closeIdx]
      const contentLines: string[] = []
      if (open.hasContent) contentLines.push(open.inlineContent)
      for (let k = open.index + 1; k < close.index; k++) {
        contentLines.push(lines[k])
      }
      const from = lineStarts[open.index]
      const to = lineStarts[close.index] + lines[close.index].length
      blocks.push({
        kind: 'block',
        from,
        to,
        startLine: open.index + 1,
        endLine: close.index + 1,
        text: contentLines.join('\n'),
      })
      mi = closeIdx
    } else if (open.hasContent) {
      const from = lineStarts[open.index]
      const to = lineStarts[open.index] + lines[open.index].length
      blocks.push({
        kind: 'single',
        from,
        to,
        startLine: open.index + 1,
        endLine: open.index + 1,
        text: open.inlineContent,
      })
    }
    // else: open without content, no close — ignored.
  }

  // === Pass 2: trailing sketches. ===
  // For each line that is NOT a block/single marker, check if it has
  // ` -- text` outside of any string. The marker col is the unquoted
  // position of the first `--` preceded by whitespace.
  const markerLineSet = new Set(markers.map(m => m.index))
  for (let i = 0; i < lines.length; i++) {
    if (markerLineSet.has(i)) continue
    const trailing = findTrailingMarker(lines[i])
    if (!trailing) continue
    const lineStart = lineStarts[i]
    const targetEndIdx = findSubtreeEnd(lines, i, trailing.col)
    blocks.push({
      kind: 'trailing',
      from: lineStart + trailing.col,
      to: lineStart + lines[i].length,
      startLine: i + 1,
      endLine: i + 1,
      text: trailing.text,
      targetEndLine: targetEndIdx + 1,
    })
  }

  // Stable sort by `from` so callers see the blocks in source order
  // regardless of which pass detected them.
  blocks.sort((a, b) => a.from - b.from)
  return blocks
}

/** Convenience: hat der Source mindestens einen Sketch-Block? */
export function hasSketchBlock(source: string): boolean {
  return findSketchBlocks(source).length > 0
}

/**
 * Find a trailing `--` marker on a line. Returns the column of the
 * first `--` token preceded by whitespace and not enclosed in a
 * string literal, plus the trimmed text after it. Returns null if no
 * valid trailing marker exists.
 *
 * Empty trailing markers (`code --` with nothing after) are ignored —
 * the user clearly didn't finish typing an instruction.
 */
function findTrailingMarker(line: string): { col: number; text: string } | null {
  let inString = false
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i]
    if (c === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inString = !inString
      continue
    }
    if (inString) continue
    // Look for whitespace + `--`.
    if (i > 0 && /[ \t]/.test(line[i - 1]) && line[i] === '-' && line[i + 1] === '-') {
      // Must have visible content after the `--`.
      const after = line.substring(i + 2).trim()
      if (after.length === 0) return null
      // Make sure there was actual code (not just whitespace) before this point.
      const before = line.substring(0, i).trim()
      if (before.length === 0) return null
      return { col: i, text: after }
    }
  }
  return null
}

function computeLineStarts(lines: string[]): number[] {
  const starts: number[] = [0]
  for (let i = 0; i < lines.length; i++) {
    starts.push(starts[i] + lines[i].length + 1) // +1 for \n
  }
  return starts
}

/**
 * Find the last line index of the Mirror element that hosts a trailing
 * sketch. Mirror is indentation-driven (2 spaces per level by
 * convention), so the host's subtree is everything below it that is
 * MORE indented than the host line itself.
 *
 * `trailingCol` is the column at which the `--` token starts on the
 * host line — used to compute the host's effective indent (we measure
 * leading whitespace only, but `trailingCol` gates the look-up: a
 * trailing-sketch on a deeply-indented line needs subtree detection at
 * that depth).
 *
 * Empty lines and pure-whitespace lines DO NOT terminate the subtree —
 * a Mirror element with a blank gap before its next child is common.
 * The subtree ends at the first non-empty line whose leading whitespace
 * is ≤ the host's leading whitespace.
 *
 * Returns the host line index when there is no subtree (no children),
 * or the last child line index otherwise.
 */
function findSubtreeEnd(lines: string[], hostIdx: number, _trailingCol: number): number {
  const hostIndent = leadingWhitespaceLength(lines[hostIdx])
  let lastChild = hostIdx
  for (let i = hostIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue // blank gap inside subtree
    const indent = leadingWhitespaceLength(line)
    if (indent <= hostIndent) break
    lastChild = i
  }
  return lastChild
}

function leadingWhitespaceLength(line: string): number {
  let i = 0
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++
  return i
}
