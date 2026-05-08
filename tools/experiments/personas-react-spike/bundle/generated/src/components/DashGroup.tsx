import type { ReactNode } from 'react'
export default function DashGroup({ children }: { children?: ReactNode }) {
  return <div className="flex flex-row gap-6">{children}</div>
}
