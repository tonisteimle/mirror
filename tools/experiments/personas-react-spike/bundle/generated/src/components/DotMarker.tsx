export default function DotMarker({ text = '·' }: { text?: string }) {
  return <span className="w-3 inline-block text-[22px] leading-none">{text}</span>
}
