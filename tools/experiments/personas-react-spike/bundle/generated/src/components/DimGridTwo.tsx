import type { ReactNode } from 'react'

export default function DimGridTwo({ children }: { children?: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-16">{children}</div>
}
