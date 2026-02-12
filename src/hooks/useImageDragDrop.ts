/**
 * useImageDragDrop Hook
 *
 * Handles drag & drop for image files in the editor.
 * Generates Image component code and inserts at cursor.
 */
import { useEffect } from 'react'
import type { EditorView } from '@codemirror/view'
import { getImageDimensions, saveImageFile } from '../utils/image-upload'

interface UseImageDragDropOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  editorRef: React.RefObject<EditorView | null>
}

export function useImageDragDrop({ containerRef, editorRef }: UseImageDragDropOptions) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy'
        container.style.outline = '2px dashed #3B82F6'
        container.style.outlineOffset = '-2px'
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      container.style.outline = ''
      container.style.outlineOffset = ''
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      container.style.outline = ''
      container.style.outlineOffset = ''

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const view = editorRef.current
      if (!view) return

      const imageFiles = Array.from(files).filter(file =>
        file.type.startsWith('image/')
      )

      if (imageFiles.length === 0) return

      // Get current cursor position and indentation
      const cursorPos = view.state.selection.main.head
      const line = view.state.doc.lineAt(cursorPos)
      const lineText = line.text
      const indentMatch = lineText.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''

      // Generate Image code for each file
      const imageCodeLines: string[] = []

      for (const file of imageFiles) {
        // Get image dimensions
        const dimensions = await getImageDimensions(file)

        // Save file to storage
        const filename = await saveImageFile(file)

        // Generate the Image line
        const widthHeight = dimensions ? ` ${dimensions.width} ${dimensions.height}` : ''
        imageCodeLines.push(`${indent}Image "${filename}"${widthHeight}`)
      }

      // Insert at cursor position
      const insertText = imageCodeLines.join('\n')

      // If cursor is at end of line, add newline before
      const needsNewlineBefore = cursorPos === line.to && lineText.trim() !== ''
      const needsNewlineAfter = cursorPos < view.state.doc.length

      const finalText = (needsNewlineBefore ? '\n' : '') + insertText + (needsNewlineAfter ? '\n' : '')

      view.dispatch({
        changes: { from: cursorPos, to: cursorPos, insert: finalText }
      })
      view.focus()
    }

    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    return () => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, editorRef])
}
