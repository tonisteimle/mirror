import { useState, useCallback } from 'react'
import { generateDSLViaJSON } from '../lib/ai'

export interface UseAiAssistantReturn {
  isGenerating: boolean
  isOpen: boolean
  position: { x: number; y: number }
  openAssistant: (position: { x: number; y: number }) => void
  closeAssistant: () => void
  generate: (prompt: string) => Promise<void>
}

interface UseAiAssistantOptions {
  onGenerated?: (layout: string) => void
  onError?: (error: { title: string; message: string; details?: string }) => void
}

export function useAiAssistant(options: UseAiAssistantOptions = {}): UseAiAssistantReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const openAssistant = useCallback((pos: { x: number; y: number }) => {
    setPosition(pos)
    setIsOpen(true)
  }, [])

  const closeAssistant = useCallback(() => {
    setIsOpen(false)
  }, [])

  const generate = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setIsOpen(false)
    try {
      // Generate via JSON AST (LLM generates JSON, we convert to Mirror)
      const generated = await generateDSLViaJSON(prompt)

      if (generated.layout) {
        options.onGenerated?.(generated.layout)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten'
      options.onError?.({
        title: 'AI Generation fehlgeschlagen',
        message: 'Die Generierung konnte nicht abgeschlossen werden.',
        details: errorMessage,
      })
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, options])

  return {
    isGenerating,
    isOpen,
    position,
    openAssistant,
    closeAssistant,
    generate,
  }
}
