import { useState, useCallback, useRef, useEffect } from 'react'
import { generateDSLViaJSON, hasApiKey } from '../lib/ai'

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

  // Use refs for callbacks to avoid recreating functions on every render
  const onGeneratedRef = useRef(options.onGenerated)
  const onErrorRef = useRef(options.onError)

  useEffect(() => {
    onGeneratedRef.current = options.onGenerated
    onErrorRef.current = options.onError
  })

  const openAssistant = useCallback((pos: { x: number; y: number }) => {
    // Check if API key is configured
    if (!hasApiKey()) {
      onErrorRef.current?.({
        title: 'API Key fehlt',
        message: 'Bitte trage zuerst einen OpenRouter API Key in den Einstellungen ein.',
        details: 'Klicke auf das Zahnrad-Icon oben rechts und gib deinen Key ein. Du bekommst einen Key auf openrouter.ai/keys',
      })
      return
    }
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
        onGeneratedRef.current?.(generated.layout)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten'
      onErrorRef.current?.({
        title: 'AI Generation fehlgeschlagen',
        message: 'Die Generierung konnte nicht abgeschlossen werden.',
        details: errorMessage,
      })
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating])

  return {
    isGenerating,
    isOpen,
    position,
    openAssistant,
    closeAssistant,
    generate,
  }
}
