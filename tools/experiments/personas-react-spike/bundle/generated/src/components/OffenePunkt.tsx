import type { ReactNode } from 'react'
export default function OffenePunkt({ children }: { children?: ReactNode }) {
  return <div className="flex flex-row gap-6">{children}</div>
}
