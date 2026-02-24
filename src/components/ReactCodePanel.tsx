/**
 * ReactCodePanel - Displays generated React code with file tree navigation
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { colors } from '../theme'
import type { ExportedFile } from '../generator/multi-file-exporter'

interface ReactCodePanelProps {
  files: ExportedFile[]
}

// =============================================================================
// Theme for TypeScript/React code display
// =============================================================================

// Syntax highlighting colors (VS Code Dark+ inspired)
const reactHighlightStyle = HighlightStyle.define([
  // Keywords: import, export, const, let, function, return, if, else, etc.
  { tag: tags.keyword, color: '#C586C0' },
  { tag: tags.controlKeyword, color: '#C586C0' },
  { tag: tags.moduleKeyword, color: '#C586C0' },
  { tag: tags.operatorKeyword, color: '#C586C0' },

  // Types and classes
  { tag: tags.typeName, color: '#4EC9B0' },
  { tag: tags.className, color: '#4EC9B0' },
  { tag: tags.namespace, color: '#4EC9B0' },

  // Functions and methods
  { tag: tags.function(tags.variableName), color: '#DCDCAA' },
  { tag: tags.function(tags.propertyName), color: '#DCDCAA' },

  // Variables and properties
  { tag: tags.variableName, color: '#9CDCFE' },
  { tag: tags.propertyName, color: '#9CDCFE' },
  { tag: tags.definition(tags.variableName), color: '#9CDCFE' },

  // Strings
  { tag: tags.string, color: '#CE9178' },
  { tag: tags.special(tags.string), color: '#CE9178' },

  // Numbers
  { tag: tags.number, color: '#B5CEA8' },
  { tag: tags.bool, color: '#569CD6' },
  { tag: tags.null, color: '#569CD6' },

  // Comments
  { tag: tags.comment, color: '#6A9955', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#6A9955', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#6A9955', fontStyle: 'italic' },

  // JSX/HTML tags
  { tag: tags.tagName, color: '#569CD6' },
  { tag: tags.attributeName, color: '#9CDCFE' },
  { tag: tags.attributeValue, color: '#CE9178' },

  // Operators and punctuation
  { tag: tags.operator, color: '#D4D4D4' },
  { tag: tags.punctuation, color: '#D4D4D4' },
  { tag: tags.bracket, color: '#FFD700' },
  { tag: tags.angleBracket, color: '#808080' },

  // Regular expressions
  { tag: tags.regexp, color: '#D16969' },

  // Constants
  { tag: tags.constant(tags.variableName), color: '#4FC1FF' },
])

const codeViewerTheme = EditorView.theme({
  '&': {
    backgroundColor: '#000000',
    color: '#D4D4D4',
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
    lineHeight: '1.5',
    height: '100%',
  },
  '&.cm-editor': {
    backgroundColor: '#000000',
    height: '100%',
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    backgroundColor: '#000000',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '12px 12px 12px 0',
    caretColor: '#FFFFFF',
    backgroundColor: '#000000',
  },
  '.cm-line': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftColor: '#FFFFFF',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#264F78 !important',
  },
  '.cm-gutters': {
    backgroundColor: '#000000',
    color: '#6A737D',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px',
    minWidth: '32px',
  },
}, { dark: true })

// =============================================================================
// FileTree Component
// =============================================================================

interface FileGroup {
  folder: string
  files: ExportedFile[]
}

function groupFiles(files: ExportedFile[]): FileGroup[] {
  const groups = new Map<string, ExportedFile[]>()

  // Separate root files and folder files
  for (const file of files) {
    const parts = file.path.split('/')
    const folder = parts.length > 1 ? parts[0] : ''

    if (!groups.has(folder)) {
      groups.set(folder, [])
    }
    groups.get(folder)!.push(file)
  }

  // Convert to array, root first, then sorted folders
  const result: FileGroup[] = []

  // Root files first
  const rootFiles = groups.get('')
  if (rootFiles) {
    result.push({ folder: '', files: rootFiles })
    groups.delete('')
  }

  // Sorted folders
  const sortedFolders = Array.from(groups.keys()).sort()
  for (const folder of sortedFolders) {
    result.push({ folder, files: groups.get(folder)! })
  }

  return result
}

interface FileTreeProps {
  files: ExportedFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onCopy: (content: string) => void
}

function FileTree({ files, selectedPath, onSelect, onCopy }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['components', 'styles']))
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const groups = useMemo(() => groupFiles(files), [files])

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folder)) {
        next.delete(folder)
      } else {
        next.add(folder)
      }
      return next
    })
  }, [])

  const getFileName = (path: string): string => {
    const parts = path.split('/')
    return parts[parts.length - 1]
  }

  return (
    <div style={{
      width: '160px',
      minWidth: '160px',
      backgroundColor: '#000000',
      overflow: 'auto',
      padding: '8px 0',
    }}>
      {groups.map(group => (
        <div key={group.folder || 'root'}>
          {/* Folder header (if not root) */}
          {group.folder && (
            <div
              onClick={() => toggleFolder(group.folder)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                fontSize: '11px',
                color: colors.textMuted,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{
                transform: expandedFolders.has(group.folder) ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.1s',
                fontSize: '8px',
              }}>
                {'\u25B6'}
              </span>
              {group.folder}/
            </div>
          )}

          {/* Files */}
          {(group.folder === '' || expandedFolders.has(group.folder)) && (
            <div style={{ paddingLeft: group.folder ? '12px' : '0' }}>
              {group.files.map(file => (
                <div
                  key={file.path}
                  onClick={() => onSelect(file.path)}
                  onMouseEnter={() => setHoveredPath(file.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 12px',
                    fontSize: '11px',
                    color: selectedPath === file.path ? colors.text : colors.textMuted,
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    margin: '0 4px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getFileName(file.path)}
                  </span>
                  {hoveredPath === file.path && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopy(file.content)
                      }}
                      title="Copy to clipboard"
                      style={{
                        padding: '2px 4px',
                        fontSize: '10px',
                        backgroundColor: 'transparent',
                        color: colors.textMuted,
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        lineHeight: 1,
                      }}
                    >
                      {'\u{1F4CB}'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// CodeViewer Component
// =============================================================================

interface CodeViewerProps {
  code: string
  filePath: string
}

function CodeViewer({ code, filePath }: CodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorView | null>(null)

  // Determine language from file extension
  const getLanguageExtension = useCallback((path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.ts')) {
      return javascript({ jsx: true, typescript: true })
    }
    if (path.endsWith('.json')) {
      return json()
    }
    return javascript({ jsx: true, typescript: true })
  }, [])

  // Create or update editor
  useEffect(() => {
    if (!containerRef.current) return

    // Destroy existing editor
    if (editorRef.current) {
      editorRef.current.destroy()
      editorRef.current = null
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        lineNumbers(),
        codeViewerTheme,
        syntaxHighlighting(reactHighlightStyle),
        getLanguageExtension(filePath),
      ],
    })

    editorRef.current = new EditorView({
      state,
      parent: containerRef.current,
    })

    return () => {
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [code, filePath, getLanguageExtension])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
      }}
    />
  )
}

// =============================================================================
// Main ReactCodePanel Component
// =============================================================================

export function ReactCodePanel({ files }: ReactCodePanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  // Auto-select first file (App.tsx) if nothing selected
  useEffect(() => {
    if (!selectedPath && files.length > 0) {
      const appFile = files.find(f => f.path === 'App.tsx')
      setSelectedPath(appFile?.path || files[0].path)
    }
  }, [files, selectedPath])

  // Find selected file
  const selectedFile = useMemo(
    () => files.find(f => f.path === selectedPath),
    [files, selectedPath]
  )

  // Copy to clipboard
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopyFeedback('Copied!')
      setTimeout(() => setCopyFeedback(null), 1500)
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }, [])

  if (files.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        fontSize: '12px',
        backgroundColor: '#000000',
      }}>
        No code to display
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      height: '100%',
      backgroundColor: '#000000',
      position: 'relative',
    }}>
      {/* File Tree */}
      <FileTree
        files={files}
        selectedPath={selectedPath}
        onSelect={setSelectedPath}
        onCopy={handleCopy}
      />

      {/* Code Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* File Path Header */}
        <div style={{
          padding: '8px 12px',
          fontSize: '11px',
          color: colors.textMuted,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{selectedPath || 'Select a file'}</span>
          {selectedFile && (
            <button
              onClick={() => handleCopy(selectedFile.content)}
              title="Copy file content"
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: '#1a1a1a',
                color: colors.textMuted,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {copyFeedback || 'Copy'}
            </button>
          )}
        </div>

        {/* Code Content */}
        {selectedFile ? (
          <CodeViewer code={selectedFile.content} filePath={selectedFile.path} />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: '12px',
          }}>
            Select a file to view its content
          </div>
        )}
      </div>
    </div>
  )
}
