import type { ReactNode } from 'react'

export default function MetaList({ children }: { children?: ReactNode }) {
  // `hor, wrap, gap 10 32, mar-t 14`
  return (
    <dl className="flex flex-row flex-wrap gap-y-[10px] gap-x-8 mt-[14px] text-[13px] font-normal">
      {children}
    </dl>
  )
}
