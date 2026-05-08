import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function Eyebrow({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[13px] font-normal block'
  if (text !== undefined) {
    return <span className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <span className={cls}>{children}</span>
}
