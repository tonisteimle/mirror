/**
 * Line Offset Service
 *
 * Handles translation between editor line numbers and SourceMap line numbers.
 * The editor shows only the current file, while the SourceMap uses combined
 * source line numbers (prelude + separator + current file).
 */

export class LineOffsetService {
  private offset = 0
  // True when editor source == compile source (single-file or layout-on-layout).
  // False when the preview is redirected to a sibling layout (e.g. editor on
  // tokens.tok but preview compiles app.mir). In the redirected case
  // `editorLine + offset` does NOT land in app.mir's source — the editor
  // shows tokens, while `offset` was computed for app.mir's content. Cursor
  // sync MUST bail out instead of resolving phantom nodes via getNodeAtLine.
  private editorTracksCompile = true

  /**
   * Set the line offset (number of prelude + separator lines)
   */
  setOffset(lineCount: number): void {
    this.offset = lineCount
  }

  /**
   * Get the current offset
   */
  getOffset(): number {
    return this.offset
  }

  /**
   * Mark whether the editor's source corresponds 1:1 to the compile target.
   * False when preview-redirect is active (editor on a non-layout file while
   * preview compiles a sibling layout); cursor sync must skip in that case.
   */
  setEditorTracksCompileSource(tracks: boolean): void {
    this.editorTracksCompile = tracks
  }

  isEditorTrackingCompileSource(): boolean {
    return this.editorTracksCompile
  }

  /**
   * Convert editor line to SourceMap line
   * @param editorLine - Line number in editor (1-indexed)
   * @returns Line number in combined source (SourceMap)
   */
  editorToSourceMap(editorLine: number): number {
    return editorLine + this.offset
  }

  /**
   * Convert SourceMap line to editor line
   * @param sourceMapLine - Line number in combined source (SourceMap)
   * @returns Line number in editor (1-indexed, minimum 1)
   */
  sourceMapToEditor(sourceMapLine: number): number {
    return Math.max(1, sourceMapLine - this.offset)
  }

  /**
   * Check if a SourceMap line is within the current file
   * (i.e., after the prelude)
   */
  isInCurrentFile(sourceMapLine: number): boolean {
    return sourceMapLine > this.offset
  }
}

export function createLineOffsetService(): LineOffsetService {
  return new LineOffsetService()
}
