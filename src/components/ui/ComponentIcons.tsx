/**
 * Component Icons for UI Library Picker
 *
 * Miniature visual representations of UI components.
 * Each icon is 48x48px with hover and selected states.
 */

import React from 'react'

interface ComponentIconProps {
  selected?: boolean
  onClick?: () => void
}

const iconBase: React.CSSProperties = {
  width: 48,
  height: 48,
  background: '#18181B',
  borderRadius: 5,
  padding: 6,
  boxSizing: 'border-box',
  display: 'flex',
  cursor: 'pointer',
  transition: 'background 0.15s',
}

const iconHover = '#27272A'
const iconSelected = '#3B82F6'

function useIconStyle(selected?: boolean): [React.CSSProperties, (hover: boolean) => void, boolean] {
  const [hover, setHover] = React.useState(false)
  const style: React.CSSProperties = {
    ...iconBase,
    background: selected ? iconSelected : hover ? iconHover : '#18181B',
  }
  return [style, setHover, hover]
}

// Dropdown Icon
export function DropdownIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', gap: 3 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 9, background: '#3F3F46', borderRadius: 2 }} />
      <div style={{ flex: 1, background: '#27272A', borderRadius: 2, display: 'flex', flexDirection: 'column', padding: 3, gap: 2 }}>
        <div style={{ height: 5, background: selected ? 'white' : '#3B82F6', borderRadius: 1 }} />
        <div style={{ height: 5, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 5, background: '#3F3F46', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Navigation Icon
export function NavigationIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, gap: 4 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 14, background: '#27272A', borderRadius: 2, display: 'flex', flexDirection: 'column', padding: 3, gap: 3 }}>
        <div style={{ height: 4, background: selected ? 'white' : '#3B82F6', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, background: '#3F3F46', borderRadius: 2 }} />
    </div>
  )
}

// Input Icon
export function InputIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ flex: 1, height: 12, background: '#27272A', borderRadius: 2, border: '1px solid #3F3F46', boxSizing: 'border-box' }} />
    </div>
  )
}

// Text Icon
export function TextIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', justifyContent: 'center', gap: 4, padding: 8 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 4, width: '100%', background: '#71717A', borderRadius: 1 }} />
      <div style={{ height: 4, width: '85%', background: '#52525B', borderRadius: 1 }} />
      <div style={{ height: 4, width: '70%', background: '#52525B', borderRadius: 1 }} />
    </div>
  )
}

// Icon Icon
export function IconIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 20, height: 20, background: selected ? 'white' : '#3B82F6', borderRadius: 4 }} />
    </div>
  )
}

// Box Icon
export function BoxIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: '100%', background: '#27272A', borderRadius: 3, border: '1px dashed #3F3F46', boxSizing: 'border-box' }} />
    </div>
  )
}

// Button Icon
export function ButtonIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: 14, background: selected ? 'white' : '#3B82F6', borderRadius: 3 }} />
    </div>
  )
}

// Toggle Icon
export function ToggleIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 28, height: 14, background: selected ? 'white' : '#3B82F6', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: 2, boxSizing: 'border-box' }}>
        <div style={{ width: 10, height: 10, background: selected ? '#3B82F6' : 'white', borderRadius: '50%' }} />
      </div>
    </div>
  )
}

// Checkbox Icon
export function CheckboxIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center', gap: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 10, height: 10, background: selected ? 'white' : '#3B82F6', borderRadius: 2 }} />
      <div style={{ flex: 1, height: 5, background: '#3F3F46', borderRadius: 2 }} />
    </div>
  )
}

// Radio Icon
export function RadioIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center', gap: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 14, height: 14, background: selected ? 'white' : '#3B82F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, background: selected ? '#3B82F6' : 'white', borderRadius: '50%' }} />
      </div>
      <div style={{ flex: 1, height: 6, background: '#3F3F46', borderRadius: 2 }} />
    </div>
  )
}

