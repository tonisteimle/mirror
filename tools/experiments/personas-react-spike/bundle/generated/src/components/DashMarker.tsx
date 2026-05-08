export default function DashMarker({ text = '—' }: { text?: string }) {
  return <span className="w-3 inline-block font-normal">{text}</span>
}
