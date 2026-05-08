import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function H1({ text, children }: { text?: string; children?: ReactNode }) {
  if (text !== undefined) {
    return (
      <h1
        className="text-[96px] font-bold tracking-[-0.025em] leading-[0.95] em-light"
        dangerouslySetInnerHTML={{ __html: inlineMd(text) }}
      />
    )
  }
  return (
    <h1 className="text-[96px] font-bold tracking-[-0.025em] leading-[0.95] em-light">
      {children}
    </h1>
  )
}
