import type { ReactNode } from 'react'
export default function DashGroupBody({ children }: { children?: ReactNode }) {
  return <div className="grow flex flex-col gap-2">{children}</div>
}
