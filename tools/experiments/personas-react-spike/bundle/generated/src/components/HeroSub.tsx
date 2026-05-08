import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function HeroSub({ text, children }: { text?: string; children?: ReactNode }) {
  const cls = 'text-[22px] font-light leading-[1.45] max-w-[60ch] block mb-7'
  if (text !== undefined) {
    return <span className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <span className={cls}>{children}</span>
}
