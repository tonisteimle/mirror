import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function H3({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[28px] font-bold tracking-[-0.015em] leading-[1.2] em-light'
  if (text !== undefined) {
    return <h3 className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <h3 className={cls}>{children}</h3>
}
