/**
 * Line Offset Service
 *
 * Handles translation between editor line numbers and SourceMap line numbers.
 * The editor shows only the current file, while the SourceMap uses combined
 * source line numbers (prelude + separator + current file).
 */

export class LineOffsetService {
  private offset = 0

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
