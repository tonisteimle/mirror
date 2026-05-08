import type { ReactNode } from 'react'

export default function TocList({ children }: { children?: ReactNode }) {
  return <ol className="flex flex-col gap-0 list-none">{children}</ol>
}
