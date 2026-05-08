import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function BodyTxt({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[17px] font-light leading-[1.65] block'
  if (text !== undefined) {
    return <p className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <p className={cls}>{children}</p>
}
