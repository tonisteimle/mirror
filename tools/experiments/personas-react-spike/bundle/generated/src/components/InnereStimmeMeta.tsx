import type { ReactNode } from 'react'

export default function InnereStimmeMeta({ children }: { children?: ReactNode }) {
  return <div className="w-full lg:w-[280px] flex flex-col gap-3">{children}</div>
}
