import type { ReactNode } from 'react'

export default function InnereStimmeQuotes({ children }: { children?: ReactNode }) {
  return <div className="grow flex flex-col gap-[14px]">{children}</div>
}
