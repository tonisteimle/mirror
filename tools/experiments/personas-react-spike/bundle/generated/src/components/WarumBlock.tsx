import type { ReactNode } from 'react'

export default function WarumBlock({ children }: { children?: ReactNode }) {
  // maxw 920, gap 16, prose
  return <div className="max-w-[920px] flex flex-col gap-4">{children}</div>
}
