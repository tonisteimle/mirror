import type { ReactNode } from 'react'

export default function MetaPair({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-[2px]">{children}</div>
}
