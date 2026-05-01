/**
 * Shared helpers for UI Builder tests — analyze preview DOM and generated code.
 */

export interface PreviewAnalysis {
  elementCount: number
  elements: Array<{
    nodeId: string
    tagName: string
    text: string
    styles: {
      backgroundColor: string
      color: string
      width: string
      height: string
      padding: string
      borderRadius: string
    }
  }>
}

export function analyzePreview(): PreviewAnalysis {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { elementCount: 0, elements: [] }
  }

  const mirrorElements = preview.querySelectorAll('[data-mirror-id]')
  const elements: PreviewAnalysis['elements'] = []

  mirrorElements.forEach(el => {
    const htmlEl = el as HTMLElement
    const computed = getComputedStyle(htmlEl)

    elements.push({
      nodeId: htmlEl.getAttribute('data-mirror-id') || '',
      tagName: htmlEl.tagName.toLowerCase(),
      text: htmlEl.textContent?.trim() || '',
      styles: {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        borderRadius: computed.borderRadius,
      },
    })
  })

  return {
    elementCount: mirrorElements.length,
    elements,
  }
}

export function findElementInPreview(nodeId: string): PreviewAnalysis['elements'][0] | null {
  const analysis = analyzePreview()
  return analysis.elements.find(e => e.nodeId === nodeId) || null
}

export interface CodeAnalysis {
  lines: string[]
  hasElement: (type: string) => boolean
  hasProperty: (prop: string, value?: string) => boolean
  countElements: (type: string) => number
  getLine: (index: number) => string
}

export function analyzeCode(code: string): CodeAnalysis {
  const lines = code.split('\n').filter(l => l.trim())

  return {
    lines,
    hasElement: (type: string) => code.includes(type),
    hasProperty: (prop: string, value?: string) => {
      if (value) {
        return code.includes(`${prop} ${value}`) || code.includes(`${prop}: ${value}`)
      }
      return code.includes(prop)
    },
    countElements: (type: string) => (code.match(new RegExp(type, 'g')) || []).length,
    getLine: (index: number) => lines[index] || '',
  }
}
