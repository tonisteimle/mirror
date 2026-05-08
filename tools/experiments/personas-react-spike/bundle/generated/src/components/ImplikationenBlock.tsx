import type { ReactNode } from 'react'

export default function ImplikationenBlock({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-8 mt-10">{children}</div>
}
