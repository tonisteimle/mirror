/**
 * Mirror Agent Types
 *
 * Minimal surface for the post-cleanup AI stack: only the file-info shape
 * the Fixer's `getFiles` callback returns. Everything else (FixerContext,
 * FixerResponse, AgentEvent, ToolContext, LLMCommand, MirrorAgentConfig,
 * ChatMessage, ElementInfo, …) was removed together with the multi-file
 * `fix()` / `quickFix()` flow they served.
 */

/** File type classification for Mirror projects */
export type FileType = 'tokens' | 'components' | 'component' | 'layout' | 'data' | 'unknown'

/** Information about a project file */
export interface FileInfo {
  name: string
  type: FileType
  code: string
}
