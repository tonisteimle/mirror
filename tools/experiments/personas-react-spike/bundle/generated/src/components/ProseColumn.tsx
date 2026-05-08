import type { ReactNode } from 'react'

// In Mirror: w 280. With TwoColumn already encoding the 280px column,
// this is just a passthrough on desktop. We render it as a plain div.
export default function ProseColumn({ children }: { children?: ReactNode }) {
  return <div>{children}</div>
}
