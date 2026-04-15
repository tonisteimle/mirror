/**
 * Compile Module Types
 */

// === File Types ===

export type FileType = 'layout' | 'tokens' | 'component' | 'data'

// === AST Types (from MirrorLang) ===

export interface AST {
  components: Component[]
  instances: Instance[]
  tokens: Token[]
  errors?: ParseError[]
}

export interface Component {
  name: string
  primitive?: string
}

export interface Instance {
  component: string
}

export interface Token {
  name: string
  value: string
}

export interface ParseError {
  line: number
  message: string
}

// === IR Types ===

export interface IRResult {
  ir: unknown
  sourceMap: SourceMap
}

export interface SourceMap {
  // Bidirectional mapping between source positions and node IDs
  [key: string]: unknown
}

// === Compile Result ===

export interface CompileResult {
  ast: AST
  ir: unknown
  sourceMap: SourceMap
  jsCode: string
  resolvedCode: string
  preludeOffset: number
}

// === Render Context ===

export interface RenderContext {
  preview: HTMLElement
  generatedCode: HTMLElement | null
  status: HTMLElement | null
  fileType: FileType
}

// === Dependencies ===

export interface CompileDependencies {
  MirrorLang: MirrorLangAPI
  getFileType: (file: string) => FileType
  getPreludeCode: (file: string) => string
  autoCreateReferencedFiles: (code: string) => void
  generateYAMLDataInjection: () => string
  makePreviewElementsDraggable: () => void
  updateStudio: (ast: AST, ir: unknown, sourceMap: SourceMap, code: string) => void
  studioActions: StudioActions
  studio: Studio
  currentFile: string
  files: Record<string, string>
  // Preview dependencies
  getAllProjectSource: () => string
  getTokensSource: () => string
  getCurrentFileSource: () => string
}

export interface MirrorLangAPI {
  parse: (code: string) => AST
  toIR: (ast: AST, withSourceMap: boolean) => IRResult
  generateDOM: (ast: AST) => string
}

export interface StudioActions {
  setCompiling: (compiling: boolean) => void
}

export interface Studio {
  state?: { set: (state: Partial<StudioState>) => void }
  preview?: { refresh: () => void }
  sync?: { triggerInitialSync: () => void }
}

export interface StudioState {
  resolvedSource: string
  preludeOffset: number
}

// === Performance Timings ===

export interface CompileTimings {
  start: number
  preludeEnd?: number
  parseEnd?: number
  irEnd?: number
  codegenEnd?: number
  prepExecStart?: number
  execEnd?: number
  updateStudioEnd?: number
  domAppendEnd?: number
  draggablesEnd?: number
  refreshEnd?: number
  syncEnd?: number
}