// Table Icon
export function TableIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: '2px 2px 0 0' }} />
      <div style={{ flex: 1, background: '#27272A', borderRadius: '0 0 2px 2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', padding: 3 }}>
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Link Icon
export function LinkIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ width: 20, height: 4, background: selected ? 'white' : '#3B82F6', borderRadius: 1 }} />
        <div style={{ width: 20, height: 2, background: selected ? 'white' : '#3B82F6', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Textarea Icon
export function TextareaIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'stretch' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ flex: 1, background: '#27272A', borderRadius: 2, border: '1px solid #3F3F46', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: 4, gap: 3 }}>
        <div style={{ height: 3, width: '80%', background: '#71717A', borderRadius: 1 }} />
        <div style={{ height: 3, width: '100%', background: '#52525B', borderRadius: 1 }} />
        <div style={{ height: 3, width: '60%', background: '#52525B', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Image Icon
export function ImageIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: '100%', background: '#27272A', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        {/* Ground */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: '#3F3F46' }} />
        {/* Mountain left */}
        <div style={{ position: 'absolute', bottom: 8, left: 6, width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '12px solid #52525B' }} />
        {/* Mountain right */}
        <div style={{ position: 'absolute', bottom: 8, right: 4, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '10px solid #3F3F46' }} />
        {/* Sun */}
        <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: '50%' }} />
      </div>
    </div>
  )
}

// Accordion Icon
export function AccordionIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', gap: 2 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 10, background: selected ? 'white' : '#3B82F6', borderRadius: 2 }} />
      <div style={{ flex: 1, background: '#27272A', borderRadius: 2, display: 'flex', flexDirection: 'column', padding: 3, gap: 2 }}>
        <div style={{ height: 3, width: '80%', background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 3, width: '60%', background: '#3F3F46', borderRadius: 1 }} />
      </div>
      <div style={{ height: 8, background: '#3F3F46', borderRadius: 2 }} />
    </div>
  )
}

// Dialog Icon
export function DialogIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 32, height: 24, background: '#27272A', borderRadius: 3, border: `1px solid ${selected ? 'white' : '#3B82F6'}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: 4, gap: 3 }}>
        <div style={{ height: 3, width: '70%', background: '#71717A', borderRadius: 1 }} />
        <div style={{ height: 3, width: '100%', background: '#3F3F46', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Tabs Icon
export function TabsIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', gap: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', gap: 2, height: 7 }}>
        <div style={{ flex: 1, background: selected ? 'white' : '#3B82F6', borderRadius: '2px 2px 0 0' }} />
        <div style={{ flex: 1, background: '#3F3F46', borderRadius: '2px 2px 0 0' }} />
        <div style={{ flex: 1, background: '#3F3F46', borderRadius: '2px 2px 0 0' }} />
      </div>
      <div style={{ flex: 1, background: '#27272A', borderRadius: '0 0 2px 2px' }} />
    </div>
  )
}

// Slider Icon
export function SliderIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: 4, background: '#3F3F46', borderRadius: 2, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '60%', height: '100%', background: selected ? 'white' : '#3B82F6', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '55%', top: -4, width: 12, height: 12, background: selected ? 'white' : '#3B82F6', borderRadius: '50%' }} />
      </div>
    </div>
  )
}

// Progress Icon
export function ProgressIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: 6, background: '#3F3F46', borderRadius: 3 }}>
        <div style={{ width: '70%', height: '100%', background: selected ? 'white' : '#3B82F6', borderRadius: 3 }} />
      </div>
    </div>
  )
}

// Avatar Icon
export function AvatarIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 24, height: 24, background: '#3F3F46', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: '50%', marginTop: -2 }} />
        <div style={{ position: 'absolute', bottom: 12, width: 14, height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: '50% 50% 0 0' }} />
      </div>
    </div>
  )
}

// Toast Icon
export function ToastIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'flex-end', justifyContent: 'flex-end' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 28, height: 14, background: '#27272A', borderRadius: 2, border: `1px solid ${selected ? 'white' : '#3B82F6'}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: 3, gap: 3 }}>
        <div style={{ width: 4, height: 4, background: selected ? 'white' : '#3B82F6', borderRadius: '50%' }} />
        <div style={{ flex: 1, height: 3, background: '#3F3F46', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Tooltip Icon
export function TooltipIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {/* Tooltip bubble */}
      <div style={{ width: 24, height: 12, background: '#27272A', borderRadius: 2, border: `1px solid ${selected ? 'white' : '#52525B'}`, boxSizing: 'border-box' }} />
      {/* Arrow pointing down (attached to bubble) */}
      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `4px solid ${selected ? 'white' : '#52525B'}`, marginTop: -1 }} />
      {/* Target element below */}
      <div style={{ width: 12, height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: 2, marginTop: 4 }} />
    </div>
  )
}

