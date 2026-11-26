import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

// A "⋯" button that opens a small menu of options for one item.
// options: [{ label, icon, onSelect, danger }]
// Closes on Escape, on clicking outside, and after choosing an option.
function ItemMenu({ label, options }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handleClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`rounded-md p-1.5 text-subtle transition hover:bg-cream hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-navy ${
          open ? 'bg-cream text-ink' : ''
        }`}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-sand bg-white py-1 text-sm shadow-[0_8px_30px_rgba(30,42,68,0.15)]"
        >
          {options.map(({ label: optionLabel, icon: Icon, onSelect, danger }, index) => (
            <button
              key={optionLabel}
              type="button"
              role="menuitem"
              autoFocus={index === 0}
              onClick={() => {
                setOpen(false)
                onSelect()
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition focus:outline-none ${
                danger
                  ? 'text-urgent hover:bg-urgent-bg focus:bg-urgent-bg'
                  : 'text-ink hover:bg-cream focus:bg-cream'
              } ${danger && index > 0 ? 'border-t border-sand' : ''}`}
            >
              <Icon size={16} className={danger ? '' : 'text-muted'} aria-hidden="true" />
              {optionLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ItemMenu
