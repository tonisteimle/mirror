import type { ReactNode } from 'react'

export default function PersonaBody({ children }: { children?: ReactNode }) {
  return <div className="flex flex-col gap-16">{children}</div>
}
