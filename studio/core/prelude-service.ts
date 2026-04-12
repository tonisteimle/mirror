/**
 * Prelude Service - Single Source of Truth for prelude information
 *
 * The prelude is the combined content of tokens and component files that gets
 * prepended to the current file before compilation. This service tracks:
 * - Character offset: where the current file starts in the combined source
 * - Line count: how many lines the prelude has (for SourceMap line translation)
 */

export interface PreludeInfo {
  /** The prelude content (tokens + components) */
  content: string
  /** Character offset where current file starts in combined source */
  characterOffset: number
  /** Number of lines in the prelude */
  lineCount: number
}

export class PreludeService {
  private content = ''
  private characterOffset = 0
  private lineCount = 0

  /**
   * Update prelude information
   */
  setPrelude(content: string): void {
    this.content = content
    // +1 for the newline separator between prelude and current file
    this.characterOffset = content.length > 0 ? content.length + 1 : 0
    this.lineCount = content.length > 0 ? content.split('\n').length : 0
  }

  /**
   * Get the prelude content
   */
  getContent(): string {
    return this.content
  }

  /**
   * Get character offset (for substring operations on combined source)
   */
  getCharacterOffset(): number {
    return this.characterOffset
  }

  /**
   * Get line count (for SourceMap line number translation)
   */
  getLineCount(): number {
    return this.lineCount
  }

  /**
   * Get all prelude information at once
   */
  getInfo(): PreludeInfo {
    return {
      content: this.content,
      characterOffset: this.characterOffset,
      lineCount: this.lineCount,
    }
  }

  /**
   * Convert editor line to SourceMap line
   * @param editorLine - Line number in editor (1-indexed)
   * @returns Line number in combined source (SourceMap)
   */
  editorLineToSourceMap(editorLine: number): number {
    return editorLine + this.lineCount
  }

  /**
   * Convert SourceMap line to editor line
   * @param sourceMapLine - Line number in combined source (SourceMap)
   * @returns Line number in editor (1-indexed, minimum 1)
   */
  sourceMapLineToEditor(sourceMapLine: number): number {
    return Math.max(1, sourceMapLine - this.lineCount)
  }

  /**
   * Check if a SourceMap line is within the current file (after prelude)
   */
  isLineInCurrentFile(sourceMapLine: number): boolean {
    return sourceMapLine > this.lineCount
  }

  /**
   * Convert editor character position to combined source position
   * @param editorPos - Character position in editor
   * @returns Character position in combined source
   */
  editorPosToSource(editorPos: number): number {
    return editorPos + this.characterOffset
  }

  /**
   * Convert combined source character position to editor position
   * @param sourcePos - Character position in combined source
   * @returns Character position in editor
   */
  sourcePosToEditor(sourcePos: number): number {
    return Math.max(0, sourcePos - this.characterOffset)
  }

  /**
   * Extract current file content from combined source
   */
  extractCurrentFile(combinedSource: string): string {
    if (this.characterOffset === 0) return combinedSource
    return combinedSource.substring(this.characterOffset)
  }

  /**
   * Reset to empty prelude
   */
  reset(): void {
    this.content = ''
    this.characterOffset = 0
    this.lineCount = 0
  }
}

// Singleton instance for use across the application
let instance: PreludeService | null = null

export function getPreludeService(): PreludeService {
  if (!instance) {
    instance = new PreludeService()
  }
  return instance
}

export function createPreludeService(): PreludeService {
  return new PreludeService()
}
