import type { ReactNode } from 'react'
import { inlineMd } from '../lib/inline-md'

export default function H2({
  text,
  children,
  className,
}: {
  text?: string
  children?: ReactNode
  className?: string
}) {
  const cls =
    `text-[44px] font-bold tracking-[-0.02em] leading-[1.05] em-light ${className ?? ''}`.trim()
  if (text !== undefined) {
    return <h2 className={cls} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
  }
  return <h2 className={cls}>{children}</h2>
}
