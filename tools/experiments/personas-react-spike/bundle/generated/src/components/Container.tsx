import type { ReactNode } from 'react'

export default function Container({ children }: { children?: ReactNode }) {
  return <div className="w-full max-w-content mx-auto">{children}</div>
}
