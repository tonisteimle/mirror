import type { ReactNode } from 'react'

export default function OffeneList({ children }: { children?: ReactNode }) {
  return <ol className="offene-list grow max-w-[768px]">{children}</ol>
}
