import type { ReactNode } from 'react'

// `grow, maxw 768, gap 18, prose`. We use Tailwind typography's `prose`
// for sensible reading-flow defaults, then layer on Mirror specifics.
export default function ProseBody({ children }: { children?: ReactNode }) {
  return (
    <div className="grow max-w-[768px] flex flex-col gap-[18px] prose prose-stone prose-sm prose-headings:font-bold prose-strong:font-bold">
      {children}
    </div>
  )
}
