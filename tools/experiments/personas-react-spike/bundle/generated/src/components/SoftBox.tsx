import type { ReactNode } from 'react'

export default function SoftBox({ children }: { children?: ReactNode }) {
  return <div className="bg-soft py-[22px] px-6 w-full mt-16">{children}</div>
}
