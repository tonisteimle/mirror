import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function BodyTxtMuted({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[17px] font-light leading-[1.6] italic text-muted block'
  if (text !== undefined) {
    return <p className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <p className={cls}>{children}</p>
}