// Popover Icon
export function PopoverIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {/* Target button */}
      <div style={{ width: 16, height: 8, background: selected ? 'white' : '#3B82F6', borderRadius: 2 }} />
      {/* Arrow pointing up (attached to popover) */}
      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid #27272A', marginTop: 2 }} />
      {/* Popover content */}
      <div style={{ width: 28, height: 16, background: '#27272A', borderRadius: 2, border: '1px solid #3F3F46', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: 3, gap: 2, marginTop: -1 }}>
        <div style={{ height: 3, width: '80%', background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 3, width: '60%', background: '#3F3F46', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Separator Icon
export function SeparatorIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
      <div style={{ height: 1, background: selected ? 'white' : '#3B82F6' }} />
      <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
    </div>
  )
}

// Card Icon
export function CardIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'stretch' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ flex: 1, background: '#27272A', borderRadius: 3, border: `1px solid ${selected ? 'white' : '#3F3F46'}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: 4 }}>
        <div style={{ height: 10, background: '#3F3F46', borderRadius: 2, marginBottom: 4 }} />
        <div style={{ height: 3, width: '80%', background: '#52525B', borderRadius: 1, marginBottom: 2 }} />
        <div style={{ height: 3, width: '60%', background: '#52525B', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Badge Icon
export function BadgeIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ padding: '4px 8px', background: selected ? 'white' : '#3B82F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 16, height: 4, background: selected ? '#3B82F6' : 'white', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Menu Icon
export function MenuIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: 32, height: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ height: 7, background: selected ? 'white' : '#3B82F6', borderRadius: 2, display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
          <div style={{ width: 10, height: 3, background: selected ? '#3B82F6' : 'white', borderRadius: 1 }} />
        </div>
        <div style={{ flex: 1, background: '#27272A', borderRadius: 2, display: 'flex', flexDirection: 'column', padding: 2, gap: 2 }}>
          <div style={{ height: 3, background: '#3F3F46', borderRadius: 1 }} />
          <div style={{ height: 3, background: '#3F3F46', borderRadius: 1 }} />
        </div>
      </div>
    </div>
  )
}

// Scroll Icon
export function ScrollIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'stretch' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ flex: 1, background: '#27272A', borderRadius: 2, display: 'flex', flexDirection: 'column', padding: 4, gap: 3 }}>
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ height: 4, background: '#3F3F46', borderRadius: 1 }} />
      </div>
      <div style={{ width: 6, background: '#27272A', borderRadius: 2, marginLeft: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 3 }}>
        <div style={{ width: 4, height: 14, background: selected ? 'white' : '#3B82F6', borderRadius: 2 }} />
      </div>
    </div>
  )
}

// Toggle Group Icon (Outlined variant)
export function ToggleGroupIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', width: '100%', height: 12, border: '1px solid #3F3F46', borderRadius: 2, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, background: selected ? 'white' : '#3B82F6', borderRadius: '1px 0 0 1px' }} />
        <div style={{ flex: 1, borderLeft: '1px solid #3F3F46' }} />
        <div style={{ flex: 1, borderLeft: '1px solid #3F3F46' }} />
      </div>
    </div>
  )
}

// Toggle Button Icon (Pressed variant)
export function ToggleButtonIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ width: '100%', height: 12, background: selected ? 'white' : '#3B82F6', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 16, height: 4, background: selected ? '#3B82F6' : 'white', borderRadius: 1 }} />
      </div>
    </div>
  )
}

// Menu Bar Icon
export function MenuBarIcon({ selected, onClick }: ComponentIconProps) {
  const [style, setHover] = useIconStyle(selected)
  return (
    <div
      style={{ ...style, flexDirection: 'column', gap: 3 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div style={{ height: 10, background: '#27272A', borderRadius: 2, display: 'flex', alignItems: 'center', padding: '0 4px', gap: 4 }}>
        <div style={{ width: 8, height: 4, background: selected ? 'white' : '#3B82F6', borderRadius: 1 }} />
        <div style={{ width: 8, height: 4, background: '#3F3F46', borderRadius: 1 }} />
        <div style={{ width: 8, height: 4, background: '#3F3F46', borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, background: '#3F3F46', borderRadius: 2 }} />
    </div>
  )
}

// Label wrapper
interface LabeledIconProps extends ComponentIconProps {
  label: string
  children: React.ReactNode
}

export function LabeledIcon({ label, children }: LabeledIconProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {children}
      <span style={{ fontSize: 10, color: '#71717A' }}>{label}</span>
    </div>
  )
}

// All icons as a map for easy iteration (alphabetically sorted)
export const componentIcons = {
  accordion: { Icon: AccordionIcon, label: 'Accordion' },
  avatar: { Icon: AvatarIcon, label: 'Avatar' },
  badge: { Icon: BadgeIcon, label: 'Badge' },
  box: { Icon: BoxIcon, label: 'Box' },
  button: { Icon: ButtonIcon, label: 'Button' },
  card: { Icon: CardIcon, label: 'Card' },
  checkbox: { Icon: CheckboxIcon, label: 'Checkbox' },
  dialog: { Icon: DialogIcon, label: 'Dialog' },
  dropdown: { Icon: DropdownIcon, label: 'Dropdown' },
  icon: { Icon: IconIcon, label: 'Icon' },
  image: { Icon: ImageIcon, label: 'Image' },
  input: { Icon: InputIcon, label: 'Input' },
  link: { Icon: LinkIcon, label: 'Link' },
  menu: { Icon: MenuIcon, label: 'Menu' },
  menuBar: { Icon: MenuBarIcon, label: 'Menu Bar' },
  navigation: { Icon: NavigationIcon, label: 'Navigation' },
  popover: { Icon: PopoverIcon, label: 'Popover' },
  progress: { Icon: ProgressIcon, label: 'Progress' },
  radio: { Icon: RadioIcon, label: 'Radio' },
  scroll: { Icon: ScrollIcon, label: 'Scroll' },
  separator: { Icon: SeparatorIcon, label: 'Separator' },
  slider: { Icon: SliderIcon, label: 'Slider' },
  table: { Icon: TableIcon, label: 'Table' },
  tabs: { Icon: TabsIcon, label: 'Tabs' },
  text: { Icon: TextIcon, label: 'Text' },
  textarea: { Icon: TextareaIcon, label: 'Textarea' },
  toast: { Icon: ToastIcon, label: 'Toast' },
  toggle: { Icon: ToggleIcon, label: 'Toggle' },
  toggleButton: { Icon: ToggleButtonIcon, label: 'Toggle Button' },
  toggleGroup: { Icon: ToggleGroupIcon, label: 'Toggle Group' },
  tooltip: { Icon: TooltipIcon, label: 'Tooltip' },
} as const

export type ComponentIconType = keyof typeof componentIcons
