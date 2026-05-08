import type { ReactNode } from 'react'

export default function Dim({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col">{children}</div>
}
