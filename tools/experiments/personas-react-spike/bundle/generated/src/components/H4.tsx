import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function H4({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[19px] font-bold mb-[18px]'
  if (text !== undefined) {
    return <h4 className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <h4 className={cls}>{children}</h4>
}
